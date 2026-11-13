/**
 * OpenChat — media engine
 * Voice recorder (hold / lock / pause) · voice player (waveform, scrub, speed)
 * Image compression · media preview sheet · lightbox gallery (swipe, pinch, dismiss)
 */
(function () {
    'use strict';

    const OC = window.OC;
    const { U, $, icon, store, toast } = OC;

    // ==================================================================
    // Image / video helpers
    // ==================================================================
    const Media = (OC.Media = {
        async imageDims(file) {
            try {
                if (window.createImageBitmap) {
                    const bmp = await createImageBitmap(file);
                    const dims = { w: bmp.width, h: bmp.height };
                    bmp.close && bmp.close();
                    return dims;
                }
            } catch (e) { /* fallback */ }
            return new Promise((resolve) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
                img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
                img.src = url;
            });
        },

        videoMeta(file) {
            return new Promise((resolve) => {
                const v = document.createElement('video');
                const url = URL.createObjectURL(file);
                let done = false;
                const finish = (res) => {
                    if (done) return;
                    done = true;
                    URL.revokeObjectURL(url);
                    resolve(res);
                };
                v.preload = 'metadata';
                v.muted = true;
                v.onloadedmetadata = () => finish({ w: v.videoWidth, h: v.videoHeight, duration: isFinite(v.duration) ? v.duration : 0 });
                v.onerror = () => finish({ w: 0, h: 0, duration: 0 });
                setTimeout(() => finish({ w: 0, h: 0, duration: 0 }), 4000);
                v.src = url;
            });
        },

        /**
         * Resize big photos client-side (max 2048px) unless HD is requested.
         * Keeps GIF/SVG/HEIC untouched. Returns { file, w, h }.
         */
        async prepareImage(file, hd = false) {
            const type = (file.type || '').toLowerCase();
            const compressible = /^image\/(jpeg|jpg|png|webp)$/.test(type);
            if (!compressible || !window.createImageBitmap) {
                const d = await Media.imageDims(file);
                return { file, ...d };
            }
            let bmp;
            try {
                bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
            } catch (e) {
                try { bmp = await createImageBitmap(file); } catch (e2) {
                    const d = await Media.imageDims(file);
                    return { file, ...d };
                }
            }
            const w = bmp.width;
            const h = bmp.height;
            const maxSide = hd ? 4096 : 2048;
            const scale = Math.min(1, maxSide / Math.max(w, h));
            if ((hd && scale === 1) || (scale === 1 && file.size < 1.2 * 1024 * 1024)) {
                bmp.close && bmp.close();
                return { file, w, h };
            }
            const tw = Math.round(w * scale);
            const th = Math.round(h * scale);
            const canvas = document.createElement('canvas');
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bmp, 0, 0, tw, th);
            bmp.close && bmp.close();
            const outType = type === 'image/png' ? 'image/webp' : 'image/jpeg';
            const blob = await new Promise((res) => canvas.toBlob(res, outType, hd ? 0.92 : 0.84));
            if (!blob || blob.size >= file.size) return { file, w, h };
            const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
            const ext = outType === 'image/webp' ? 'webp' : 'jpg';
            return { file: new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() }), w: tw, h: th };
        },

        /** Clamp aspect ratio so very tall/wide pictures stay pleasant in a bubble. */
        aspect(w, h) {
            if (!w || !h) return null;
            const r = U.clamp(w / h, 0.62, 2.2);
            return r.toFixed(4);
        }
    });

    // ==================================================================
    // Voice recorder
    // ==================================================================
    class VoiceRecorder {
        constructor() {
            this.state = 'idle';
            this.levels = [];
            this.canvas = null;
            this.onTick = null;
        }

        static supported() {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
        }

        async start() {
            if (this.state !== 'idle') return true;
            this.state = 'starting';
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
            } catch (err) {
                this.state = 'idle';
                throw err;
            }
            if (this.state !== 'starting') {
                // cancelled while the permission prompt was open
                this.stream.getTracks().forEach((t) => t.stop());
                return false;
            }

            const candidates = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
            this.mime = candidates.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
            try {
                this.rec = this.mime
                    ? new MediaRecorder(this.stream, { mimeType: this.mime, audioBitsPerSecond: 64000 })
                    : new MediaRecorder(this.stream);
            } catch (e) {
                this.rec = new MediaRecorder(this.stream);
            }
            this.chunks = [];
            this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
            this.rec.start(250);

            this.startedAt = performance.now();
            this.pausedTotal = 0;
            this.pausedAt = 0;
            this.levels = [];
            this.lastSample = 0;
            this.state = 'recording';

            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                this.ac = new AC();
                const src = this.ac.createMediaStreamSource(this.stream);
                this.analyser = this.ac.createAnalyser();
                this.analyser.fftSize = 1024;
                src.connect(this.analyser);
                this.buf = new Uint8Array(this.analyser.fftSize);
            } catch (e) {
                this.analyser = null;
            }

            this.brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#10b981';
            this.loop();
            return true;
        }

        loop() {
            this.raf = requestAnimationFrame(() => this.loop());
            const now = performance.now();
            if (this.state === 'recording' && now - this.lastSample > 50) {
                this.lastSample = now;
                let level = 0.05 + Math.random() * 0.05;
                if (this.analyser) {
                    this.analyser.getByteTimeDomainData(this.buf);
                    let sum = 0;
                    for (let i = 0; i < this.buf.length; i++) {
                        const v = (this.buf[i] - 128) / 128;
                        sum += v * v;
                    }
                    level = Math.sqrt(sum / this.buf.length);
                }
                this.levels.push(level);
            }
            if (this.onTick) this.onTick(this.elapsed());
            if (this.canvas && this.canvas.offsetParent) this.draw();
        }

        draw() {
            const c = this.canvas;
            const dpr = window.devicePixelRatio || 1;
            const w = c.clientWidth;
            const h = c.clientHeight;
            if (!w || !h) return;
            if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
                c.width = Math.round(w * dpr);
                c.height = Math.round(h * dpr);
            }
            const ctx = c.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            const barW = 3;
            const gap = 2;
            const n = Math.floor(w / (barW + gap));
            const data = this.levels.slice(-n);
            ctx.fillStyle = this.brand;
            for (let i = 0; i < data.length; i++) {
                const v = U.clamp(data[i] * 3.4, 0.08, 1);
                const bh = Math.max(3, v * h);
                const x = w - (data.length - i) * (barW + gap);
                const y = (h - bh) / 2;
                ctx.globalAlpha = this.state === 'paused' ? 0.45 : 0.55 + 0.45 * (i / data.length);
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(x, y, barW, bh, 1.5);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, barW, bh);
                }
            }
            ctx.globalAlpha = 1;
        }

        elapsed() {
            if (!this.startedAt) return 0;
            const now = this.state === 'paused' ? this.pausedAt : performance.now();
            return Math.max(0, (now - this.startedAt - this.pausedTotal) / 1000);
        }

        canPause() {
            return !!(this.rec && typeof this.rec.pause === 'function');
        }

        pause() {
            if (this.state !== 'recording' || !this.canPause()) return;
            try { this.rec.pause(); } catch (e) { return; }
            this.pausedAt = performance.now();
            this.state = 'paused';
        }

        resume() {
            if (this.state !== 'paused') return;
            try { this.rec.resume(); } catch (e) { return; }
            this.pausedTotal += performance.now() - this.pausedAt;
            this.state = 'recording';
        }

        waveform(n = 48) {
            if (!this.levels.length) return [];
            const res = U.resample(this.levels, Math.min(n, this.levels.length));
            const max = Math.max(...res, 0.02);
            return res.map((v) => Math.round(U.clamp((v / max) * 100, 6, 100)));
        }

        stop() {
            return new Promise((resolve) => {
                if (!this.rec || this.state === 'idle') {
                    resolve(null);
                    return;
                }
                const duration = this.elapsed();
                const waveform = this.waveform();
                const finish = () => {
                    const type = (this.rec && this.rec.mimeType) || this.mime || 'audio/webm';
                    const blob = new Blob(this.chunks, { type: type.split(';')[0] });
                    this.cleanup();
                    resolve({ blob, duration, waveform, mime: type });
                };
                if (this.rec.state === 'inactive') {
                    finish();
                } else {
                    this.rec.onstop = finish;
                    try {
                        if (this.rec.state === 'paused') this.rec.resume();
                        this.rec.requestData && this.rec.requestData();
                    } catch (e) { /* ignore */ }
                    this.rec.stop();
                }
            });
        }

        cancel() {
            if (this.rec && this.rec.state !== 'inactive') {
                this.rec.onstop = null;
                try { this.rec.stop(); } catch (e) { /* ignore */ }
            }
            this.cleanup();
        }

        cleanup() {
            cancelAnimationFrame(this.raf);
            if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
            if (this.ac) this.ac.close().catch(() => {});
            this.stream = null;
            this.ac = null;
            this.analyser = null;
            this.rec = null;
            this.chunks = [];
            this.startedAt = 0;
            this.state = 'idle';
            if (this.canvas) {
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
    OC.VoiceRecorder = VoiceRecorder;

    // ==================================================================
    // Voice / audio player (one shared <audio>, waveform UI)
    // ==================================================================
    class VoicePlayer {
        constructor() {
            this.audio = new Audio();
            this.audio.preload = 'auto';
            this.current = null;
            this.rate = parseFloat(store.get('openchat_voice_rate', '1')) || 1;
            this.fixingDuration = false;
            this.pendingSeek = 0;

            const a = this.audio;
            a.addEventListener('playing', () => {
                if (!this.current) return;
                this.current.classList.remove('loading');
                this.current.classList.add('playing', 'started');
            });
            a.addEventListener('waiting', () => this.current && this.current.classList.add('loading'));
            a.addEventListener('pause', () => this.current && this.current.classList.remove('playing'));
            a.addEventListener('loadedmetadata', () => this.onMeta());
            a.addEventListener('durationchange', () => {
                if (this.fixingDuration && isFinite(a.duration)) {
                    this.fixingDuration = false;
                    if (this.current && !this.current.dataset.duration) this.current.dataset.duration = String(a.duration);
                    a.currentTime = this.pendingSeek * a.duration;
                    this.pendingSeek = 0;
                    if (this.current && this.wantPlay && a.paused) this.play();
                }
            });
            a.addEventListener('timeupdate', () => {
                if (!this.fixingDuration) this.update();
            });
            a.addEventListener('ended', () => {
                if (!this.fixingDuration) this.onEnded();
            });
            a.addEventListener('error', () => {
                if (!this.current || !a.src) return;
                this.current.classList.remove('loading', 'playing');
                toast('Impossible de lire cet audio', { type: 'err' });
            });
        }

        duration(el) {
            const d = this.current === el ? this.audio.duration : NaN;
            if (isFinite(d) && d > 0) return d;
            return parseFloat(el.dataset.duration) || 0;
        }

        onMeta() {
            const a = this.audio;
            if (!isFinite(a.duration)) {
                // Chrome's MediaRecorder webm has no duration: force the browser to compute it
                this.fixingDuration = true;
                try { a.currentTime = 1e101; } catch (e) { this.fixingDuration = false; }
                return;
            }
            if (this.current && !this.current.dataset.duration) {
                this.current.dataset.duration = String(a.duration);
            }
            if (this.pendingSeek) {
                a.currentTime = this.pendingSeek * a.duration;
                this.pendingSeek = 0;
            }
        }

        toggle(el) {
            if (this.current === el) {
                if (this.audio.paused) {
                    this.play();
                } else {
                    this.wantPlay = false;
                    this.audio.pause();
                }
                return;
            }
            this.load(el, 0);
            this.play();
        }

        load(el, ratio = 0) {
            this.stop();
            this.current = el;
            this.pendingSeek = ratio;
            this.fixingDuration = false;
            el.classList.add('loading', 'started');
            this.audio.src = el.dataset.src;
            this.audio.playbackRate = this.rate;
            this.setSpeedLabel(el);
        }

        play() {
            this.wantPlay = true;
            const p = this.audio.play();
            if (p && p.catch) {
                p.catch((err) => {
                    if (err && err.name === 'AbortError') return;
                    if (this.current) this.current.classList.remove('loading', 'playing');
                });
            }
        }

        stop() {
            if (!this.current) return;
            const el = this.current;
            this.wantPlay = false;
            this.audio.pause();
            el.classList.remove('playing', 'loading', 'started');
            el.style.setProperty('--p', '0%');
            this.setTime(el, this.duration(el));
            this.current = null;
        }

        update() {
            const el = this.current;
            if (!el) return;
            const d = this.duration(el);
            const t = this.audio.currentTime || 0;
            if (d > 0) el.style.setProperty('--p', `${U.clamp((t / d) * 100, 0, 100)}%`);
            this.setTime(el, t);
        }

        setTime(el, sec) {
            const t = el.querySelector('.voice-time');
            if (t) t.textContent = U.duration(sec);
        }

        onEnded() {
            const el = this.current;
            if (!el) return;
            el.classList.remove('playing', 'started');
            el.style.setProperty('--p', '0%');
            this.setTime(el, this.duration(el));
            this.current = null;
            // Auto-play the next consecutive voice note (like WhatsApp)
            if (el.classList.contains('is-voice')) {
                const all = OC.$$('#messages .voice.is-voice');
                const next = all[all.indexOf(el) + 1];
                if (next && !next.closest('.msg-row.pending')) {
                    setTimeout(() => this.toggle(next), 250);
                }
            }
        }

        cycleRate(el) {
            const rates = [1, 1.5, 2];
            this.rate = rates[(rates.indexOf(this.rate) + 1) % rates.length];
            store.set('openchat_voice_rate', this.rate);
            this.audio.playbackRate = this.rate;
            this.setSpeedLabel(el);
        }

        setSpeedLabel(el) {
            const s = el && el.querySelector('.voice-speed');
            if (s) s.textContent = `${String(this.rate).replace('.', ',')}×`;
        }

        /** Pointer scrubbing on the waveform */
        scrub(el, e) {
            const wave = el.querySelector('.voice-wave');
            if (!wave) return;
            const rect = wave.getBoundingClientRect();
            const ratioAt = (x) => U.clamp((x - rect.left) / rect.width, 0, 1);
            let ratio = ratioAt(e.clientX);
            const d = this.duration(el);
            el.classList.add('seeking');
            el.style.setProperty('--p', `${ratio * 100}%`);
            if (d) this.setTime(el, ratio * d);
            try { wave.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

            const move = (ev) => {
                ratio = ratioAt(ev.clientX);
                el.style.setProperty('--p', `${ratio * 100}%`);
                const dd = this.duration(el);
                if (dd) this.setTime(el, ratio * dd);
            };
            const up = () => {
                wave.removeEventListener('pointermove', move);
                wave.removeEventListener('pointerup', up);
                wave.removeEventListener('pointercancel', up);
                el.classList.remove('seeking');
                if (this.current === el && this.duration(el)) {
                    const dd = this.duration(el);
                    this.audio.currentTime = ratio * dd;
                    if (this.audio.paused) this.play();
                } else {
                    this.load(el, ratio);
                    this.play();
                }
            };
            wave.addEventListener('pointermove', move);
            wave.addEventListener('pointerup', up);
            wave.addEventListener('pointercancel', up);
        }

        /** Fetch duration for audio messages that don't carry it in meta. */
        probe(el) {
            if (el.dataset.duration || el.dataset.probed) return;
            el.dataset.probed = '1';
            const a = new Audio();
            a.preload = 'metadata';
            a.addEventListener('loadedmetadata', () => {
                if (isFinite(a.duration) && a.duration > 0) {
                    el.dataset.duration = String(a.duration);
                    if (this.current !== el) this.setTime(el, a.duration);
                }
                a.src = '';
            }, { once: true });
            a.src = el.dataset.src;
        }
    }
    OC.VoicePlayer = VoicePlayer;

    // ==================================================================
    // Media preview sheet (before sending)
    // ==================================================================
    class MediaSheet {
        constructor(app) {
            this.app = app;
            this.el = $('#mediaSheet');
            this.stage = $('#mediaStage');
            this.thumbs = $('#mediaThumbs');
            this.caption = $('#mediaCaption');
            this.title = $('#mediaSheetTitle');
            this.count = $('#mediaSendCount');
            this.hdBtn = $('#btnHdToggle');
            this.items = [];
            this.index = 0;
            this.hd = store.get('openchat_hd') === '1';
            this.isOpen = false;

            $('#btnMediaClose').addEventListener('click', () => this.app.closeOverlay('media'));
            $('#btnMediaRemove').addEventListener('click', () => this.removeCurrent());
            $('#btnMediaSend').addEventListener('click', () => this.send());
            this.hdBtn.addEventListener('click', () => {
                this.hd = !this.hd;
                store.set('openchat_hd', this.hd ? '1' : '0');
                this.hdBtn.setAttribute('aria-pressed', String(this.hd));
                toast(this.hd ? 'Photos envoyées en qualité originale (HD)' : 'Photos optimisées pour un envoi rapide');
            });
            this.caption.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                    e.preventDefault();
                    this.send();
                }
            });
            this.thumbs.addEventListener('click', (e) => {
                const add = e.target.closest('.media-thumb.add');
                if (add) {
                    $('#inputDoc').click();
                    return;
                }
                const t = e.target.closest('.media-thumb[data-i]');
                if (t) this.select(parseInt(t.dataset.i, 10));
            });
        }

        static itemFromFile(file) {
            const kind = U.kindOf(file);
            return {
                key: U.uid(),
                file,
                kind,
                name: file.name || (kind === 'image' ? 'photo.jpg' : 'fichier'),
                size: file.size,
                previewUrl: kind === 'image' || kind === 'video' || kind === 'audio' ? URL.createObjectURL(file) : null
            };
        }

        static itemFromUploaded(up) {
            const kind = ['image', 'video', 'audio'].includes(up.type) ? up.type : 'file';
            return {
                key: U.uid(),
                uploaded: up,
                kind,
                name: up.file_name || 'fichier',
                size: up.file_size || 0,
                previewUrl: kind === 'file' ? null : up.file_url
            };
        }

        open(items, caption = '') {
            if (!items.length) return;
            if (this.isOpen) {
                this.add(items);
                if (caption && !this.caption.value) this.caption.value = caption;
                return;
            }
            this.items = items;
            this.index = 0;
            this.caption.value = caption;
            this.el.hidden = false;
            this.isOpen = true;
            this.hdBtn.setAttribute('aria-pressed', String(this.hd));
            this.app.pushOverlay('media', () => this.hide(true));
            this.render();
            if (!U.isTouch) setTimeout(() => this.caption.focus(), 60);
        }

        add(items) {
            this.items.push(...items);
            this.index = this.items.length - 1;
            this.render();
        }

        select(i) {
            this.index = U.clamp(i, 0, this.items.length - 1);
            this.render();
        }

        removeCurrent() {
            const [removed] = this.items.splice(this.index, 1);
            if (removed && removed.previewUrl && removed.file) URL.revokeObjectURL(removed.previewUrl);
            if (!this.items.length) {
                this.app.closeOverlay('media');
                return;
            }
            this.index = Math.min(this.index, this.items.length - 1);
            this.render();
        }

        render() {
            const n = this.items.length;
            this.title.textContent = n > 1 ? `${n} éléments` : 'Envoyer';
            this.count.textContent = String(n);
            this.count.hidden = n < 2;
            this.hdBtn.hidden = !this.items.some((it) => it.kind === 'image' && it.file);

            this.thumbs.innerHTML = this.items.map((it, i) => {
                let inner;
                if (it.kind === 'image' && it.previewUrl) inner = `<img src="${U.esc(it.previewUrl)}" alt="">`;
                else if (it.kind === 'video' && it.previewUrl) inner = `<video src="${U.esc(it.previewUrl)}#t=0.1" muted playsinline preload="metadata"></video>`;
                else inner = `<span class="thumb-ext">${U.esc(U.fileVisual(it.name).ext.slice(0, 4))}</span>`;
                return `<button type="button" class="media-thumb ${i === this.index ? 'active' : ''}" data-i="${i}" aria-label="${U.esc(it.name)}">${inner}</button>`;
            }).join('') + `<button type="button" class="media-thumb add" aria-label="Ajouter des fichiers">${icon('plus')}</button>`;

            const it = this.items[this.index];
            if (!it) return;
            if (it.kind === 'image') {
                this.stage.innerHTML = `<img src="${U.esc(it.previewUrl)}" alt="${U.esc(it.name)}">`;
            } else if (it.kind === 'video') {
                this.stage.innerHTML = `<video src="${U.esc(it.previewUrl)}" controls playsinline preload="metadata"></video>`;
            } else {
                const fv = U.fileVisual(it.name);
                this.stage.innerHTML = `
                    <div class="file-preview">
                        <span class="file-icon" style="--fc:${fv.color}">${icon(it.kind === 'audio' ? 'music' : fv.icon)}${U.esc(fv.ext.slice(0, 4))}</span>
                        <strong>${U.esc(it.name)}</strong>
                        <span>${U.bytes(it.size)}</span>
                        ${it.kind === 'audio' && it.previewUrl ? `<audio src="${U.esc(it.previewUrl)}" controls preload="metadata"></audio>` : ''}
                    </div>`;
            }
            const active = this.thumbs.querySelector('.media-thumb.active');
            if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
        }

        send() {
            if (!this.items.length) return;
            const items = this.items;
            const caption = this.caption.value.trim();
            this.items = [];
            this.app.sendMediaItems(items, caption, { hd: this.hd });
            this.app.closeOverlay('media');
        }

        hide(revoke = false) {
            this.isOpen = false;
            this.el.hidden = true;
            this.stage.querySelectorAll('video,audio').forEach((m) => m.pause());
            if (revoke) {
                this.items.forEach((it) => { if (it.previewUrl && it.file) URL.revokeObjectURL(it.previewUrl); });
                this.items = [];
            }
            this.stage.innerHTML = '';
            this.thumbs.innerHTML = '';
        }
    }
    OC.MediaSheet = MediaSheet;

    // ==================================================================
    // Lightbox gallery
    // ==================================================================
    class Lightbox {
        constructor(app) {
            this.app = app;
            this.el = $('#lightbox');
            this.stageEl = $('#lbStage');
            this.items = [];
            this.index = 0;
            this.z = { s: 1, x: 0, y: 0 };
            this.pointers = new Map();
            this.isOpen = false;

            $('#btnLbClose').addEventListener('click', () => this.app.closeOverlay('lightbox'));
            $('#btnLbPrev').addEventListener('click', () => this.go(this.index - 1));
            $('#btnLbNext').addEventListener('click', () => this.go(this.index + 1));
            $('#btnLbDownload').addEventListener('click', () => {
                const it = this.items[this.index];
                if (it) this.app.download(it.remote || it.url, it.name);
            });
            $('#btnLbShare').addEventListener('click', () => {
                const it = this.items[this.index];
                if (it) this.app.shareFile(it.remote || it.url, it.name, it.caption);
            });

            document.addEventListener('keydown', (e) => {
                if (!this.isOpen) return;
                if (e.key === 'ArrowLeft') this.go(this.index - 1);
                if (e.key === 'ArrowRight') this.go(this.index + 1);
            });

            this.stageEl.addEventListener('pointerdown', (e) => this.onDown(e));
            this.stageEl.addEventListener('pointermove', (e) => this.onMove(e));
            this.stageEl.addEventListener('pointerup', (e) => this.onUp(e));
            this.stageEl.addEventListener('pointercancel', (e) => this.onUp(e));
            this.stageEl.addEventListener('wheel', (e) => {
                if (!this.isOpen) return;
                e.preventDefault();
                const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
                this.zoomAt(U.clamp(this.z.s * factor, 1, 5), e.clientX, e.clientY);
            }, { passive: false });
        }

        open(items, index = 0) {
            if (!items.length) return;
            this.items = items;
            this.el.hidden = false;
            this.el.classList.remove('ui-hidden');
            this.el.style.background = '';
            this.isOpen = true;
            this.stageEl.innerHTML = `<div class="lb-track">${items.map(() => '<div class="lb-slide"></div>').join('')}</div>`;
            this.track = this.stageEl.firstElementChild;
            this.go(index, false);
            this.app.pushOverlay('lightbox', () => this.hide());
        }

        hide() {
            this.isOpen = false;
            this.el.hidden = true;
            this.stageEl.querySelectorAll('video').forEach((v) => v.pause());
            this.stageEl.innerHTML = '';
            this.items = [];
        }

        slide(i) {
            return this.track ? this.track.children[i] : null;
        }

        ensure(i) {
            const it = this.items[i];
            const s = this.slide(i);
            if (!it || !s || s.firstChild) return;
            if (it.type === 'video') {
                s.innerHTML = `<video src="${U.esc(it.url)}" controls playsinline preload="metadata"></video>`;
            } else {
                s.innerHTML = `<img src="${U.esc(it.url)}" alt="${U.esc(it.name || '')}" draggable="false">`;
            }
        }

        go(i, animate = true) {
            if (!this.items.length) return;
            const prev = this.index;
            this.index = U.clamp(i, 0, this.items.length - 1);
            this.resetZoom();
            this.track.style.transition = animate ? 'transform 0.32s cubic-bezier(.2,.8,.2,1)' : 'none';
            this.track.style.transform = `translateX(${-this.index * 100}%)`;
            [this.index - 1, this.index, this.index + 1].forEach((k) => this.ensure(k));
            this.items.forEach((_, k) => {
                if (k !== this.index) {
                    const v = this.slide(k) && this.slide(k).querySelector('video');
                    if (v) v.pause();
                }
            });
            if (prev !== this.index || !animate) {
                const v = this.slide(this.index).querySelector('video');
                if (v && animate) v.play().catch(() => {});
            }
            const it = this.items[this.index];
            $('#lbTitle').textContent = it.sender || it.name || '';
            $('#lbSub').textContent = it.time || '';
            $('#lbCaption').textContent = it.caption || '';
            $('#lbCounter').textContent = this.items.length > 1 ? `${this.index + 1} / ${this.items.length}` : '';
            $('#btnLbPrev').disabled = this.index === 0;
            $('#btnLbNext').disabled = this.index === this.items.length - 1;
        }

        currentMedia() {
            const s = this.slide(this.index);
            return s ? s.querySelector('img') : null;
        }

        applyZoom() {
            const img = this.currentMedia();
            if (img) img.style.transform = `translate(${this.z.x}px, ${this.z.y}px) scale(${this.z.s})`;
        }

        resetZoom() {
            this.z = { s: 1, x: 0, y: 0 };
            this.stageEl.querySelectorAll('img').forEach((img) => {
                img.style.transition = '';
                img.style.transform = '';
            });
        }

        zoomAt(s, cx, cy) {
            const img = this.currentMedia();
            if (!img) return;
            const rect = this.stageEl.getBoundingClientRect();
            const ox = cx - (rect.left + rect.width / 2);
            const oy = cy - (rect.top + rect.height / 2);
            const k = s / this.z.s;
            this.z.x = ox - (ox - this.z.x) * k;
            this.z.y = oy - (oy - this.z.y) * k;
            this.z.s = s;
            if (s <= 1.01) this.z = { s: 1, x: 0, y: 0 };
            this.applyZoom();
        }

        onDown(e) {
            if (e.target.tagName === 'VIDEO') {
                const r = e.target.getBoundingClientRect();
                if (e.clientY > r.bottom - 64) return; // leave native controls alone
            }
            if (e.target.closest('button')) return;
            try { this.stageEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (this.pointers.size === 1) {
                this.g = { x: e.clientX, y: e.clientY, t: performance.now(), mode: null, zx: this.z.x, zy: this.z.y };
            } else if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()];
                this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.z.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
                if (this.g) this.g.mode = 'pinch';
            }
        }

        onMove(e) {
            if (!this.pointers.has(e.pointerId) || !this.g) return;
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (this.pointers.size === 2 && this.pinch) {
                const [a, b] = [...this.pointers.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                this.zoomAt(U.clamp(this.pinch.s * (d / this.pinch.d), 1, 5), this.pinch.cx, this.pinch.cy);
                return;
            }

            const dx = e.clientX - this.g.x;
            const dy = e.clientY - this.g.y;
            if (!this.g.mode) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                if (this.z.s > 1) this.g.mode = 'pan';
                else this.g.mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'dismiss';
            }

            if (this.g.mode === 'pan') {
                this.z.x = this.g.zx + dx;
                this.z.y = this.g.zy + dy;
                this.applyZoom();
            } else if (this.g.mode === 'swipe') {
                const atEdge = (this.index === 0 && dx > 0) || (this.index === this.items.length - 1 && dx < 0);
                const eff = atEdge ? dx * 0.3 : dx;
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(calc(${-this.index * 100}% + ${eff}px))`;
            } else if (this.g.mode === 'dismiss') {
                const s = this.slide(this.index);
                const media = s && s.firstElementChild;
                if (media) {
                    media.style.transition = 'none';
                    media.style.transform = `translateY(${dy}px) scale(${1 - Math.min(Math.abs(dy) / 1400, 0.25)})`;
                }
                this.el.style.background = `rgba(0,0,0,${U.clamp(0.96 - Math.abs(dy) / 500, 0.3, 0.96)})`;
            }
        }

        onUp(e) {
            if (!this.pointers.has(e.pointerId)) return;
            this.pointers.delete(e.pointerId);
            if (this.pointers.size === 1 && this.g && this.g.mode === 'pinch') {
                // one finger left after pinch: continue as pan
                const [p] = [...this.pointers.values()];
                this.g = { x: p.x, y: p.y, t: performance.now(), mode: this.z.s > 1 ? 'pan' : null, zx: this.z.x, zy: this.z.y };
                this.pinch = null;
                return;
            }
            if (this.pointers.size > 0 || !this.g) return;

            const g = this.g;
            this.g = null;
            this.pinch = null;
            const dx = e.clientX - g.x;
            const dy = e.clientY - g.y;
            const dt = performance.now() - g.t;
            const w = this.stageEl.clientWidth;

            if (g.mode === 'swipe') {
                const fast = Math.abs(dx) / dt > 0.5;
                if ((dx < -w * 0.18 || (fast && dx < -30)) && this.index < this.items.length - 1) this.go(this.index + 1);
                else if ((dx > w * 0.18 || (fast && dx > 30)) && this.index > 0) this.go(this.index - 1);
                else this.go(this.index);
            } else if (g.mode === 'dismiss') {
                const s = this.slide(this.index);
                const media = s && s.firstElementChild;
                if (Math.abs(dy) > 110 || Math.abs(dy) / dt > 0.7) {
                    this.app.closeOverlay('lightbox');
                } else if (media) {
                    media.style.transition = 'transform 0.25s cubic-bezier(.2,.8,.2,1)';
                    media.style.transform = '';
                    this.el.style.background = '';
                }
            } else if (!g.mode && dt < 300) {
                // tap / double tap
                const now = performance.now();
                if (this.lastTap && now - this.lastTap < 300) {
                    this.lastTap = 0;
                    clearTimeout(this.tapTimer);
                    const img = this.currentMedia();
                    if (img) img.style.transition = 'transform 0.25s ease';
                    this.zoomAt(this.z.s > 1 ? 1 : 2.5, e.clientX, e.clientY);
                    setTimeout(() => { if (img) img.style.transition = ''; }, 260);
                } else {
                    this.lastTap = now;
                    this.tapTimer = setTimeout(() => this.el.classList.toggle('ui-hidden'), 300);
                }
            }
        }
    }
    OC.Lightbox = Lightbox;
})();
