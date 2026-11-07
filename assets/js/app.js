/**
 * OpenChat - Client Application Logic
 * PWA + Voice Notes + Email & Link Quick Copy + Instant QR Pairing + Dual File Actions
 */

class OpenChatApp {
    constructor() {
        this.roomCode = this.getParam('code') || 'public';
        this.username = localStorage.getItem('openchat_username') || this.generateDefaultUsername();
        this.lastMessageId = 0;
        this.seenMessageIds = new Set();
        this.eventSource = null;
        this.pollTimer = null;
        this.soundEnabled = localStorage.getItem('openchat_sound') !== 'false';
        this.deferredInstallPrompt = null;

        // Voice recording state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordStartTime = 0;
        this.recordTimerInterval = null;

        // QR Pairing state
        this.currentPairToken = null;

        this.init();
    }

    getParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    generateDefaultUsername() {
        const id = Math.floor(100 + Math.random() * 900);
        const name = `Invité-${id}`;
        localStorage.setItem('openchat_username', name);
        return name;
    }

    init() {
        this.saveCurrentRoomToRecent();
        this.setupPWA();
        this.setupSidebar();
        this.setupUI();
        this.setupModals();
        this.setupVoiceRecording();
        this.setupClipboardAndDrop();
        this.setupSmartScroll();
        this.setupLiveSync();
        this.fetchInitialMessages();
        this.renderRecentRoomsList();
        this.checkInitialPairing();
    }

