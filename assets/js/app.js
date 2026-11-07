/**
 * OpenChat - Client Application Logic
 * PWA + Voice Notes + Browser Notifications + Animated Stickers + File Direct Download + Robust Copy
 */

class OpenChatApp {
    constructor() {
        this.roomCode = this.getParam('code') || 'public';
        this.username = localStorage.getItem('openchat_username') || this.generateDefaultUsername();
        this.lastMessageId = 0;
        this.seenMessageIds = new Set();
        this.messagesById = new Map();
        this.eventSource = null;
        this.pollTimer = null;
        this.soundEnabled = localStorage.getItem('openchat_sound') !== 'false';
        this.deferredInstallPrompt = null;

        // Contextual state: Reply & Media Caption
        this.pendingReply = null;
        this.pendingFile = null;

        // Voice recording state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordStartTime = 0;
        this.recordTimerInterval = null;

        // QR Pairing state
        this.currentPairToken = null;

        // Context Menu & Interaction state
        this.activeContextMenuMsg = null;
        this.lastTapTime = 0;
        this.lastTapBubbleId = null;
        this.longPressTimer = null;
        this.isLongPress = false;
        this.touchStartX = 0;
        this.touchStartY = 0;

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
        this.setupNotifications();
        this.setupSidebar();
        this.setupUI();
        this.setupModals();
        this.setupContextMenu();
        this.setupEmojiPicker();
        this.setupVoiceRecording();
        this.setupClipboardAndDrop();
        this.setupSmartScroll();
        this.setupDelegatedEvents();
        this.setupLiveSync();
        this.fetchInitialMessages();
        this.renderRecentRoomsList();
        this.checkInitialPairing();
    }

