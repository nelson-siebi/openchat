/**
 * OpenChat — core helpers (utils, storage, API client, toasts)
 * Exposed on window.OC so media.js and app.js can share them.
 */
(function () {
    'use strict';

    const OC = (window.OC = window.OC || {});
    const CFG = (OC.cfg = window.OPENCHAT || {});

    // ------------------------------------------------------------------
    // DOM shortcuts
    // ------------------------------------------------------------------
    OC.$ = (sel, root = document) => root.querySelector(sel);
    OC.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    OC.icon = (name, cls = '') => `<svg class="ic ${cls}"><use href="#i-${name}"/></svg>`;

    // ------------------------------------------------------------------
    // Safe localStorage
    // ------------------------------------------------------------------
    OC.store = {
        get(key, fallback = null) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : v;
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, String(value)); } catch (e) { /* private mode */ }
        },
        del(key) {
            try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        },
        json(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v ? JSON.parse(v) : fallback;
            } catch (e) { return fallback; }
        },
        setJson(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
        }
    };

    // ------------------------------------------------------------------
    // Utils
    // ------------------------------------------------------------------
    const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#d946ef'];

    const U = (OC.U = {
        esc(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        /** Only allow http(s), blob:, data:image and our bundled stickers. */
        safeUrl(url) {
            if (!url) return '';
            const s = String(url).trim();
            if (/^https?:\/\//i.test(s) || /^blob:/i.test(s) || /^data:image\//i.test(s) || /^assets\/stickers\//.test(s)) return s;
            return '';
        },

        uid() {
            if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
            return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        },

        hash(str) {
            let h = 0;
            const s = String(str || '');
            for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
            return Math.abs(h);
        },

        colorFor(name) {
            return PALETTE[U.hash(name) % PALETTE.length];
        },

        gradientFor(name) {
            const h = U.hash(name);
            const a = PALETTE[h % PALETTE.length];
            const b = PALETTE[(h >> 3) % PALETTE.length];
            return [a, a === b ? PALETTE[(h + 5) % PALETTE.length] : b];
        },

        initials(name) {
            const s = String(name || '?').trim().replace(/^[^\p{L}\p{N}]+/u, '');
            if (!s) return '?';
            const parts = s.split(/[\s\-_.]+/).filter(Boolean);
            if (parts.length >= 2 && /\p{L}/u.test(parts[1][0])) return (parts[0][0] + parts[1][0]).toUpperCase();
            return Array.from(s)[0].toUpperCase();
        },

        bytes(n) {
            n = Number(n) || 0;
            if (n <= 0) return '0 o';
            const units = ['o', 'Ko', 'Mo', 'Go'];
            const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
            const v = n / Math.pow(1024, i);
            return (v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)).toString().replace('.', ',') + ' ' + units[i];
        },

        duration(sec) {
            sec = Math.max(0, Math.round(Number(sec) || 0));
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return `${m}:${String(s).padStart(2, '0')}`;
        },

        parseDate(str) {
            if (!str) return new Date();
            if (str instanceof Date) return str;
            const d = new Date(String(str).replace(' ', 'T') + (String(str).includes('Z') || String(str).includes('+') ? '' : 'Z'));
            return isNaN(d.getTime()) ? new Date() : d;
        },

        nowSql() {
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
        },

        time(str) {
            return U.parseDate(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        },

        dayKey(str) {
            const d = U.parseDate(str);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        },

        dayLabel(key) {
            const [y, m, d] = key.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diff = Math.round((today - date) / 86400000);
            if (diff === 0) return "Aujourd'hui";
            if (diff === 1) return 'Hier';
            if (diff > 1 && diff < 7) {
                const w = date.toLocaleDateString('fr-FR', { weekday: 'long' });
                return w.charAt(0).toUpperCase() + w.slice(1);
            }
            const opts = { day: 'numeric', month: 'long' };
            if (y !== today.getFullYear()) opts.year = 'numeric';
            return date.toLocaleDateString('fr-FR', opts);
        },

        ago(ts) {
            const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
            if (s < 60) return "à l'instant";
            const m = Math.floor(s / 60);
            if (m < 60) return `il y a ${m} min`;
            const h = Math.floor(m / 60);
            if (h < 24) return `il y a ${h} h`;
            const d = Math.floor(h / 24);
            return d === 1 ? 'hier' : `il y a ${d} j`;
        },

        ext(name) {
            const m = String(name || '').toLowerCase().match(/\.([a-z0-9]{1,6})(?:\?|#|$)/);
            return m ? m[1] : '';
        },

        fileVisual(name) {
            const e = U.ext(name);
            const map = [
                [['pdf'], '#ef4444', 'file'],
                [['doc', 'docx', 'odt', 'rtf', 'txt', 'md'], '#2563eb', 'file'],
                [['xls', 'xlsx', 'csv', 'ods'], '#16a34a', 'file'],
                [['ppt', 'pptx', 'odp', 'key'], '#ea580c', 'file'],
                [['zip', 'rar', '7z', 'tar', 'gz'], '#a16207', 'file'],
                [['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'weba'], '#db2777', 'music'],
                [['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'], '#7c3aed', 'video'],
                [['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'avif', 'bmp'], '#0891b2', 'image'],
                [['apk', 'exe', 'msi', 'dmg', 'deb'], '#475569', 'phone'],
                [['js', 'ts', 'php', 'py', 'html', 'css', 'json', 'sql', 'java', 'c', 'cpp', 'go', 'rs'], '#0f766e', 'file']
            ];
            for (const [exts, color, icon] of map) {
                if (exts.includes(e)) return { ext: e || 'fichier', color, icon };
            }
            return { ext: e || 'fichier', color: '#64748b', icon: 'file' };
        },

        kindOf(file) {
            const type = (file && file.type) || '';
            const name = (file && file.name) || '';
            if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|svg)$/i.test(name)) return 'image';
            if (type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v|3gp)$/i.test(name)) return 'video';
            if (type.startsWith('audio/') || /\.(mp3|wav|ogg|oga|m4a|aac|opus|flac|weba)$/i.test(name)) return 'audio';
            return 'file';
        },

        /** Emoji-only text (1 to 3 emojis) → returns count, otherwise 0 */
        emojiCount(text) {
            const s = String(text || '').trim();
            if (!s || s.length > 32) return 0;
            if (!/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u.test(s)) return 0;
            if (/^[\d#*\s]+$/.test(s)) return 0;
            let count = 0;
            if (window.Intl && Intl.Segmenter) {
                for (const seg of new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(s)) {
                    if (seg.segment.trim()) count++;
                }
            } else {
                count = (s.match(/\p{Extended_Pictographic}/gu) || []).length;
            }
            return count >= 1 && count <= 3 ? count : 0;
        },

        /**
         * Escape + light formatting (*bold*, _italic_, ~strike~, `code`) + links & emails.
         * URLs are tokenised first so formatting never breaks them.
         */
        richText(raw) {
            const text = String(raw || '');
            const urlRe = /\bhttps?:\/\/[^\s<>"]+[^\s<>".,:;!?)\]'»]/gi;
            let out = '';
            let last = 0;
            let m;
            while ((m = urlRe.exec(text)) !== null) {
                out += U.formatPlain(text.slice(last, m.index));
                const url = m[0];
                out += `<a href="${U.esc(url)}" target="_blank" rel="noopener noreferrer">${U.esc(U.prettyUrl(url))}</a>`;
                last = m.index + url.length;
            }
            out += U.formatPlain(text.slice(last));
            return out;
        },

        formatPlain(part) {
            let s = U.esc(part);
            s = s.replace(/`([^`\n]{1,200})`/g, '<code>$1</code>');
            s = s.replace(/(^|[\s(])\*([^*\n]{1,300})\*(?=[\s).,!?:;]|$)/g, '$1<strong>$2</strong>');
            s = s.replace(/(^|[\s(])_([^_\n]{1,300})_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
            s = s.replace(/(^|[\s(])~([^~\n]{1,300})~(?=[\s).,!?:;]|$)/g, '$1<s>$2</s>');
            s = s.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');
            return s;
        },

        prettyUrl(url) {
            const s = String(url).replace(/^https?:\/\/(www\.)?/i, '');
            return s.length > 60 ? s.slice(0, 57) + '…' : s;
        },

        firstUrl(text) {
            const m = String(text || '').match(/\bhttps?:\/\/[^\s<>"]+[^\s<>".,:;!?)\]'»]/i);
            return m ? m[0] : null;
        },

        clamp(v, a, b) { return Math.min(b, Math.max(a, v)); },

        debounce(fn, ms) {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn(...args), ms);
            };
        },

        haptic(pattern = 12) {
            try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
        },

        isTouch: window.matchMedia('(pointer: coarse)').matches,
        isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,

        sanitizeCode(code) {
            return String(code || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 50);
        },

        /** Smooth pseudo-random waveform seeded by a string (for audio without stored waveform). */
        fakeWave(seed, n = 36) {
            let x = U.hash(seed) || 1;
            const rnd = () => {
                x ^= x << 13; x ^= x >> 17; x ^= x << 5;
                return ((x >>> 0) % 1000) / 1000;
            };
            const out = [];
            let prev = 0.4;
            for (let i = 0; i < n; i++) {
                prev = prev * 0.45 + rnd() * 0.55;
                out.push(Math.round(18 + prev * 82));
            }
            return out;
        },

        resample(values, n) {
            if (!Array.isArray(values) || values.length === 0) return [];
            if (values.length === n) return values.slice();
            const out = [];
            for (let i = 0; i < n; i++) {
                const start = Math.floor((i * values.length) / n);
                const end = Math.max(start + 1, Math.floor(((i + 1) * values.length) / n));
                let max = 0;
                for (let j = start; j < end; j++) max = Math.max(max, Number(values[j]) || 0);
                out.push(max);
            }
            return out;
        },

        downloadUrl(url, name) {
            const u = String(url || '');
            if (/^https?:\/\//i.test(u) && !u.startsWith(location.origin)) {
                return `api/download.php?url=${encodeURIComponent(u)}&name=${encodeURIComponent(name || 'fichier')}`;
            }
            return u;
        },

        inlineUrl(url, name) {
            const u = String(url || '');
            if (/^https?:\/\//i.test(u) && !u.startsWith(location.origin)) {
                return `api/download.php?inline=1&url=${encodeURIComponent(u)}&name=${encodeURIComponent(name || 'fichier')}`;
            }
            return u;
        }
    });

    // ------------------------------------------------------------------
    // API client
    // ------------------------------------------------------------------
    async function json(url, opts = {}) {
        const res = await fetch(url, {
            cache: 'no-store',
            ...opts,
            headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json', ...(opts.headers || {}) } : opts.headers
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* not json */ }
        if (!res.ok || !data || data.success === false) {
            const err = new Error((data && data.error) || `Erreur réseau (${res.status})`);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    OC.api = {
        latest(room, limit = 60) {
            return json(`api/messages.php?code=${encodeURIComponent(room)}&latest=1&limit=${limit}`);
        },
        before(room, beforeId, limit = 40) {
            return json(`api/messages.php?code=${encodeURIComponent(room)}&before_id=${beforeId}&limit=${limit}`);
        },
        since(room, sinceId) {
            return json(`api/messages.php?code=${encodeURIComponent(room)}&since_id=${sinceId}&limit=100`);
        },
        send(payload) {
            return json('api/messages.php', { method: 'POST', body: JSON.stringify(payload) });
        },
        react(messageId, emoji, username) {
            return json('api/messages.php', { method: 'POST', body: JSON.stringify({ action: 'react', message_id: messageId, emoji, username }) });
        },
        presence(action, room, username, color) {
            return json('api/presence.php', { method: 'POST', body: JSON.stringify({ action, room_code: room, username, color }) });
        },
        createRoom(code = '') {
            return json('api/rooms.php', { method: 'POST', body: JSON.stringify(code ? { code } : {}) });
        },
        linkPreview(url) {
            return json(`api/link_preview.php?url=${encodeURIComponent(url)}`);
        },

        /** XHR upload with progress + abort. Returns { promise, abort }. */
        upload(file, { name, kind, onProgress } = {}) {
            const xhr = new XMLHttpRequest();
            const promise = new Promise((resolve, reject) => {
                const fd = new FormData();
                fd.append('file', file, name || file.name || 'fichier');
                if (kind) fd.append('kind', kind);

                xhr.open('POST', 'api/upload.php', true);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
                };
                xhr.onload = () => {
                    let data = null;
                    try { data = JSON.parse(xhr.responseText); } catch (e) { /* ignore */ }
                    if (xhr.status >= 200 && xhr.status < 300 && data && data.success) {
                        resolve(data);
                    } else {
                        reject(new Error((data && data.error) || (xhr.status === 413 ? 'Fichier trop volumineux pour le serveur.' : 'Échec du téléversement.')));
                    }
                };
                xhr.onerror = () => reject(new Error('Connexion perdue pendant l\'envoi.'));
                xhr.onabort = () => {
                    const err = new Error('Envoi annulé');
                    err.aborted = true;
                    reject(err);
                };
                xhr.send(fd);
            });
            return { promise, abort: () => xhr.abort() };
        }
    };

    // ------------------------------------------------------------------
    // Toasts
    // ------------------------------------------------------------------
    OC.toast = function (message, opts = {}) {
        const box = OC.$('#toasts');
        if (!box) return;
        const type = opts.type || 'info';
        const iconName = type === 'ok' ? 'check' : type === 'err' ? 'alert' : 'info';
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `${OC.icon(iconName)}<span></span>`;
        el.querySelector('span').textContent = message;
        if (opts.action) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toast-action';
            btn.textContent = opts.action.label;
            btn.addEventListener('click', () => {
                opts.action.fn();
                el.remove();
            });
            el.appendChild(btn);
        }
        box.appendChild(el);
        while (box.children.length > 3) box.firstElementChild.remove();
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 260);
        }, opts.duration || 2800);
    };

    // ------------------------------------------------------------------
    // Clipboard
    // ------------------------------------------------------------------
    OC.copy = async function (text, okMessage = 'Copié') {
        if (!text) return false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                OC.toast(okMessage, { type: 'ok' });
                return true;
            }
        } catch (e) { /* fallback below */ }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, text.length);
            const ok = document.execCommand('copy');
            ta.remove();
            OC.toast(ok ? okMessage : 'Impossible de copier automatiquement', { type: ok ? 'ok' : 'err' });
            return ok;
        } catch (e) {
            OC.toast('Impossible de copier', { type: 'err' });
            return false;
        }
    };

    // ------------------------------------------------------------------
    // Tiny sound engine (Web Audio, one shared context)
    // ------------------------------------------------------------------
    let audioCtx = null;
    function ctx() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
    }
    function tone(freqs, { type = 'sine', gain = 0.08, step = 0.07, len = 0.18 } = {}) {
        const c = ctx();
        if (!c) return;
        const now = c.currentTime;
        freqs.forEach((f, i) => {
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = type;
            o.frequency.setValueAtTime(f, now + i * step);
            g.gain.setValueAtTime(0.0001, now + i * step);
            g.gain.exponentialRampToValueAtTime(gain, now + i * step + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, now + i * step + len);
            o.connect(g).connect(c.destination);
            o.start(now + i * step);
            o.stop(now + i * step + len + 0.02);
        });
    }
    OC.sound = {
        incoming() { tone([660, 990], { gain: 0.07 }); },
        sent() { tone([520], { type: 'triangle', gain: 0.035, len: 0.09 }); },
        success() { tone([523.25, 659.25, 783.99, 1046.5], { type: 'triangle', gain: 0.08, step: 0.08, len: 0.2 }); },
        recordStart() { tone([880], { gain: 0.05, len: 0.08 }); },
        cancel() { tone([300, 200], { type: 'triangle', gain: 0.05, step: 0.06, len: 0.1 }); }
    };
})();