    // ==========================================
    // QR INSTANT PAIRING HANDSHAKE
    // ==========================================
    checkInitialPairing() {
        const pairedToken = this.getParam('paired');
        if (pairedToken) {
            // This device scanned device A's QR Code!
            // Clean URL query string without reloading
            const url = new URL(window.location);
            url.searchParams.delete('paired');
            window.history.replaceState({}, '', url);

            // Announce connection to the room so device A knows
            fetch('api/messages.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_code: this.roomCode,
                    sender: 'Système',
                    type: 'peer_joined',
                    content: pairedToken
                })
            }).catch(() => {});

            this.showToast('🎉 Connecté avec succès à ce salon !');
        }
    }

    // ==========================================
    // PWA REGISTRATION & INSTALLATION
    // ==========================================
    setupPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(() => console.log('OpenChat PWA: Actif'))
                    .catch((err) => console.log('OpenChat PWA Error', err));
            });
        }

        const pwaBtn = document.getElementById('btnPwaInstall');
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            if (pwaBtn) {
                pwaBtn.style.display = 'inline-flex';
                pwaBtn.addEventListener('click', async () => {
                    pwaBtn.style.display = 'none';
                    if (this.deferredInstallPrompt) {
                        this.deferredInstallPrompt.prompt();
                        const { outcome } = await this.deferredInstallPrompt.userChoice;
                        if (outcome === 'accepted') {
                            this.showToast('Application installée avec succès !');
                        }
                        this.deferredInstallPrompt = null;
                    }
                });
            }
        });
    }

    // ==========================================
    // SIDEBAR & RECENT ROOMS
    // ==========================================
    setupSidebar() {
        const btnToggle = document.getElementById('btnToggleSidebar');
        const btnClose = document.getElementById('btnCloseSidebar');
        const sidebar = document.getElementById('appSidebar');
        const overlay = document.getElementById('sidebarOverlay');

        const toggle = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        if (btnToggle) btnToggle.addEventListener('click', toggle);
        if (btnClose) btnClose.addEventListener('click', toggle);
        if (overlay) overlay.addEventListener('click', toggle);
    }

    saveCurrentRoomToRecent() {
        if (!this.roomCode || this.roomCode === 'public') return;
        try {
            let recent = JSON.parse(localStorage.getItem('openchat_recent_rooms') || '[]');
            recent = recent.filter(r => r !== this.roomCode);
            recent.unshift(this.roomCode);
            recent = recent.slice(0, 10);
            localStorage.setItem('openchat_recent_rooms', JSON.stringify(recent));
        } catch (e) {}
    }

    renderRecentRoomsList() {
        const container = document.getElementById('recentRoomsList');
        if (!container) return;

        try {
            const recent = JSON.parse(localStorage.getItem('openchat_recent_rooms') || '[]');
            container.innerHTML = '';
            
            if (recent.length === 0) {
                container.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted); padding: 0.5rem;">Aucun salon privé récent.</div>`;
                return;
            }

            recent.forEach(code => {
                const isActive = code === this.roomCode;
                const item = document.createElement('a');
                item.href = `index.php?code=${encodeURIComponent(code)}`;
                item.className = `room-nav-item ${isActive ? 'active' : ''}`;
                item.innerHTML = `
                    <span class="room-nav-icon">🔒</span>
                    <div class="room-nav-info">
                        <div class="room-nav-name">${this.escapeHtml(code)}</div>
                        <div class="room-nav-sub">Salon Privé</div>
                    </div>
                `;
                container.appendChild(item);
            });
        } catch (e) {}
    }

    // ==========================================
    // UI SETUP & MODALS
    // ==========================================
    setupUI() {
        // Nickname
        const nickDisplay = document.getElementById('userNickname');
        if (nickDisplay) {
            nickDisplay.textContent = `👤 ${this.username}`;
            nickDisplay.addEventListener('click', () => {
                const newName = prompt('Modifier votre pseudo :', this.username);
                if (newName && newName.trim()) {
                    this.username = newName.trim().substring(0, 25);
                    localStorage.setItem('openchat_username', this.username);
                    nickDisplay.textContent = `👤 ${this.username}`;
                    this.showToast(`Pseudo mis à jour : ${this.username}`);
                }
            });
        }

        // Sound Toggle
        const btnSound = document.getElementById('btnToggleSound');
        if (btnSound) {
            btnSound.innerHTML = this.soundEnabled ? '🔔' : '🔕';
            btnSound.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                localStorage.setItem('openchat_sound', this.soundEnabled ? 'true' : 'false');
                btnSound.innerHTML = this.soundEnabled ? '🔔' : '🔕';
                this.showToast(this.soundEnabled ? 'Notifications sonores activées' : 'Notifications sonores désactivées');
            });
        }

        // Share link copy
        const btnCopyLink = document.getElementById('btnCopyShareLink');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                this.copyText(window.location.href, 'Lien du salon copié dans le presse-papier !');
            });
        }

        // QR Code Modal
        const btnQr = document.getElementById('btnShowQr');
        const qrModal = document.getElementById('qrModal');
        const qrClose = document.getElementById('qrModalClose');

        if (btnQr && qrModal) {
            btnQr.addEventListener('click', () => {
                qrModal.style.display = 'flex';
                this.renderQRCode();
            });

            if (qrClose) {
                qrClose.addEventListener('click', () => {
                    qrModal.style.display = 'none';
                    this.currentPairToken = null;
                });
            }

            qrModal.addEventListener('click', (e) => {
                if (e.target === qrModal) {
                    qrModal.style.display = 'none';
                    this.currentPairToken = null;
                }
            });
        }

        // Textarea & Send
        const msgInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('btnSendMessage');
        const fileInput = document.getElementById('fileInput');
        const attachBtn = document.getElementById('btnAttachFile');

        if (msgInput) {
            msgInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            msgInput.addEventListener('input', () => {
                msgInput.style.height = 'auto';
                msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.uploadAndSendFile(e.target.files[0]);
                    fileInput.value = '';
                }
            });
        }

        // Handle mobile virtual keyboard resize
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.scrollToBottom();
            });
        }
    }

    setupModals() {
        // Create Private Room
        const btnOpenCreate = document.getElementById('btnOpenCreateModal');
        const createModal = document.getElementById('createRoomModal');
        const createClose = document.getElementById('createRoomModalClose');
        const btnGen = document.getElementById('btnGenerateInstantRoom');
        const formCustom = document.getElementById('formCustomRoom');
        const customInput = document.getElementById('customRoomInput');

        if (btnOpenCreate && createModal) {
            btnOpenCreate.addEventListener('click', () => createModal.style.display = 'flex');
            if (createClose) createClose.addEventListener('click', () => createModal.style.display = 'none');
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) createModal.style.display = 'none';
            });

            if (btnGen) {
                btnGen.addEventListener('click', async () => {
                    btnGen.disabled = true;
                    btnGen.textContent = 'Création...';
                    try {
                        const res = await fetch('api/rooms.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                        });
                        const data = await res.json();
                        if (data.success && data.room) {
                            window.location.href = `index.php?code=${encodeURIComponent(data.room.code)}`;
                        }
                    } catch (e) {
                        btnGen.disabled = false;
                        btnGen.textContent = '⚡ Générer un salon aléatoire';
                    }
                });
            }

            if (formCustom) {
                formCustom.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const code = customInput.value.trim().toLowerCase();
                    if (code) {
                        window.location.href = `index.php?code=${encodeURIComponent(code)}`;
                    }
                });
            }
        }

        // Join Room
        const btnOpenJoin = document.getElementById('btnOpenJoinModal');
        const joinModal = document.getElementById('joinRoomModal');
        const joinClose = document.getElementById('joinRoomModalClose');
        const formJoin = document.getElementById('formJoinRoomCode');
        const joinInput = document.getElementById('joinRoomInput');

        if (btnOpenJoin && joinModal) {
            btnOpenJoin.addEventListener('click', () => joinModal.style.display = 'flex');
            if (joinClose) joinClose.addEventListener('click', () => joinModal.style.display = 'none');
            joinModal.addEventListener('click', (e) => {
                if (e.target === joinModal) joinModal.style.display = 'none';
            });

            if (formJoin) {
                formJoin.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const code = joinInput.value.trim().toLowerCase();
                    if (code) {
                        window.location.href = `index.php?code=${encodeURIComponent(code)}`;
                    }
                });
            }
        }
    }

    renderQRCode() {
        const qrContainer = document.getElementById('qrCodeContainer');
        const qrShareText = document.getElementById('qrShareUrlText');
        const qrStatusBox = document.getElementById('qrStatusBox');
        if (!qrContainer) return;

        // Generate a unique pairing handshake token
        this.currentPairToken = 'pair_' + Math.random().toString(36).substring(2, 10);

        const baseUrl = window.location.origin + window.location.pathname;
        const pairUrl = `${baseUrl}?code=${encodeURIComponent(this.roomCode)}&paired=${this.currentPairToken}`;

        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: pairUrl,
                width: 190,
                height: 190,
                colorDark: '#020617',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }

        if (qrShareText) qrShareText.textContent = pairUrl;
        if (qrStatusBox) qrStatusBox.innerHTML = '<span class="pulse-dot"></span> En attente du scan de votre appareil...';
    }

    // ==========================================
    // VOICE RECORDING (MESSAGES VOCAUX)
    // ==========================================
    setupVoiceRecording() {
        const btnStart = document.getElementById('btnStartVoice');
        const btnCancel = document.getElementById('btnCancelVoice');
        const btnSend = document.getElementById('btnSendVoice');
        const normalBar = document.getElementById('normalInputBar');
        const recordBar = document.getElementById('voiceRecordingBar');
        const timerDisplay = document.getElementById('voiceRecordTimer');

        if (!btnStart || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (btnStart) btnStart.style.display = 'none';
            return;
        }

        btnStart.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.audioChunks = [];

                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

                this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        this.audioChunks.push(e.data);
                    }
                };

                this.mediaRecorder.onstop = () => {
                    stream.getTracks().forEach(track => track.stop());
                };

                this.mediaRecorder.start(200);

                // UI switch
                normalBar.style.display = 'none';
                recordBar.style.display = 'flex';

                this.recordStartTime = Date.now();
                timerDisplay.textContent = '00:00';
                this.recordTimerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.recordStartTime) / 1000);
                    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
                    const secs = String(elapsed % 60).padStart(2, '0');
                    timerDisplay.textContent = `${mins}:${secs}`;
                }, 500);

            } catch (err) {
                alert('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès dans votre navigateur.');
            }
        });

        // Cancel Voice
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                this.stopVoiceRecording();
                this.audioChunks = [];
            });
        }

        // Send Voice
        if (btnSend) {
            btnSend.addEventListener('click', () => {
                if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;

                this.mediaRecorder.addEventListener('stop', () => {
                    if (this.audioChunks.length === 0) return;
                    const mime = this.mediaRecorder.mimeType || 'audio/webm';
                    const ext = mime.includes('mp4') ? 'm4a' : 'webm';
                    const audioBlob = new Blob(this.audioChunks, { type: mime });
                    this.uploadAndSendFile(audioBlob, `vocal_${Date.now()}.${ext}`, 'audio');
                    this.audioChunks = [];
                }, { once: true });

                this.stopVoiceRecording();
            });
        }
    }

    stopVoiceRecording() {
        if (this.recordTimerInterval) {
            clearInterval(this.recordTimerInterval);
            this.recordTimerInterval = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        const normalBar = document.getElementById('normalInputBar');
        const recordBar = document.getElementById('voiceRecordingBar');
        if (normalBar) normalBar.style.display = 'flex';
        if (recordBar) recordBar.style.display = 'none';
    }

    // ==========================================
    // CLIPBOARD & DRAG DROP
    // ==========================================
    setupClipboardAndDrop() {
        const overlay = document.getElementById('dropzoneOverlay');

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (overlay) overlay.style.display = 'flex';
        });

        window.addEventListener('dragleave', (e) => {
            if (e.clientX <= 0 || e.clientY <= 0) {
                if (overlay) overlay.style.display = 'none';
            }
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            if (overlay) overlay.style.display = 'none';

            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                for (let i = 0; i < e.dataTransfer.files.length; i++) {
                    this.uploadAndSendFile(e.dataTransfer.files[i]);
                }
            }
        });

        window.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob) {
                        this.uploadAndSendFile(blob, 'capture-presse-papier.png');
                    }
                }
            }
        });
    }

    setupSmartScroll() {
        const container = document.getElementById('chatMessages');
        const scrollBtn = document.getElementById('btnScrollBottom');

        if (!container || !scrollBtn) return;

        container.addEventListener('scroll', () => {
            const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
            if (distance > 150) {
                scrollBtn.style.display = 'inline-flex';
            } else {
                scrollBtn.style.display = 'none';
            }
        });

        scrollBtn.addEventListener('click', () => {
            this.scrollToBottom();
            scrollBtn.style.display = 'none';
        });
    }

    async uploadAndSendFile(file, customName = null, forceType = null) {
        this.showToast(`Téléversement vers Backblaze B2...`);

        const formData = new FormData();
        formData.append('file', file, customName || file.name);

        try {
            const res = await fetch('api/upload.php', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                await fetch('api/messages.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        room_code: this.roomCode,
                        sender: this.username,
                        content: data.file_name,
                        type: forceType || data.type,
                        file_url: data.file_url,
                        file_name: data.file_name,
                        file_size: data.file_size
                    })
                });
                this.showToast('Élément envoyé !');
            } else {
                alert(data.error || 'Erreur lors du téléversement.');
            }
        } catch (e) {
            this.showToast('Erreur lors de l\'envoi.');
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;

        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        input.style.height = 'auto';

        try {
            const res = await fetch('api/messages.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_code: this.roomCode,
                    sender: this.username,
                    content: content
                })
            });

            const data = await res.json();
            if (data.success && data.message) {
                this.appendMessage(data.message);
            }
        } catch (e) {
            this.showToast('Erreur d\'envoi du message.');
        }
    }

    async fetchInitialMessages() {
        try {
            const res = await fetch(`api/messages.php?code=${encodeURIComponent(this.roomCode)}&since_id=0&limit=100`);
            const data = await res.json();
            if (data.success && data.messages) {
                data.messages.forEach(msg => this.appendMessage(msg, false));
                this.scrollToBottom();
            }
        } catch (e) {
            console.error('Fetch initial failed', e);
        }
    }

    setupLiveSync() {
        if (typeof EventSource !== 'undefined') {
            this.connectSSE();
        } else {
            this.startPolling();
        }
    }

    connectSSE() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        const url = `api/stream.php?code=${encodeURIComponent(this.roomCode)}&since_id=${this.lastMessageId}`;
        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('messages', (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.messages && Array.isArray(data.messages)) {
                    data.messages.forEach(msg => {
                        this.appendMessage(msg, true);
                    });
                }
            } catch (err) {}
        });

        this.eventSource.addEventListener('reconnect', () => {
            this.connectSSE();
        });

        this.eventSource.onerror = () => {
            this.eventSource.close();
            setTimeout(() => this.connectSSE(), 2500);
        };
    }

    startPolling() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(async () => {
            try {
                const res = await fetch(`api/messages.php?code=${encodeURIComponent(this.roomCode)}&since_id=${this.lastMessageId}`);
                const data = await res.json();
                if (data.success && data.messages) {
                    data.messages.forEach(msg => this.appendMessage(msg, true));
                }
            } catch (e) {}
        }, 1500);
    }

    appendMessage(msg, notify = false) {
        if (this.seenMessageIds.has(msg.id)) return;
        this.seenMessageIds.add(msg.id);
        this.lastMessageId = Math.max(this.lastMessageId, parseInt(msg.id, 10));

        // CHECK FOR QR PAIRING NOTIFICATION
        if (msg.type === 'peer_joined') {
            const qrModal = document.getElementById('qrModal');
            if (this.currentPairToken && msg.content === this.currentPairToken) {
                // Device A matches token! Auto close QR code & celebrate
                if (qrModal) qrModal.style.display = 'none';
                this.currentPairToken = null;
                this.showToast('🎉 Nouvel appareil connecté avec succès !');
                this.playSuccessChime();
            }

            // Display discrete system indicator in chat
            const container = document.getElementById('chatMessages');
            if (container) {
                const sysRow = document.createElement('div');
                sysRow.className = 'message-row system';
                sysRow.innerHTML = `<div class="message-bubble">📱 Un nouvel appareil a rejoint ce salon</div>`;
                container.appendChild(sysRow);
                this.scrollToBottom();
            }
            return;
        }

        const container = document.getElementById('chatMessages');
        if (!container) return;

        const isMine = msg.sender === this.username;
        const row = document.createElement('div');
        row.className = `message-row ${isMine ? 'mine' : 'theirs'}`;

        const timeStr = this.formatTime(msg.created_at);

        let contentHtml = '';
        if (msg.type === 'image' && msg.file_url) {
            contentHtml = `
                <a href="${this.escapeHtml(msg.file_url)}" target="_blank" rel="noopener">
                    <img src="${this.escapeHtml(msg.file_url)}" class="message-image" alt="Image" loading="lazy" />
                </a>
            `;
        } else if (msg.type === 'audio' && msg.file_url) {
            contentHtml = this.renderAudioPlayer(msg.file_url);
        } else if (msg.type === 'file' && msg.file_url) {
            // Dual Action: Ouvrir ET Télécharger
            contentHtml = `
                <div class="file-card">
                    <div class="file-header">
                        <span class="file-icon">📁</span>
                        <div class="file-info">
                            <div class="file-name">${this.escapeHtml(msg.file_name || 'Fichier')}</div>
                            <div class="file-size">${this.formatBytes(msg.file_size)} • B2 Cloud</div>
                        </div>
                    </div>
                    <div class="file-actions">
                        <a href="${this.escapeHtml(msg.file_url)}" target="_blank" rel="noopener" class="file-btn">
                            👁️ Ouvrir
                        </a>
                        <a href="${this.escapeHtml(msg.file_url)}" download="${this.escapeHtml(msg.file_name || 'fichier')}" class="file-btn file-btn-primary">
                            ⬇️ Télécharger
                        </a>
                    </div>
                </div>
            `;
        } else if (msg.type === 'link') {
            contentHtml = `
                <span class="inline-copyable">
                    <a href="${this.escapeHtml(msg.content)}" target="_blank" rel="noopener">${this.escapeHtml(msg.content)}</a>
                    <button class="btn-inline-copy" title="Copier le lien" onclick="window.openChatApp.copyText('${this.escapeHtml(msg.content)}')">📋</button>
                </span>
            `;
        } else {
            contentHtml = this.autolink(this.escapeHtml(msg.content));
        }

        row.innerHTML = `
            <div class="message-meta">
                <strong>${this.escapeHtml(msg.sender)}</strong>
                <span>${timeStr}</span>
            </div>
            <div class="message-bubble">
                ${contentHtml}
            </div>
            <button class="copy-btn" title="Copier le message" onclick="window.openChatApp.copyText('${this.escapeHtml(msg.file_url || msg.content)}')">📋</button>
        `;

        const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 90;
        container.appendChild(row);

        // Bind custom audio players if any
        if (msg.type === 'audio') {
            this.initAudioPlayer(row);
        }

        if (wasAtBottom || isMine) {
            this.scrollToBottom();
        }

        if (notify && !isMine && this.soundEnabled) {
            this.playNotificationSound();
        }
    }

    renderAudioPlayer(audioUrl) {
        return `
            <div class="voice-player" data-audio-src="${this.escapeHtml(audioUrl)}">
                <button type="button" class="voice-play-btn" title="Écouter le vocal">▶</button>
                <div class="voice-track-area">
                    <div class="voice-progress-bar">
                        <div class="voice-progress-fill"></div>
                    </div>
                    <div class="voice-meta">
                        <span>🎙️ Message vocal</span>
                        <span class="voice-time">00:00</span>
                    </div>
                </div>
                <audio src="${this.escapeHtml(audioUrl)}" preload="metadata" style="display: none;"></audio>
            </div>
        `;
    }

    initAudioPlayer(parentElement) {
        const player = parentElement.querySelector('.voice-player');
        if (!player) return;

        const playBtn = player.querySelector('.voice-play-btn');
        const audio = player.querySelector('audio');
        const progressFill = player.querySelector('.voice-progress-fill');
        const progressBar = player.querySelector('.voice-progress-bar');
        const timeDisplay = player.querySelector('.voice-time');

        audio.addEventListener('loadedmetadata', () => {
            const secs = Math.floor(audio.duration);
            if (!isNaN(secs)) {
                timeDisplay.textContent = this.formatAudioDuration(secs);
            }
        });

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                // Pause all other audios
                document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
                audio.play();
                playBtn.textContent = '⏸';
            } else {
                audio.pause();
                playBtn.textContent = '▶';
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = percent + '%';
                timeDisplay.textContent = this.formatAudioDuration(Math.floor(audio.currentTime));
            }
        });

        audio.addEventListener('ended', () => {
            playBtn.textContent = '▶';
            progressFill.style.width = '0%';
            timeDisplay.textContent = this.formatAudioDuration(Math.floor(audio.duration || 0));
        });

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            if (audio.duration) {
                audio.currentTime = clickPos * audio.duration;
            }
        });
    }

    formatAudioDuration(totalSeconds) {
        const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    copyText(str, successMessage = 'Copié dans le presse-papier !') {
        if (!str) return;
        navigator.clipboard.writeText(str).then(() => {
            this.showToast(successMessage);
        }).catch(() => {
            // Fallback
            const el = document.createElement('textarea');
            el.value = str;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            this.showToast(successMessage);
        });
    }

    playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) {}
    }

    playSuccessChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.15, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.2);
            });
        } catch (e) {}
    }

    showToast(message) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    formatTime(dateStr) {
        try {
            const d = new Date(dateStr.replace(' ', 'T') + 'Z');
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'Ko', 'Mo', 'Go'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Autolinks URLs and Emails with easy 1-click copy buttons
    autolink(text) {
        // 1. Detect emails: name@example.com
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        text = text.replace(emailRegex, (email) => {
            return `<span class="inline-copyable"><a href="mailto:${email}" class="link-email">📧 ${email}</a><button type="button" class="btn-inline-copy" title="Copier l'email" onclick="window.openChatApp.copyText('${email}')">📋</button></span>`;
        });

        // 2. Detect links: https://...
        const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
        text = text.replace(urlRegex, (url) => {
            return `<span class="inline-copyable"><a href="${url}" target="_blank" rel="noopener">🔗 ${url}</a><button type="button" class="btn-inline-copy" title="Copier le lien" onclick="window.openChatApp.copyText('${url}')">📋</button></span>`;
        });

        return text;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.openChatApp = new OpenChatApp();
});