    // ==========================================
    // NOTIFICATIONS NAVIGATEUR
    // ==========================================
    setupNotifications() {
        const banner = document.getElementById('notificationBanner');
        const btnAllow = document.getElementById('btnAllowNotifications');
        const btnDismiss = document.getElementById('btnDismissNotifications');

        if ('Notification' in window) {
            if (Notification.permission === 'default' && banner) {
                banner.style.display = 'flex';
            }

            if (btnAllow) {
                btnAllow.addEventListener('click', async () => {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        if (banner) banner.style.display = 'none';
                        this.showToast('Notifications activées !');
                    } else {
                        if (banner) banner.style.display = 'none';
                    }
                });
            }

            if (btnDismiss) {
                btnDismiss.addEventListener('click', () => {
                    if (banner) banner.style.display = 'none';
                });
            }
        }
    }

    sendBrowserNotification(sender, text) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        if (!document.hidden) return;

        try {
            const title = `${sender} (OpenChat)`;
            const options = {
                body: text || 'Nouveau fichier ou message',
                icon: 'assets/icons/icon.svg',
                badge: 'assets/icons/icon.svg',
                tag: 'openchat-msg'
            };
            const notif = new Notification(title, options);
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        } catch (e) {}
    }

    // ==========================================
    // QR INSTANT PAIRING HANDSHAKE
    // ==========================================
    checkInitialPairing() {
        const pairedToken = this.getParam('paired');
        if (pairedToken) {
            const url = new URL(window.location);
            url.searchParams.delete('paired');
            window.history.replaceState({}, '', url);

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

        // Context bar cancel
        const btnCancelCtx = document.getElementById('btnCancelContext');
        if (btnCancelCtx) {
            btnCancelCtx.addEventListener('click', () => {
                this.clearActiveContext();
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
                    this.setPendingFile(e.target.files[0]);
                    fileInput.value = '';
                }
            });
        }

        // Mobile virtual keyboard resize
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.scrollToBottom();
            });
        }
    }

    setPendingFile(file) {
        this.pendingFile = file;
        const ctxBar = document.getElementById('activeContextBar');
        const ctxInfo = document.getElementById('activeContextInfo');
        const msgInput = document.getElementById('messageInput');

        if (ctxBar && ctxInfo) {
            ctxInfo.innerHTML = `📎 <strong>Fichier joint :</strong> ${this.escapeHtml(file.name)} (${this.formatBytes(file.size)})`;
            ctxBar.style.display = 'flex';
        }
        if (msgInput) {
            msgInput.placeholder = 'Ajoutez une description/légende et appuyez sur Envoyer...';
            msgInput.focus();
        }
    }

    setPendingReply(messageId, sender, content) {
        this.pendingReply = { id: messageId, sender, content };
        const ctxBar = document.getElementById('activeContextBar');
        const ctxInfo = document.getElementById('activeContextInfo');
        const msgInput = document.getElementById('messageInput');

        if (ctxBar && ctxInfo) {
            ctxInfo.innerHTML = `↩️ <strong>Réponse à ${this.escapeHtml(sender)} :</strong> <span style="opacity: 0.8;">« ${this.escapeHtml(content.substring(0, 60))}... »</span>`;
            ctxBar.style.display = 'flex';
        }
        if (msgInput) {
            msgInput.focus();
        }
    }

    clearActiveContext() {
        this.pendingReply = null;
        this.pendingFile = null;
        const ctxBar = document.getElementById('activeContextBar');
        const msgInput = document.getElementById('messageInput');
        if (ctxBar) ctxBar.style.display = 'none';
        if (msgInput) msgInput.placeholder = 'Écrivez un message, collez un email ou une image (Ctrl+V)...';
    }

    // ==========================================
    // EMOJI & ANIMATED STICKERS PICKER (WHATSAPP STYLE)
    // ==========================================
    setupEmojiPicker() {
        const btnEmoji = document.getElementById('btnToggleEmoji');
        const popover = document.getElementById('emojiPopover');
        if (!btnEmoji || !popover) return;

        const emojis = [
            '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😜', '😎', '🥳', '🤔', '🤫',
            '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👊', '👌', '❤️', '🧡', '💛',
            '💚', '💙', '💜', '🖤', '💔', '🔥', '✨', '💥', '💯', '🚀', '🎉', '🎁',
            '👀', '👋', '🌟', '⚡', '☕', '💡', '📌', '🔒', '📱', '💻', '✉️', '📎'
        ];

        const animatedStickers = [
            { name: 'Cœur Battant', file: 'assets/stickers/heart_beat.svg' },
            { name: 'Mort de Rire', file: 'assets/stickers/laugh_tears.svg' },
            { name: 'En Feu', file: 'assets/stickers/fire_blast.svg' },
            { name: 'Fête & Confettis', file: 'assets/stickers/party_popper.svg' },
            { name: 'Super Pouce', file: 'assets/stickers/thumbs_up.svg' },
            { name: 'Fusée Décollage', file: 'assets/stickers/rocket_blast.svg' }
        ];

        popover.innerHTML = `
            <div class="emoji-popover-tabs">
                <button type="button" class="emoji-tab-btn active" data-tab="stickers">✨ Stickers Animés</button>
                <button type="button" class="emoji-tab-btn" data-tab="emojis">😀 Emojis</button>
            </div>
            <div id="tabContentStickers" class="stickers-grid">
                ${animatedStickers.map(st => `
                    <button type="button" class="sticker-item-btn" data-sticker-url="${st.file}" title="${st.name}">
                        <img src="${st.file}" class="sticker-item-img" alt="${st.name}" />
                    </button>
                `).join('')}
            </div>
            <div id="tabContentEmojis" class="emoji-grid" style="display: none;">
                ${emojis.map(em => `<button type="button" class="emoji-btn">${em}</button>`).join('')}
            </div>
        `;

        // Tab Switching
        popover.querySelectorAll('.emoji-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                popover.querySelectorAll('.emoji-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetTab = btn.dataset.tab;
                const tabStickers = document.getElementById('tabContentStickers');
                const tabEmojis = document.getElementById('tabContentEmojis');

                if (targetTab === 'stickers') {
                    tabStickers.style.display = 'grid';
                    tabEmojis.style.display = 'none';
                } else {
                    tabStickers.style.display = 'none';
                    tabEmojis.style.display = 'grid';
                }
            });
        });

        // Click on animated sticker: sends immediately like WhatsApp
        popover.addEventListener('click', (e) => {
            const stickerBtn = e.target.closest('.sticker-item-btn');
            if (stickerBtn) {
                const url = stickerBtn.dataset.stickerUrl;
                this.sendSticker(url);
                popover.style.display = 'none';
                return;
            }

            if (e.target.classList.contains('emoji-btn')) {
                const em = e.target.textContent;
                const msgInput = document.getElementById('messageInput');
                if (msgInput) {
                    const start = msgInput.selectionStart;
                    const end = msgInput.selectionEnd;
                    msgInput.value = msgInput.value.substring(0, start) + em + msgInput.value.substring(end);
                    msgInput.focus();
                    msgInput.selectionStart = msgInput.selectionEnd = start + em.length;
                }
            }
        });

        btnEmoji.addEventListener('click', (e) => {
            e.stopPropagation();
            popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
        });

        document.addEventListener('click', (e) => {
            if (!popover.contains(e.target) && e.target !== btnEmoji) {
                popover.style.display = 'none';
            }
        });
    }

    async sendSticker(stickerUrl) {
        try {
            const res = await fetch('api/messages.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_code: this.roomCode,
                    sender: this.username,
                    content: 'Sticker',
                    type: 'sticker',
                    file_url: stickerUrl
                })
            });
            const data = await res.json();
            if (data.success && data.message) {
                this.appendMessage(data.message);
            }
        } catch (e) {
            this.showToast('Erreur d\'envoi du sticker.');
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

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                this.stopVoiceRecording();
                this.audioChunks = [];
            });
        }

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
                this.setPendingFile(e.dataTransfer.files[0]);
            }
        });

        window.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob) {
                        this.setPendingFile(blob);
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

    // ==========================================
    // DELEGATED EVENTS: COPY, DOWNLOAD, LONG-PRESS, DOUBLE-TAP
    // ==========================================
    setupDelegatedEvents() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        // 1. Direct clicks on download, inline copy, reactions, more options, and double-tap
        container.addEventListener('click', (e) => {
            // Direct File Download Handler
            const downloadBtn = e.target.closest('[data-download-url]');
            if (downloadBtn) {
                e.preventDefault();
                const url = downloadBtn.dataset.downloadUrl;
                const name = downloadBtn.dataset.downloadName || 'fichier';
                this.forceDownload(url, name);
                return;
            }

            // Inline Copy Button
            const inlineCopyBtn = e.target.closest('[data-copy-text]');
            if (inlineCopyBtn) {
                e.preventDefault();
                this.copyText(inlineCopyBtn.dataset.copyText);
                return;
            }

            // Reaction Pill on bubble edge (Click to toggle/react)
            const reactBtn = e.target.closest('[data-react-id]');
            if (reactBtn) {
                e.preventDefault();
                const msgId = parseInt(reactBtn.dataset.reactId, 10);
                const emoji = reactBtn.dataset.reactEmoji || '❤️';
                this.reactToMessage(msgId, emoji);
                return;
            }

            // More Options Button (···)
            const moreBtn = e.target.closest('[data-more-id]');
            if (moreBtn) {
                e.preventDefault();
                const msgId = parseInt(moreBtn.dataset.moreId, 10);
                const row = moreBtn.closest('.message-row');
                const bubble = row ? row.querySelector('.message-bubble') : null;
                const rect = moreBtn.getBoundingClientRect();
                this.openContextMenu(msgId, bubble, rect.left, rect.top);
                return;
            }

            // Double Tap / Double Click Detection on Bubble
            const bubble = e.target.closest('.message-bubble');
            if (bubble) {
                // If user interacted with an interactive child, ignore
                if (e.target.closest('a, button, audio, video, input')) return;

                const msgId = parseInt(bubble.dataset.msgId, 10);
                const now = Date.now();
                if (this.lastTapBubbleId === msgId && (now - this.lastTapTime) < 320) {
                    this.handleBubbleDoubleTap(bubble, msgId);
                    this.lastTapTime = 0;
                    this.lastTapBubbleId = null;
                } else {
                    this.lastTapTime = now;
                    this.lastTapBubbleId = msgId;
                }
            }
        });

        // 2. Desktop Right-Click (Context Menu)
        container.addEventListener('contextmenu', (e) => {
            const bubble = e.target.closest('.message-bubble');
            if (bubble) {
                e.preventDefault();
                const msgId = parseInt(bubble.dataset.msgId, 10);
                this.openContextMenu(msgId, bubble, e.clientX, e.clientY);
            }
        });

        // 3. Mobile Touch & Long-Press Handling (~380ms hold)
        container.addEventListener('touchstart', (e) => {
            const bubble = e.target.closest('.message-bubble');
            if (!bubble || e.touches.length > 1) return;
            if (e.target.closest('a, button, audio, video, input')) return;

            const msgId = parseInt(bubble.dataset.msgId, 10);
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.isLongPress = false;

            bubble.classList.add('is-pressing');

            if (this.longPressTimer) clearTimeout(this.longPressTimer);
            this.longPressTimer = setTimeout(() => {
                this.isLongPress = true;
                bubble.classList.remove('is-pressing');
                if (navigator.vibrate) {
                    try { navigator.vibrate(30); } catch (err) {}
                }
                this.openContextMenu(msgId, bubble, touch.clientX, touch.clientY);
            }, 380);
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!this.longPressTimer) return;
            const touch = e.touches[0];
            const dist = Math.hypot(touch.clientX - this.touchStartX, touch.clientY - this.touchStartY);
            if (dist > 10) {
                // Scrolling cancels long-press
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                const pressing = container.querySelector('.message-bubble.is-pressing');
                if (pressing) pressing.classList.remove('is-pressing');
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            const pressing = container.querySelector('.message-bubble.is-pressing');
            if (pressing) pressing.classList.remove('is-pressing');

            if (this.isLongPress) {
                this.isLongPress = false;
                if (e.cancelable) e.preventDefault();
            }
        });

        container.addEventListener('touchcancel', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            const pressing = container.querySelector('.message-bubble.is-pressing');
            if (pressing) pressing.classList.remove('is-pressing');
            this.isLongPress = false;
        });
    }

    // ==========================================
    // FLOATING CONTEXT MENU (ACTIONS & QUICK REACTIONS)
    // ==========================================
    setupContextMenu() {
        const backdrop = document.getElementById('messageContextMenuBackdrop');
        const menu = document.getElementById('messageContextMenu');
        const replyBtn = document.getElementById('ctxBtnReply');
        const copyBtn = document.getElementById('ctxBtnCopy');
        const dlBtn = document.getElementById('ctxBtnDownload');

        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeContextMenu();
                }
            });
        }

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu && menu.style.display !== 'none') {
                this.closeContextMenu();
            }
        });

        // Quick reactions inside context menu
        if (menu) {
            menu.querySelectorAll('.reaction-quick-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const emoji = btn.dataset.emoji;
                    if (this.activeContextMenuMsg && emoji) {
                        this.reactToMessage(this.activeContextMenuMsg.id, emoji);
                    }
                    this.closeContextMenu();
                });
            });
        }

        if (replyBtn) {
            replyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.activeContextMenuMsg) {
                    const m = this.activeContextMenuMsg;
                    this.setPendingReply(m.id, m.sender, m.content);
                }
                this.closeContextMenu();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.activeContextMenuMsg) {
                    const m = this.activeContextMenuMsg;
                    this.copyText(m.file_url || m.content);
                }
                this.closeContextMenu();
            });
        }

        if (dlBtn) {
            dlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.activeContextMenuMsg && this.activeContextMenuMsg.file_url) {
                    const m = this.activeContextMenuMsg;
                    this.forceDownload(m.file_url, m.file_name || 'fichier');
                }
                this.closeContextMenu();
            });
        }
    }

    openContextMenu(msgId, targetBubble, clickX = null, clickY = null) {
        const msg = this.messagesById.get(parseInt(msgId, 10));
        if (!msg) return;

        this.activeContextMenuMsg = msg;
        const menu = document.getElementById('messageContextMenu');
        const backdrop = document.getElementById('messageContextMenuBackdrop');
        if (!menu || !backdrop) return;

        const dlBtn = document.getElementById('ctxBtnDownload');
        const copyBtnText = document.getElementById('ctxBtnCopyText');

        if (dlBtn) {
            dlBtn.style.display = msg.file_url ? 'flex' : 'none';
        }

        if (copyBtnText) {
            if (msg.type === 'file') copyBtnText.textContent = 'Copier le lien';
            else if (msg.type === 'link') copyBtnText.textContent = 'Copier le lien';
            else copyBtnText.textContent = 'Copier le texte';
        }

        backdrop.style.display = 'block';
        menu.style.display = 'flex';

        // Highlight active bubble
        document.querySelectorAll('.message-bubble.context-active').forEach(b => b.classList.remove('context-active'));
        if (targetBubble) {
            targetBubble.classList.add('context-active');
        }

        // Viewport-safe dynamic positioning
        const bubbleRect = targetBubble ? targetBubble.getBoundingClientRect() : null;
        const menuWidth = Math.min(270, window.innerWidth - 32);
        const menuHeight = menu.offsetHeight || 190;

        let left = 16;
        let top = 100;

        if (bubbleRect) {
            left = bubbleRect.left + (bubbleRect.width / 2) - (menuWidth / 2);
            if (left < 16) left = 16;
            if (left + menuWidth > window.innerWidth - 16) {
                left = window.innerWidth - menuWidth - 16;
            }

            // Prefer placing directly above bubble; if too close to top bar, place below
            top = bubbleRect.top - menuHeight - 14;
            if (top < 70) {
                top = bubbleRect.bottom + 14;
            }
            if (top + menuHeight > window.innerHeight - 20) {
                top = window.innerHeight - menuHeight - 20;
            }
        } else if (clickX !== null && clickY !== null) {
            left = Math.max(16, Math.min(clickX - (menuWidth / 2), window.innerWidth - menuWidth - 16));
            top = Math.max(70, Math.min(clickY - menuHeight - 10, window.innerHeight - menuHeight - 20));
        }

        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
    }

    closeContextMenu() {
        const menu = document.getElementById('messageContextMenu');
        const backdrop = document.getElementById('messageContextMenuBackdrop');
        if (backdrop) backdrop.style.display = 'none';
        if (menu) menu.style.display = 'none';
        document.querySelectorAll('.message-bubble.context-active').forEach(b => b.classList.remove('context-active'));
        this.activeContextMenuMsg = null;
    }

    handleBubbleDoubleTap(bubbleEl, msgId) {
        if (!bubbleEl) return;

        // Visual popping heart animation
        const heart = document.createElement('div');
        heart.className = 'heart-pop';
        heart.textContent = '❤️';
        bubbleEl.appendChild(heart);
        setTimeout(() => heart.remove(), 800);

        if (navigator.vibrate) {
            try { navigator.vibrate(30); } catch (e) {}
        }

        this.reactToMessage(msgId, '❤️');
    }

    // ==========================================
    // DIRECT FORCED FILE DOWNLOAD (CROSS-ORIGIN SAFE)
    // ==========================================
    async forceDownload(url, fileName) {
        this.showToast('Téléchargement en cours...');

        try {
            // Attempt same-origin blob download
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = fileName || 'fichier';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            }, 2000);

            this.showToast('Téléchargement terminé !');
        } catch (err) {
            // Fallback to server download proxy header
            window.location.href = `api/download.php?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`;
        }
    }

    // ==========================================
    // SENDING MESSAGES & FILES
    // ==========================================
    async sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;

        const content = input.value.trim();

        if (this.pendingFile) {
            const fileToSend = this.pendingFile;
            this.clearActiveContext();
            input.value = '';
            input.style.height = 'auto';
            await this.uploadAndSendFile(fileToSend, null, null, content);
            return;
        }

        if (!content) return;

        input.value = '';
        input.style.height = 'auto';

        const payload = {
            room_code: this.roomCode,
            sender: this.username,
            content: content
        };

        if (this.pendingReply) {
            payload.reply_to_id = this.pendingReply.id;
            payload.reply_to_sender = this.pendingReply.sender;
            payload.reply_to_content = this.pendingReply.content;
            this.clearActiveContext();
        }

        try {
            const res = await fetch('api/messages.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success && data.message) {
                this.appendMessage(data.message);
            }
        } catch (e) {
            this.showToast('Erreur d\'envoi du message.');
        }
    }

    async uploadAndSendFile(file, customName = null, forceType = null, captionText = '') {
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
                const payload = {
                    room_code: this.roomCode,
                    sender: this.username,
                    content: captionText || data.file_name,
                    type: forceType || data.type,
                    file_url: data.file_url,
                    file_name: data.file_name,
                    file_size: data.file_size
                };

                if (this.pendingReply) {
                    payload.reply_to_id = this.pendingReply.id;
                    payload.reply_to_sender = this.pendingReply.sender;
                    payload.reply_to_content = this.pendingReply.content;
                    this.clearActiveContext();
                }

                await fetch('api/messages.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                this.showToast('Élément envoyé !');
            } else {
                alert(data.error || 'Erreur lors du téléversement.');
            }
        } catch (e) {
            this.showToast('Erreur lors de l\'envoi.');
        }
    }

    async reactToMessage(messageId, emoji) {
        try {
            const res = await fetch('api/messages.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'react',
                    message_id: messageId,
                    emoji: emoji
                })
            });
            const data = await res.json();
            if (data.success) {
                this.updateReactionsUI(messageId, data.reactions);
            }
        } catch (e) {}
    }

    updateReactionsUI(messageId, reactions) {
        const row = document.querySelector(`.message-row[data-msg-id="${messageId}"]`);
        if (!row) return;

        let container = row.querySelector('.reactions-container');
        if (!container) {
            const bubble = row.querySelector('.message-bubble');
            if (!bubble) return;
            container = document.createElement('div');
            container.className = 'reactions-container';
            bubble.appendChild(container);
        }

        container.innerHTML = '';
        let totalReactions = 0;
        for (const [emoji, count] of Object.entries(reactions)) {
            if (count > 0) {
                totalReactions += count;
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'reaction-pill';
                pill.setAttribute('data-react-id', messageId);
                pill.setAttribute('data-react-emoji', emoji);
                pill.innerHTML = `<span>${emoji}</span> <span class="count">${count}</span>`;
                container.appendChild(pill);
            }
        }

        if (totalReactions > 0) {
            row.classList.add('has-reactions');
        } else {
            row.classList.remove('has-reactions');
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
        this.messagesById.set(parseInt(msg.id, 10), msg);
        this.lastMessageId = Math.max(this.lastMessageId, parseInt(msg.id, 10));

        // CHECK FOR QR PAIRING NOTIFICATION
        if (msg.type === 'peer_joined') {
            const qrModal = document.getElementById('qrModal');
            if (this.currentPairToken && msg.content === this.currentPairToken) {
                if (qrModal) qrModal.style.display = 'none';
                this.currentPairToken = null;
                this.showToast('🎉 Nouvel appareil connecté avec succès !');
                this.playSuccessChime();
            }

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
        const isSticker = msg.type === 'sticker';
        row.className = `message-row ${isMine ? 'mine' : 'theirs'} ${isSticker ? 'sticker' : ''}`;
        row.setAttribute('data-msg-id', msg.id);

        const timeStr = this.formatTime(msg.created_at);

        // Reply quote block
        let replyHtml = '';
        if (msg.reply_to_id && msg.reply_to_sender) {
            replyHtml = `
                <div class="reply-quote">
                    <div class="reply-quote-sender">↩️ ${this.escapeHtml(msg.reply_to_sender)}</div>
                    <div class="reply-quote-text">${this.escapeHtml(msg.reply_to_content || '')}</div>
                </div>
            `;
        }

        let contentHtml = '';
        if (isSticker && msg.file_url) {
            // Floating WhatsApp-style animated sticker
            contentHtml = `
                <img src="${this.escapeHtml(msg.file_url)}" class="sticker-img" alt="Sticker" loading="lazy" />
            `;
        } else if (msg.type === 'image' && msg.file_url) {
            const hasCaption = msg.content && msg.content !== msg.file_name;
            contentHtml = `
                <a href="${this.escapeHtml(msg.file_url)}" target="_blank" rel="noopener">
                    <img src="${this.escapeHtml(msg.file_url)}" class="message-image" alt="Image" loading="lazy" />
                </a>
                ${hasCaption ? `<div class="message-caption">${this.autolink(this.escapeHtml(msg.content))}</div>` : ''}
            `;
        } else if (msg.type === 'video' && msg.file_url) {
            const hasCaption = msg.content && msg.content !== msg.file_name;
            contentHtml = `
                <video src="${this.escapeHtml(msg.file_url)}" controls class="message-video" preload="metadata"></video>
                ${hasCaption ? `<div class="message-caption">${this.autolink(this.escapeHtml(msg.content))}</div>` : ''}
            `;
        } else if (msg.type === 'audio' && msg.file_url) {
            contentHtml = this.renderAudioPlayer(msg.file_url);
        } else if (msg.type === 'file' && msg.file_url) {
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
                        <button type="button" class="file-btn file-btn-primary" data-download-url="${this.escapeHtml(msg.file_url)}" data-download-name="${this.escapeHtml(msg.file_name || 'fichier')}">
                            ⬇️ Télécharger
                        </button>
                    </div>
                </div>
            `;
        } else if (msg.type === 'link') {
            contentHtml = `
                <span class="inline-copyable">
                    <a href="${this.escapeHtml(msg.content)}" target="_blank" rel="noopener">${this.escapeHtml(msg.content)}</a>
                    <button type="button" class="btn-inline-copy" title="Copier le lien" data-copy-text="${this.escapeHtml(msg.content)}">📋</button>
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
            <div class="message-bubble-wrapper">
                <div class="message-bubble" data-msg-id="${msg.id}">
                    ${replyHtml}
                    ${contentHtml}
                    <div class="reactions-container"></div>
                </div>
                <button type="button" class="btn-msg-more" data-more-id="${msg.id}" title="Plus d'options">···</button>
            </div>
        `;

        const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 90;
        container.appendChild(row);

        // Render initial reactions if any
        if (msg.reactions) {
            try {
                const rx = JSON.parse(msg.reactions);
                this.updateReactionsUI(msg.id, rx);
            } catch (e) {}
        }

        if (msg.type === 'audio') {
            this.initAudioPlayer(row);
        }

        if (wasAtBottom || isMine) {
            this.scrollToBottom();
        }

        if (notify && !isMine) {
            if (this.soundEnabled) this.playNotificationSound();
            this.sendBrowserNotification(msg.sender, msg.content);
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

    // ==========================================
    // ROBUST CLIPBOARD COPY
    // ==========================================
    copyText(str, successMessage = 'Copié dans le presse-papier !') {
        if (!str) return;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(str).then(() => {
                this.showToast(successMessage);
            }).catch(() => {
                this.fallbackCopy(str, successMessage);
            });
        } else {
            this.fallbackCopy(str, successMessage);
        }
    }

    fallbackCopy(str, successMessage) {
        try {
            const el = document.createElement('textarea');
            el.value = str;
            el.setAttribute('readonly', '');
            el.style.position = 'fixed';
            el.style.left = '-9999px';
            el.style.top = '0';
            document.body.appendChild(el);
            el.select();
            el.setSelectionRange(0, 99999);
            const successful = document.execCommand('copy');
            document.body.removeChild(el);
            if (successful) {
                this.showToast(successMessage);
            } else {
                this.showToast('Impossible de copier automatiquement.');
            }
        } catch (e) {
            this.showToast('Erreur de copie.');
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

    autolink(text) {
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        text = text.replace(emailRegex, (email) => {
            return `<span class="inline-copyable"><a href="mailto:${email}" class="link-email">📧 ${email}</a><button type="button" class="btn-inline-copy" title="Copier l'email" data-copy-text="${email}">📋</button></span>`;
        });

        const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
        text = text.replace(urlRegex, (url) => {
            return `<span class="inline-copyable"><a href="${url}" target="_blank" rel="noopener">🔗 ${url}</a><button type="button" class="btn-inline-copy" title="Copier le lien" data-copy-text="${url}">📋</button></span>`;
        });

        return text;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.openChatApp = new OpenChatApp();
});
