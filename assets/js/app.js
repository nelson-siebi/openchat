/**
 * OpenChat - Client Application Logic
 */

class OpenChatApp {
    constructor() {
        this.roomCode = this.getParam('code') || '';
        this.username = localStorage.getItem('openchat_username') || this.generateDefaultUsername();
        this.lastMessageId = 0;
        this.seenMessageIds = new Set();
        this.eventSource = null;
        this.pollTimer = null;
        this.soundEnabled = localStorage.getItem('openchat_sound') !== 'false';

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
        // Handle landing page vs room page
        if (document.getElementById('chatMessages')) {
            this.initRoomPage();
        } else if (document.getElementById('btnCreateRoom')) {
            this.initLandingPage();
        }
    }

    // ==========================================
    // LANDING PAGE LOGIC
    // ==========================================
    initLandingPage() {
        const btnCreate = document.getElementById('btnCreateRoom');
        const inputCustom = document.getElementById('inputRoomCode');
        const formJoin = document.getElementById('formJoinRoom');

        if (btnCreate) {
            btnCreate.addEventListener('click', async () => {
                btnCreate.disabled = true;
                btnCreate.textContent = 'Création du salon...';
                try {
                    const res = await fetch('api/rooms.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });
                    const data = await res.json();
                    if (data.success && data.room) {
                        window.location.href = `room.php?code=${encodeURIComponent(data.room.code)}`;
                    } else {
                        alert(data.error || 'Erreur lors de la création');
                        btnCreate.disabled = false;
                        btnCreate.textContent = '🚀 Créer un salon instantané';
                    }
                } catch (e) {
                    alert('Erreur réseau.');
                    btnCreate.disabled = false;
                    btnCreate.textContent = '🚀 Créer un salon instantané';
                }
            });
        }

        if (formJoin) {
            formJoin.addEventListener('submit', (e) => {
                e.preventDefault();
                const code = inputCustom.value.trim().toLowerCase();
                if (code) {
                    window.location.href = `room.php?code=${encodeURIComponent(code)}`;
                }
            });
        }
    }

    // ==========================================
    // ROOM PAGE LOGIC
    // ==========================================
    initRoomPage() {
        if (!this.roomCode) {
            window.location.href = 'index.php';
            return;
        }

        this.setupUI();
        this.setupClipboardAndDrop();
        this.setupLiveSync();
        this.fetchInitialMessages();
    }

    setupUI() {
        // Nickname display & edit
        const nickDisplay = document.getElementById('userNickname');
        if (nickDisplay) {
            nickDisplay.textContent = this.username;
            nickDisplay.addEventListener('click', () => {
                const newName = prompt('Changer votre pseudo :', this.username);
                if (newName && newName.trim()) {
                    this.username = newName.trim().substring(0, 30);
                    localStorage.setItem('openchat_username', this.username);
                    nickDisplay.textContent = this.username;
                    this.showToast(`Pseudo changé en : ${this.username}`);
                }
            });
        }

        // Room code display
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = this.roomCode;
        }

        // QR Code Modal Trigger
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

        // Share link copy button
        const btnCopyLink = document.getElementById('btnCopyShareLink');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                navigator.clipboard.writeText(window.location.href);
                this.showToast('Lien du salon copié dans le presse-papier !');
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
                this.showToast(this.soundEnabled ? 'Son activé' : 'Son désactivé');
            });
        }

        // Message input handling
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
            // Auto expand textarea height
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

    renderQRCode() {
        const qrContainer = document.getElementById('qrCodeContainer');
        if (!qrContainer) return;

        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: window.location.href,
                width: 200,
                height: 200,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } else {
            qrContainer.innerHTML = `<a href="${window.location.href}" target="_blank">${window.location.href}</a>`;
        }
    }

    setupClipboardAndDrop() {
        // Drag & Drop anywhere on screen
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
        this.showToast(`Envoi de ${customName || file.name}...`);

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
                this.showToast('Fichier envoyé !');
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
            console.error('Initial fetch failed', e);
        }
    }

    setupLiveSync() {
        // SSE implementation with reconnect & fallback
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
            } catch (err) {
                console.error('SSE parse error', err);
            }
        });

        this.eventSource.addEventListener('reconnect', (e) => {
            this.connectSSE();
        });

        this.eventSource.onerror = () => {
            this.eventSource.close();
            // Try reconnect after 2 seconds or fallback to polling
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
                        <div class="file-size">${this.formatBytes(msg.file_size)}</div>
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

        // Copy button event
        const copyBtn = row.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const textToCopy = msg.file_url || msg.content;
                navigator.clipboard.writeText(textToCopy);
                this.showToast('Copié dans le presse-papier !');
            });
        }

        const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 80;
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
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
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

// Instantiate on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.openChatApp = new OpenChatApp();
});
