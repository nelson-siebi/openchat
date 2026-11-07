/**
 * OpenChat - Client Application Logic
 * PWA + NelsiusPay Visual Style + Instant Public & Private Rooms
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
        this.setupClipboardAndDrop();
        this.setupLiveSync();
        this.fetchInitialMessages();
        this.renderRecentRoomsList();
    }

    // ==========================================
    // PWA REGISTRATION & INSTALLATION
    // ==========================================
    setupPWA() {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(() => console.log('OpenChat PWA: Service Worker actif'))
                    .catch((err) => console.log('OpenChat PWA: Erreur SW', err));
            });
        }

        // Capture BeforeInstallPrompt for custom Install Button
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
            recent = recent.slice(0, 10); // Keep last 10
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
                navigator.clipboard.writeText(window.location.href);
                this.showToast('Lien du salon copié dans le presse-papier !');
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
                });
            }

            qrModal.addEventListener('click', (e) => {
                if (e.target === qrModal) qrModal.style.display = 'none';
            });
        }

        // Textarea input & Send
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
    }

    setupModals() {
        // Create Private Room Modal
        const btnOpenCreate = document.getElementById('btnOpenCreateModal');
        const createModal = document.getElementById('createRoomModal');
        const createClose = document.getElementById('createRoomModalClose');
        const btnGen = document.getElementById('btnGenerateInstantRoom');
        const formCustom = document.getElementById('formCustomRoom');
        const customInput = document.getElementById('customRoomInput');

        if (btnOpenCreate && createModal) {
            btnOpenCreate.addEventListener('click', () => {
                createModal.style.display = 'flex';
            });

            if (createClose) {
                createClose.addEventListener('click', () => createModal.style.display = 'none');
            }

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

        // Join Room Modal
        const btnOpenJoin = document.getElementById('btnOpenJoinModal');
        const joinModal = document.getElementById('joinRoomModal');
        const joinClose = document.getElementById('joinRoomModalClose');
        const formJoin = document.getElementById('formJoinRoomCode');
        const joinInput = document.getElementById('joinRoomInput');

        if (btnOpenJoin && joinModal) {
            btnOpenJoin.addEventListener('click', () => {
                joinModal.style.display = 'flex';
            });

            if (joinClose) {
                joinClose.addEventListener('click', () => joinModal.style.display = 'none');
            }

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
        if (!qrContainer) return;

        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: window.location.href,
                width: 200,
                height: 200,
                colorDark: '#020617',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } else {
            qrContainer.innerHTML = `<a href="${window.location.href}" target="_blank">${window.location.href}</a>`;
        }
    }

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

        // Paste image directly from clipboard (Ctrl + V)
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

    async uploadAndSendFile(file, customName = null) {
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
                        type: data.type,
                        file_url: data.file_url,
                        file_name: data.file_name,
                        file_size: data.file_size
                    })
                });
                this.showToast('Fichier partagé !');
            } else {
                alert(data.error || 'Erreur lors du téléversement.');
            }
        } catch (e) {
            this.showToast('Erreur lors de l\'envoi du fichier.');
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
        } else if (msg.type === 'file' && msg.file_url) {
            contentHtml = `
                <a href="${this.escapeHtml(msg.file_url)}" target="_blank" download class="file-attachment">
                    <span class="file-icon">📁</span>
                    <div class="file-info">
                        <div class="file-name">${this.escapeHtml(msg.file_name || 'Fichier')}</div>
                        <div class="file-size">${this.formatBytes(msg.file_size)} • Backblaze B2</div>
                    </div>
                </a>
            `;
        } else if (msg.type === 'link') {
            contentHtml = `<a href="${this.escapeHtml(msg.content)}" target="_blank" rel="noopener">${this.escapeHtml(msg.content)}</a>`;
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
            <button class="copy-btn" title="Copier le texte">📋 Copier</button>
        `;

        const copyBtn = row.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const textToCopy = msg.file_url || msg.content;
                navigator.clipboard.writeText(textToCopy);
                this.showToast('Copié dans le presse-papier !');
            });
        }

        const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 90;
        container.appendChild(row);

        if (wasAtBottom || isMine) {
            this.scrollToBottom();
        }

        if (notify && !isMine && this.soundEnabled) {
            this.playNotificationSound();
        }
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
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
        }, 3000);
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

    autolink(text) {
        const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.openChatApp = new OpenChatApp();
});
