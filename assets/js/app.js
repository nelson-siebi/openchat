/**
 * OpenChat — application (UI, rendering, live sync, composer, sharing)
 */
(function () {
    'use strict';

    const OC = window.OC;
    const { U, $, $$, icon, store, toast, api } = OC;
    const CFG = OC.cfg;

    const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥'];

    const STICKERS = [
        { name: 'Cœur battant', file: 'assets/stickers/heart_beat.svg' },
        { name: 'Mort de rire', file: 'assets/stickers/laugh_tears.svg' },
        { name: 'En feu', file: 'assets/stickers/fire_blast.svg' },
        { name: 'Fête', file: 'assets/stickers/party_popper.svg' },
        { name: 'Super pouce', file: 'assets/stickers/thumbs_up.svg' },
        { name: 'Fusée', file: 'assets/stickers/rocket_blast.svg' }
    ];

    const EMOJI_CATS = [
        { id: 'smileys', tab: '😀', title: 'Smileys', list: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾' },
        { id: 'gestures', tab: '👍', title: 'Gestes & personnes', list: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🧠 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 👷 🤴 👸 👰 🤵 🤰 🧑‍🍳 🧑‍🎓 🧑‍💻 🧑‍🎤 🧑‍🚀 🦸 🦹 🧙 🧚 🧛 💃 🕺 👯 🧘 🏃 🚶 👫 👬 👭 💏 💑 👪' },
        { id: 'hearts', tab: '❤️', title: 'Cœurs & symboles', list: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 🩷 🩵 🩶 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💌 💋 💯 💢 💥 💫 💦 💨 🕳️ 💬 🗨️ 💭 💤 ✨ ⭐ 🌟 ⚡ 🔥 🌈 ☀️ 🌙 ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ❗ ❓ ‼️ ⁉️ ⚠️ 🚫 ♻️ 🔞 🆗 🆕 🆒 🆓 🔝 🔜 🎵 🎶 💲 ™️ ©️ ®️' },
        { id: 'animals', tab: '🐶', title: 'Animaux & nature', list: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🐢 🐍 🦎 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🦏 🐪 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🐐 🦌 🐕 🐈 🐓 🦃 🦚 🦜 🦢 🕊️ 🐇 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍁 🍂 🍃 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌚 🌍 🌎 🌏 🪐 ☄️ 🌊 ❄️ ☃️ ⛄ 🌪️ ☔' },
        { id: 'food', tab: '🍕', title: 'Nourriture', list: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊' },
        { id: 'activities', tab: '⚽', title: 'Activités & objets', list: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🥊 🥋 ⛳ 🏹 🎣 🤿 🎽 🛹 ⛸️ 🥌 🎿 🏆 🥇 🥈 🥉 🏅 🎖️ 🎗️ 🎫 🎟️ 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🧩 🎁 🎀 🎊 🎉 🎈 🪅 🎏 🏮 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📸 📹 🎥 📞 ☎️ 📺 📻 ⏰ ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 💸 💵 💶 💳 💎 ⚖️ 🔧 🔨 🛠️ ⚙️ 🧲 🔫 💣 🔪 🛡️ 🔮 🧿 💈 🔭 🔬 💊 💉 🧬 🧪 🌡️ 🧹 🧺 🧻 🚽 🛁 🔑 🗝️ 🚪 🛋️ 🛏️ 🧸 🖼️ 🛍️ 🛒 ✉️ 📩 📦 📌 📍 📎 🖇️ 📏 ✂️ 🗑️ 🔒 🔓 📝 ✏️ 🔍 📚 📖 🗓️ 📅 📈 📉 📊 🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🛵 🏍️ 🚲 🛴 ✈️ 🚀 🛸 🚁 ⛵ 🚤 🚢 ⚓ 🗺️ 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🏕️ 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 ⛪ 🕌 🕍 ⛩️' }
    ].map((c) => ({ ...c, list: c.list.split(' ').filter(Boolean) }));

    const WALLPAPERS = ['default', 'doodle', 'aurora', 'sunset', 'midnight', 'oled'];

    // ==================================================================
    class App {
        constructor() {
            this.room = CFG.room || 'public';
            this.isPublic = !!CFG.isPublic;
            this.shareUrl = CFG.shareUrl || location.href;
            this.maxMb = CFG.maxFileMb || 25;
            this.maxBytes = this.maxMb * 1024 * 1024;
            this.baseTitle = document.title;

            this.username = store.get('openchat_username') || this.makeName();
            this.myNames = new Set(store.json('openchat_my_names', []));
            this.myNames.add(this.username);
            this.avatarColor = store.get('openchat_avatar_color', '#10b981');
            this.themePref = store.get('openchat_theme', 'auto');
            this.wallpaper = store.get('openchat_chat_theme', 'default');
            if (!WALLPAPERS.includes(this.wallpaper)) this.wallpaper = 'default';
            this.bubbleColor = store.get('openchat_bubble_color', '#059669');
            this.soundOn = store.get('openchat_sound') !== 'false';
            const es = store.get('openchat_enter_send');
            this.enterSend = es === null ? !U.isTouch : es === 'true';

            this.msgs = new Map();
            this.rows = new Map();
            this.pending = new Map();
            this.lastId = 0;
            this.oldestId = 0;
            this.hasMore = false;
            this.loadingOlder = false;
            this.sinceTs = '';
            this.reply = null;
            this.typingUsers = [];
            this.members = [];
            this.memberColors = new Map();
            this.online = 1;
            this.unread = 0;
            this.hiddenUnread = 0;
            this.stick = true;
            this.overlays = [];
            this.linkCache = new Map();
            this.retry = 0;
            this.connected = false;
            this.lastTypingSent = 0;
            this.typingSent = false;

            this.els = {
                app: $('#app'),
                chat: $('#chat'),
                scroll: $('#chatScroll'),
                inner: $('#chatScroll .chat-inner'),
                messages: $('#messages'),
                empty: $('#emptyState'),
                composer: $('#composer'),
                input: $('#messageInput'),
                action: $('#btnAction'),
                fab: $('#btnScrollBottom'),
                unreadBadge: $('#unreadBadge'),
                typingRow: $('#typingRow'),
                emoji: $('#emojiPanel'),
                attach: $('#attachMenu'),
                replyBar: $('#replyBar'),
                sidebar: $('#sidebar'),
                scrim: $('#sidebarScrim'),
                ctxBackdrop: $('#ctxBackdrop'),
                ctxMenu: $('#ctxMenu')
            };

            this.player = new OC.VoicePlayer();
            this.recorder = new OC.VoiceRecorder();
            this.sheet = new OC.MediaSheet(this);
            this.lightbox = new OC.Lightbox(this);

            this.init();
        }

        makeName() {
            const name = `Invité-${Math.floor(100 + Math.random() * 900)}`;
            store.set('openchat_username', name);
            return name;
        }

        isMine(m) {
            return this.myNames.has(m.sender);
        }

        colorOf(m) {
            const c = m && m._meta && m._meta.color;
            if (c && /^#[0-9a-f]{6}$/i.test(c)) return c;
            return this.colorOfName(m ? m.sender : '');
        }

        colorOfName(name) {
            if (this.myNames.has(name)) return this.avatarColor;
            const c = this.memberColors.get(name);
            return c && /^#[0-9a-f]{6}$/i.test(c) ? c : U.colorFor(name);
        }

        // ==============================================================
        // Init
        // ==============================================================
        init() {
            this.applyTheme();
            this.applyWallpaper();
            this.applyBubble();
            this.renderProfile();
            this.saveRecent();
            this.renderRecent();

            this.bindHistory();
            this.bindLayout();
            this.bindHeader();
            this.bindModals();
            this.bindSettings();
            this.bindRoomForms();
            this.bindComposer();
            this.bindEmoji();
            this.bindAttach();
            this.bindVoice();
            this.bindMessages();
            this.bindContextMenu();
            this.bindScroll();
            this.bindDrop();
            this.bindVisibility();
            this.setupPWA();
            this.setupNotifBanner();
            this.restoreDraft();
            this.updateActionMode();

            this.loadInitial().then(() => {
                this.connect();
                this.handleIncomingShare();
            });
            this.startPresence();
            this.checkPairing();
            this.handleUrlActions();
        }

        // ==============================================================
        // History-aware overlays (Android back button closes them)
        // ==============================================================
        bindHistory() {
            window.addEventListener('popstate', () => {
                const o = this.overlays.pop();
                if (o) {
                    o.close();
                    if (o.resolve) o.resolve();
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                const top = this.overlays[this.overlays.length - 1];
                if (top) {
                    e.preventDefault();
                    this.closeOverlay(top.name);
                } else if (!this.els.emoji.hidden) {
                    this.toggleEmoji(false);
                } else if (this.reply) {
                    this.clearReply();
                }
            });
        }

        pushOverlay(name, close, { replaceTop = false } = {}) {
            const entry = { name, close };
            if (replaceTop && this.overlays.length) {
                const old = this.overlays.pop();
                old.close();
                this.overlays.push(entry);
                try { history.replaceState({ ocOverlay: name }, ''); } catch (e) { /* ignore */ }
                return;
            }
            this.overlays.push(entry);
            try { history.pushState({ ocOverlay: name }, ''); } catch (e) { /* ignore */ }
        }

        closeOverlay(name) {
            return new Promise((resolve) => {
                const idx = this.overlays.map((o) => o.name).lastIndexOf(name);
                if (idx === -1) {
                    resolve();
                    return;
                }
                const isTop = idx === this.overlays.length - 1;
                const entry = this.overlays[idx];
                if (isTop && history.state && history.state.ocOverlay === name) {
                    entry.resolve = resolve;
                    history.back();
                    // Safety net if popstate never fires
                    setTimeout(() => {
                        const still = this.overlays.indexOf(entry);
                        if (still !== -1) {
                            this.overlays.splice(still, 1);
                            entry.close();
                            resolve();
                        }
                    }, 700);
                } else {
                    const [o] = this.overlays.splice(idx, 1);
                    o.close();
                    resolve();
                }
            });
        }

        isOverlayOpen(name) {
            return this.overlays.some((o) => o.name === name);
        }

        // ==============================================================
        // Theme & preferences
        // ==============================================================
        applyTheme() {
            const dark = this.themePref === 'dark' || (this.themePref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            const meta = $('#metaThemeColor');
            if (meta) meta.setAttribute('content', dark ? '#121b21' : '#ffffff');
            if (!this._themeListener) {
                this._themeListener = true;
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                    if (this.themePref === 'auto') this.applyTheme();
                });
            }
        }

        applyWallpaper() {
            WALLPAPERS.forEach((w) => this.els.chat.classList.remove(`wp-${w}`));
            this.els.chat.classList.add(`wp-${this.wallpaper}`);
        }

        applyBubble() {
            if (/^#[0-9a-f]{6}$/i.test(this.bubbleColor)) {
                document.documentElement.style.setProperty('--bubble-mine', this.bubbleColor);
            }
        }

        renderProfile() {
            const av = $('#profileAvatar');
            av.textContent = U.initials(this.username);
            av.style.setProperty('--c', this.avatarColor);
            $('#profileName').textContent = this.username;
        }

        // ==============================================================
        // Sidebar & recent rooms
        // ==============================================================
        recentRooms() {
            const raw = store.json('openchat_recent_rooms', []);
            return (Array.isArray(raw) ? raw : [])
                .map((r) => (typeof r === 'string' ? { code: r, at: 0 } : r))
                .filter((r) => r && r.code && r.code !== 'public');
        }

        saveRecent() {
            if (this.isPublic) return;
            const list = this.recentRooms().filter((r) => r.code !== this.room);
            list.unshift({ code: this.room, at: Date.now() });
            store.setJson('openchat_recent_rooms', list.slice(0, 15));
        }

        removeRecent(code) {
            store.setJson('openchat_recent_rooms', this.recentRooms().filter((r) => r.code !== code));
        }

        roomAvatar(code, cls = '') {
            if (code === 'public') return `<span class="room-avatar room-avatar-public ${cls}">${icon('globe')}</span>`;
            const [a, b] = U.gradientFor(code);
            return `<span class="room-avatar ${cls}" style="--c1:${a};--c2:${b}">${U.esc(code.replace(/[^a-z0-9]/gi, '').slice(0, 2) || '#')}</span>`;
        }

        renderRecent(filter = '') {
            const box = $('#recentRooms');
            const f = filter.trim().toLowerCase();
            const list = this.recentRooms().filter((r) => !f || r.code.includes(f));
            if (!list.length) {
                box.innerHTML = `<div class="recent-empty">${f ? 'Aucun salon récent ne correspond. Appuyez sur Entrée pour rejoindre « ' + U.esc(U.sanitizeCode(f)) + ' ».' : 'Vos salons privés apparaîtront ici.'}</div>`;
                return;
            }
            box.innerHTML = list.map((r) => `
                <a href="index.php?code=${encodeURIComponent(r.code)}" class="room-item ${r.code === this.room ? 'active' : ''}" data-code="${U.esc(r.code)}">
                    ${this.roomAvatar(r.code)}
                    <span class="room-item-body">
                        <span class="room-item-title">${U.esc(r.code)}</span>
                        <span class="room-item-sub">${r.code === this.room ? 'Salon actuel' : r.at ? 'Visité ' + U.ago(r.at) : 'Salon privé'}</span>
                    </span>
                    <button type="button" class="icon-btn icon-btn-sm room-item-remove" data-remove="${U.esc(r.code)}" title="Retirer de la liste" aria-label="Retirer">${icon('x', 'ic-sm')}</button>
                </a>`).join('');

            // Mirror into the room avatar in the header (gradient)
            if (!this.isPublic) {
                const [a, b] = U.gradientFor(this.room);
                ['#headerRoomAvatar', '#membersRoomAvatar'].forEach((sel) => {
                    const el = $(sel);
                    if (el) { el.style.setProperty('--c1', a); el.style.setProperty('--c2', b); }
                });
            }
        }

        bindLayout() {
            $('#btnOpenSidebar').addEventListener('click', () => this.openSidebar());
            $('#btnCloseSidebar').addEventListener('click', () => this.closeOverlay('sidebar'));
            this.els.scrim.addEventListener('click', () => this.closeOverlay('sidebar'));

            $('#recentRooms').addEventListener('click', (e) => {
                const rm = e.target.closest('[data-remove]');
                if (rm) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeRecent(rm.dataset.remove);
                    this.renderRecent($('#quickJoinInput').value);
                    toast('Salon retiré de la liste');
                }
            });

            const q = $('#quickJoinInput');
            q.addEventListener('input', () => this.renderRecent(q.value));
            $('#formQuickJoin').addEventListener('submit', (e) => {
                e.preventDefault();
                const code = U.sanitizeCode(q.value);
                if (!code) return;
                this.goToRoom(code);
            });

            // Composer height → FAB position
            if (window.ResizeObserver) {
                new ResizeObserver(() => {
                    this.els.chat.style.setProperty('--composer-h', `${this.els.composer.offsetHeight}px`);
                }).observe(this.els.composer);
            }
        }

        openSidebar() {
            if (window.innerWidth >= 900) return;
            this.els.sidebar.classList.add('open');
            this.els.scrim.classList.add('open');
            this.pushOverlay('sidebar', () => {
                this.els.sidebar.classList.remove('open');
                this.els.scrim.classList.remove('open');
            });
        }

        goToRoom(code) {
            code = U.sanitizeCode(code) || 'public';
            location.href = `index.php?code=${encodeURIComponent(code)}`;
        }

        // ==============================================================
        // Header
        // ==============================================================
        bindHeader() {
            const btn = $('#btnHeaderMore');
            const menu = $('#headerMenu');
            const close = () => {
                menu.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            };
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = !menu.classList.contains('open');
                menu.classList.toggle('open', open);
                btn.setAttribute('aria-expanded', String(open));
            });
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && e.target !== btn) close();
            });
            menu.addEventListener('click', (e) => {
                if (e.target.closest('.dropdown-item')) close();
            });

            $('#menuCopyLink').addEventListener('click', () => OC.copy(this.shareUrl, 'Lien du salon copié'));
            $('#menuToggleSound').addEventListener('click', () => this.setSound(!this.soundOn, true));
            $('#menuLeave').addEventListener('click', () => this.leaveRoom());
            $('#btnLeaveRoom').addEventListener('click', () => this.leaveRoom());
            this.setSound(this.soundOn, false);
        }

        setSound(on, announce) {
            this.soundOn = on;
            store.set('openchat_sound', on ? 'true' : 'false');
            $('#menuSoundIcon').innerHTML = `<use href="#i-${on ? 'bell-off' : 'bell'}"/>`;
            $('#menuSoundText').textContent = on ? 'Couper les sons' : 'Activer les sons';
            const sw = $('#settingsSound');
            if (sw) sw.checked = on;
            if (announce) toast(on ? 'Sons activés' : 'Sons coupés', { type: 'ok' });
        }

        updateOnline() {
            const sub = $('#roomSubtitle');
            const text = $('#onlineText');
            const dot = sub.querySelector('.online-dot');
            if (this.typingUsers.length) {
                sub.classList.add('is-typing');
                text.textContent = this.typingLabel();
                return;
            }
            sub.classList.remove('is-typing');
            if (!this.connected && this._everConnected) {
                dot.classList.add('offline');
                text.textContent = 'Reconnexion…';
                return;
            }
            dot.classList.remove('offline');
            const n = this.online || 1;
            text.textContent = n <= 1 ? 'En ligne' : `${n} en ligne`;
            $('#menuOnlineCount').textContent = String(n);
        }

        // ==============================================================
        // Modals
        // ==============================================================
        bindModals() {
            document.addEventListener('click', (e) => {
                const opener = e.target.closest('[data-open]');
                if (opener) {
                    e.preventDefault();
                    this.openModal(opener.dataset.open, { tab: opener.dataset.tab });
                    return;
                }
                const closer = e.target.closest('[data-close]');
                if (closer) {
                    const modal = closer.closest('.modal');
                    if (modal) this.closeOverlay(modal.id);
                }
            });

            $$('.modal').forEach((modal) => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeOverlay(modal.id);
                });
                this.bindSheetDrag(modal);
            });

            $$('[data-tab-btn]').forEach((b) => b.addEventListener('click', () => this.setRoomTab(b.dataset.tabBtn)));

            // Invite modal
            $('#btnCopyInvite').addEventListener('click', () => OC.copy(this.shareUrl, 'Lien du salon copié'));
            const native = $('#btnNativeShare');
            if (navigator.share) {
                native.hidden = false;
                native.addEventListener('click', () => {
                    navigator.share({ title: 'OpenChat', text: this.inviteText(), url: this.shareUrl }).catch(() => {});
                });
            }
            $('#inviteLink').addEventListener('focus', (e) => e.target.select());
        }

        /** Swipe-down to close bottom sheets on mobile */
        bindSheetDrag(modal) {
            const card = modal.querySelector('.modal-card');
            const handle = [modal.querySelector('.modal-grabber'), modal.querySelector('.modal-head')].filter(Boolean);
            let start = null;
            handle.forEach((h) => {
                h.addEventListener('pointerdown', (e) => {
                    if (e.pointerType === 'mouse' || e.target.closest('button')) return;
                    start = { y: e.clientY, t: performance.now() };
                    card.style.transition = 'none';
                    try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                });
                h.addEventListener('pointermove', (e) => {
                    if (!start) return;
                    const dy = Math.max(0, e.clientY - start.y);
                    card.style.transform = `translateY(${dy}px)`;
                });
                const end = (e) => {
                    if (!start) return;
                    const dy = Math.max(0, e.clientY - start.y);
                    const v = dy / (performance.now() - start.t);
                    start = null;
                    card.style.transition = 'transform 0.22s cubic-bezier(.2,.8,.2,1)';
                    if (dy > 110 || v > 0.6) {
                        card.style.transform = 'translateY(100%)';
                        setTimeout(() => { card.style.transform = ''; card.style.transition = ''; }, 260);
                        this.closeOverlay(modal.id);
                    } else {
                        card.style.transform = '';
                    }
                };
                h.addEventListener('pointerup', end);
                h.addEventListener('pointercancel', end);
            });
        }

        openModal(id, opts = {}) {
            const modal = document.getElementById(id);
            if (!modal || !modal.classList.contains('modal')) return;
            if (!modal.hidden && !modal.classList.contains('is-closing')) return;

            if (id === 'roomModal') this.setRoomTab(opts.tab || 'create');
            if (id === 'inviteModal') this.renderInvite();
            if (id === 'settingsModal') this.populateSettings();
            if (id === 'membersModal') { this.renderMembers(); this.ping(); }

            modal.classList.remove('is-closing');
            modal.hidden = false;
            const fromSidebar = this.overlays.length && this.overlays[this.overlays.length - 1].name === 'sidebar';
            this.pushOverlay(id, () => this.hideModal(modal), { replaceTop: fromSidebar });

            if (!U.isTouch) {
                const first = modal.querySelector('.tab-pane:not([hidden]) input, .modal-card > input');
                if (first) setTimeout(() => first.focus(), 80);
            }
        }

        hideModal(modal) {
            modal.classList.add('is-closing');
            setTimeout(() => {
                modal.hidden = true;
                modal.classList.remove('is-closing');
            }, 190);
            if (modal.id === 'inviteModal') this.pairToken = null;
            if (modal.id === 'shareModal' && this.pendingShare && !this.pendingShare.used) {
                if (this.pendingShare.source === 'cache') this.clearSharedCache();
                this.pendingShare = null;
            }
        }

        setRoomTab(tab) {
            $$('[data-tab-btn]').forEach((b) => b.classList.toggle('active', b.dataset.tabBtn === tab));
            $$('[data-tab-pane]').forEach((p) => { p.hidden = p.dataset.tabPane !== tab; });
            if (!U.isTouch) {
                const input = $(`[data-tab-pane="${tab}"] input`);
                if (input) setTimeout(() => input.focus(), 60);
            }
        }

        inviteText() {
            return this.isPublic ? 'Rejoins-moi sur OpenChat 💬' : `Rejoins-moi dans le salon « ${this.room} » sur OpenChat 💬`;
        }

        renderInvite() {
            this.pairToken = 'pair_' + U.uid().slice(0, 10);
            const pairUrl = `${this.shareUrl}${this.shareUrl.includes('?') ? '&' : '?'}paired=${this.pairToken}`;
            const box = $('#qrCode');
            box.innerHTML = '';
            if (typeof window.QRCode !== 'undefined') {
                try {
                    new window.QRCode(box, {
                        text: pairUrl,
                        width: 264,
                        height: 264,
                        colorDark: '#0b1014',
                        colorLight: '#ffffff',
                        correctLevel: window.QRCode.CorrectLevel.M
                    });
                } catch (e) { box.textContent = 'QR indisponible'; }
            }
            const status = $('#qrStatus');
            status.classList.remove('success');
            status.innerHTML = '<span class="online-dot"></span> En attente du scan…';
            $('#inviteLink').value = this.shareUrl;

            const text = this.inviteText();
            $('#shareWhatsapp').href = `https://wa.me/?text=${encodeURIComponent(`${text}\n${this.shareUrl}`)}`;
            $('#shareTelegram').href = `https://t.me/share/url?url=${encodeURIComponent(this.shareUrl)}&text=${encodeURIComponent(text)}`;
            $('#shareSms').href = `sms:?&body=${encodeURIComponent(`${text} ${this.shareUrl}`)}`;
            $('#shareEmail').href = `mailto:?subject=${encodeURIComponent('Rejoins-moi sur OpenChat')}&body=${encodeURIComponent(`${text}\n\n${this.shareUrl}`)}`;
        }

        renderMembers() {
            const list = $('#membersList');
            const members = this.members.length ? this.members : [{ username: this.username, avatar_color: this.avatarColor, is_online: true }];
            const online = members.filter((m) => m.is_online).length || 1;
            $('#membersCountText').textContent = `${online} en ligne · ${members.length} actif${members.length > 1 ? 's' : ''} récemment`;
            list.innerHTML = members.map((m) => {
                const me = this.myNames.has(m.username);
                const status = m.is_online ? 'En ligne' : `Vu ${U.ago(Date.now() - (m.seconds_ago || 60) * 1000)}`;
                return `
                    <div class="member ${m.is_online ? 'online' : ''}">
                        <span class="avatar" style="--c:${U.esc(m.avatar_color || U.colorFor(m.username))}">${U.esc(U.initials(m.username))}</span>
                        <div>
                            <div class="member-name">${U.esc(m.username)} ${me ? '<small>(vous)</small>' : ''}</div>
                            <div class="member-status">${status}</div>
                        </div>
                    </div>`;
            }).join('');
        }

        // ==============================================================
        // Settings
        // ==============================================================
        populateSettings() {
            $('#settingsName').value = this.username;
            this.previewSettingsAvatar(this.username, this.avatarColor);
            $$('#avatarSwatches .swatch').forEach((s) => s.classList.toggle('active', s.dataset.color === this.avatarColor));
            $$('#bubbleSwatches .swatch').forEach((s) => s.classList.toggle('active', s.dataset.bubble === this.bubbleColor));
            $$('#themeSegment .segment').forEach((s) => s.classList.toggle('active', s.dataset.themeOpt === this.themePref));
            $$('#wallpaperGrid .wallpaper').forEach((w) => w.classList.toggle('active', w.dataset.wp === this.wallpaper));
            $('#settingsSound').checked = this.soundOn;
            $('#settingsEnterSend').checked = this.enterSend;
            $('#btnSettingsNotif').hidden = !('Notification' in window) || Notification.permission !== 'default';
        }

        previewSettingsAvatar(name, color) {
            const av = $('#settingsAvatar');
            av.textContent = U.initials(name || '?');
            av.style.setProperty('--c', color);
        }

        bindSettings() {
            $('#settingsName').addEventListener('input', (e) => this.previewSettingsAvatar(e.target.value, this.avatarColor));
            $('#avatarSwatches').addEventListener('click', (e) => {
                const s = e.target.closest('.swatch');
                if (!s) return;
                this.avatarColor = s.dataset.color;
                store.set('openchat_avatar_color', this.avatarColor);
                $$('#avatarSwatches .swatch').forEach((x) => x.classList.toggle('active', x === s));
                this.previewSettingsAvatar($('#settingsName').value, this.avatarColor);
                this.renderProfile();
            });
            $('#bubbleSwatches').addEventListener('click', (e) => {
                const s = e.target.closest('.swatch');
                if (!s) return;
                this.bubbleColor = s.dataset.bubble;
                store.set('openchat_bubble_color', this.bubbleColor);
                $$('#bubbleSwatches .swatch').forEach((x) => x.classList.toggle('active', x === s));
                this.applyBubble();
            });
            $('#themeSegment').addEventListener('click', (e) => {
                const s = e.target.closest('[data-theme-opt]');
                if (!s) return;
                this.themePref = s.dataset.themeOpt;
                store.set('openchat_theme', this.themePref);
                $$('#themeSegment .segment').forEach((x) => x.classList.toggle('active', x === s));
                this.applyTheme();
            });
            $('#wallpaperGrid').addEventListener('click', (e) => {
                const w = e.target.closest('.wallpaper');
                if (!w) return;
                this.wallpaper = w.dataset.wp;
                store.set('openchat_chat_theme', this.wallpaper);
                $$('#wallpaperGrid .wallpaper').forEach((x) => x.classList.toggle('active', x === w));
                this.applyWallpaper();
            });
            $('#settingsSound').addEventListener('change', (e) => this.setSound(e.target.checked, false));
            $('#settingsEnterSend').addEventListener('change', (e) => {
                this.enterSend = e.target.checked;
                store.set('openchat_enter_send', this.enterSend ? 'true' : 'false');
            });
            $('#btnSettingsNotif').addEventListener('click', () => this.requestNotifications());
            $('#btnSaveSettings').addEventListener('click', () => {
                const name = $('#settingsName').value.replace(/[<>]/g, '').trim().slice(0, 24);
                if (name && name !== this.username) {
                    this.username = name;
                    this.myNames.add(name);
                    store.set('openchat_username', name);
                    store.setJson('openchat_my_names', Array.from(this.myNames).slice(-10));
                    this.renderProfile();
                    this.connect();
                }
                this.ping();
                this.closeOverlay('settingsModal');
                toast('Préférences enregistrées', { type: 'ok' });
            });
        }

        // ==============================================================
        // Room creation / join
        // ==============================================================
        bindRoomForms() {
            const btn = $('#btnInstantRoom');
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    const d = await api.createRoom();
                    this.goToRoom(d.room.code);
                } catch (e) {
                    btn.disabled = false;
                    toast(e.message, { type: 'err' });
                }
            });
            $('#formCustomRoom').addEventListener('submit', (e) => {
                e.preventDefault();
                const code = U.sanitizeCode($('#customRoomInput').value);
                if (!code || code === 'public') {
                    toast('Choisissez un autre nom de salon', { type: 'err' });
                    return;
                }
                this.goToRoom(code);
            });
            $('#formJoinRoom').addEventListener('submit', (e) => {
                e.preventDefault();
                const code = U.sanitizeCode($('#joinRoomInput').value);
                if (code) this.goToRoom(code);
            });
        }

        async leaveRoom() {
            try { await api.presence('leave', this.room, this.username, this.avatarColor); } catch (e) { /* ignore */ }
            this.removeRecent(this.room);
            toast('Vous avez quitté le salon');
            setTimeout(() => { location.href = 'index.php?code=public'; }, 350);
        }

        handleUrlActions() {
            const p = new URLSearchParams(location.search);
            let dirty = false;
            if (p.get('new') === '1') {
                setTimeout(() => this.openModal('roomModal', { tab: 'create' }), 300);
                p.delete('new');
                dirty = true;
            }
            if (p.has('source')) { p.delete('source'); dirty = true; }
            if (dirty) this.replaceQuery(p);
        }

        replaceQuery(params) {
            const qs = params.toString();
            try { history.replaceState(history.state, '', location.pathname + (qs ? `?${qs}` : '')); } catch (e) { /* ignore */ }
        }

        // ==============================================================
        // Presence & typing
        // ==============================================================
        startPresence() {
            this.ping();
            setInterval(() => { if (!document.hidden) this.ping(); }, 20000);
        }

        async ping() {
            try {
                const d = await api.presence('ping', this.room, this.username, this.avatarColor);
                this.members = d.members || [];
                this.members.forEach((m) => this.memberColors.set(m.username, m.avatar_color));
                this.online = d.online_count || 1;
                this.updateOnline();
                if (this.isOverlayOpen('membersModal')) this.renderMembers();
            } catch (e) { /* offline */ }
        }

        onTypingInput() {
            const has = this.els.input.value.trim().length > 0;
            const now = Date.now();
            if (has && now - this.lastTypingSent > 3500) {
                this.lastTypingSent = now;
                this.typingSent = true;
                api.presence('typing', this.room, this.username, this.avatarColor).catch(() => {});
            } else if (!has) {
                this.stopTyping();
            }
        }

        stopTyping() {
            if (!this.typingSent) return;
            this.typingSent = false;
            this.lastTypingSent = 0;
            api.presence('stop_typing', this.room, this.username, this.avatarColor).catch(() => {});
        }

        typingLabel() {
            const u = this.typingUsers;
            if (u.length === 1) return `${u[0]} écrit…`;
            if (u.length === 2) return `${u[0]} et ${u[1]} écrivent…`;
            return 'Plusieurs personnes écrivent…';
        }

        renderTyping(users) {
            this.typingUsers = (users || []).filter((u) => !this.myNames.has(u));
            const row = this.els.typingRow;
            const near = this.isNearBottom();
            if (this.typingUsers.length) {
                $('#typingLabel').textContent = this.typingLabel();
                row.hidden = false;
            } else {
                row.hidden = true;
            }
            this.updateOnline();
            if (near) this.scrollToBottom(true);
        }

        // ==============================================================
        // Messages: loading
        // ==============================================================
        normalize(m) {
            m.id = parseInt(m.id, 10) || 0;
            let meta = m._meta;
            if (!meta) {
                try { meta = m.meta ? (typeof m.meta === 'string' ? JSON.parse(m.meta) : m.meta) : {}; } catch (e) { meta = {}; }
            }
            m._meta = meta || {};
            m._rx = this.parseReactions(m.reactions);
            m._t = U.parseDate(m.created_at).getTime();
            return m;
        }

        parseReactions(raw) {
            let o = raw;
            if (typeof raw === 'string') {
                try { o = JSON.parse(raw || '{}'); } catch (e) { o = {}; }
            }
            const out = {};
            if (!o || typeof o !== 'object') return out;
            Object.keys(o).forEach((k) => {
                const v = o[k];
                if (Array.isArray(v)) { if (v.length) out[k] = v.map(String); }
                else if (Number(v) > 0) out[k] = new Array(Math.min(500, Number(v))).fill('·');
            });
            return out;
        }

        async loadInitial() {
            try {
                const d = await api.latest(this.room, 60);
                this.hasMore = !!d.has_more;
                this.sinceTs = d.server_time || '';
                (d.messages || []).forEach((m) => {
                    this.normalize(m);
                    if (!this.msgs.has(m.id)) this.addMessage(m);
                });
                this.regroup();
            } catch (e) {
                toast('Impossible de charger les messages. Nouvel essai…', { type: 'err' });
            }
            this.updateEmpty();
            this.scrollToBottom(true);
            requestAnimationFrame(() => this.scrollToBottom(true));
        }

        async loadOlder() {
            if (this.loadingOlder || !this.hasMore || !this.oldestId) return;
            this.loadingOlder = true;
            const loader = $('#loadOlder');
            loader.hidden = false;
            try {
                const d = await api.before(this.room, this.oldestId, 40);
                const s = this.els.scroll;
                const prevH = s.scrollHeight;
                const prevTop = s.scrollTop;
                this.stick = false;
                (d.messages || []).slice().reverse().forEach((m) => {
                    this.normalize(m);
                    if (!this.msgs.has(m.id)) this.addMessage(m, { position: 'start' });
                });
                this.hasMore = !!d.has_more;
                this.regroup();
                loader.hidden = true;
                s.scrollTop = prevTop + (s.scrollHeight - prevH);
            } catch (e) {
                /* retry on next scroll */
            } finally {
                loader.hidden = true;
                this.loadingOlder = false;
            }
        }

        // ==============================================================
        // Messages: live sync (SSE + polling fallback)
        // ==============================================================
        connect() {
            clearTimeout(this.reconnectTimer);
            if (!window.EventSource) {
                this.startPolling();
                return;
            }
            if (this.es) this.es.close();
            const url = `api/stream.php?code=${encodeURIComponent(this.room)}&since_id=${this.lastId}&user=${encodeURIComponent(this.username)}&since_ts=${encodeURIComponent(this.sinceTs)}`;
            const es = new EventSource(url);
            this.es = es;
            this.lastBeat = Date.now();
            const beat = () => { this.lastBeat = Date.now(); };
            const parse = (e) => { try { return JSON.parse(e.data); } catch (err) { return {}; } };

            es.onopen = () => {
                beat();
                this.retry = 0;
                this.setConnected(true);
            };
            es.addEventListener('messages', (e) => {
                beat();
                this.onIncoming(parse(e).messages || []);
            });
            es.addEventListener('reactions', (e) => {
                beat();
                const d = parse(e);
                if (d.since_ts) this.sinceTs = d.since_ts;
                (d.updates || []).forEach((u) => this.applyReactions(u.id, u.reactions, true));
            });
            es.addEventListener('typing', (e) => {
                beat();
                this.renderTyping(parse(e).users || []);
            });
            es.addEventListener('reconnect', (e) => {
                const d = parse(e);
                if (d.since_ts) this.sinceTs = d.since_ts;
                this.connect();
            });
            es.onerror = () => {
                if (this.es !== es) return;
                es.close();
                this.es = null;
                this.setConnected(false);
                const delay = Math.min(15000, 1500 * Math.pow(2, this.retry++));
                this.reconnectTimer = setTimeout(() => this.connect(), delay);
            };

            if (!this.watchdog) {
                this.watchdog = setInterval(() => {
                    if (this.es && Date.now() - this.lastBeat > 60000) this.connect();
                }, 20000);
            }
        }

        setConnected(ok) {
            this.connected = ok;
            if (ok) this._everConnected = true;
            this.updateOnline();
        }

        startPolling() {
            if (this.pollTimer) return;
            this.setConnected(true);
            this.pollTimer = setInterval(async () => {
                try {
                    const d = await api.since(this.room, this.lastId);
                    this.onIncoming(d.messages || []);
                } catch (e) { /* ignore */ }
            }, 2500);
        }

        onIncoming(list) {
            if (!list.length) return;
            const wasNear = this.isNearBottom();
            let fresh = 0;
            list.forEach((m) => {
                this.normalize(m);
                if (this.msgs.has(m.id)) return;
                const cid = m._meta && m._meta.cid;
                if (cid && this.pending.has(cid)) {
                    this.reconcile(cid, m);
                    return;
                }
                if (m.type === 'peer_joined') this.onPeerJoined(m);
                this.addMessage(m, { anim: true });
                if (!this.isMine(m) && m.type !== 'system' && m.type !== 'peer_joined') {
                    fresh++;
                    this.notify(m);
                }
            });
            this.regroup();
            this.updateEmpty();
            if (wasNear) {
                this.scrollToBottom();
            } else if (fresh) {
                this.unread += fresh;
                this.updateFab();
            }
        }

        applyReactions(id, reactions, animate) {
            const m = this.msgs.get(parseInt(id, 10));
            if (!m) return;
            m._rx = this.parseReactions(reactions);
            const row = this.rows.get(m.id);
            if (row) this.renderReactions(row, m._rx, animate);
        }

        // ==============================================================
        // Messages: rendering
        // ==============================================================
        addMessage(m, { anim = false, position = 'end' } = {}) {
            if (m.id) {
                this.msgs.set(m.id, m);
                this.lastId = Math.max(this.lastId, m.id);
                this.oldestId = this.oldestId ? Math.min(this.oldestId, m.id) : m.id;
            }
            const row = this.buildRow(m);
            if (anim) row.classList.add('anim');
            if (m.id) this.rows.set(m.id, row);
            this.placeRow(row, m, position);
            this.afterRender(row, m);
            return row;
        }

        makeDayGroup(key) {
            const g = document.createElement('div');
            g.className = 'day-group';
            g.dataset.day = key;
            g.innerHTML = `<div class="day-sep">${U.esc(U.dayLabel(key))}</div>`;
            return g;
        }

        placeRow(row, m, position) {
            const key = U.dayKey(m.created_at);
            const box = this.els.messages;
            if (position === 'start') {
                let g = box.firstElementChild;
                if (!g || g.dataset.day !== key) {
                    g = this.makeDayGroup(key);
                    box.prepend(g);
                }
                g.firstElementChild.after(row);
            } else {
                let g = box.lastElementChild;
                if (!g || g.dataset.day !== key) {
                    g = this.makeDayGroup(key);
                    box.append(g);
                }
                g.append(row);
            }
        }

        buildRow(m) {
            if (m.type === 'system' || m.type === 'peer_joined') {
                const el = document.createElement('div');
                el.className = 'sys-row';
                el.dataset.id = m.id;
                el.textContent = m.type === 'peer_joined' ? '📱 Un nouvel appareil a rejoint le salon' : m.content;
                el._msg = m;
                return el;
            }

            const mine = this.isMine(m);
            const color = this.colorOf(m);
            const { html, bubbleCls, rowCls } = this.buildContent(m, mine);
            const row = document.createElement('div');
            row.className = `msg-row ${mine ? 'mine' : 'theirs'} ${rowCls}`;
            if (m.id) row.dataset.id = m.id;
            if (m._cid) row.dataset.cid = m._cid;
            row._msg = m;

            let quote = '';
            if (m.reply_to_id && m.reply_to_sender) {
                const qMine = this.myNames.has(m.reply_to_sender);
                quote = `<button type="button" class="quote" data-jump="${parseInt(m.reply_to_id, 10)}" style="--q-c:${this.colorOfName(m.reply_to_sender)}">
                    <span class="quote-name">${U.esc(qMine ? 'Vous' : m.reply_to_sender)}</span>
                    <span class="quote-text">${U.esc(m.reply_to_content || '')}</span>
                </button>`;
            }

            row.innerHTML = `
                <span class="avatar msg-avatar" style="--c:${color}" aria-hidden="true">${U.esc(U.initials(m.sender))}</span>
                <div class="msg-col">
                    <span class="swipe-reply">${icon('reply')}</span>
                    <div class="bubble ${bubbleCls}">
                        ${mine ? '' : `<span class="bubble-sender" style="--name-c:${color}">${U.esc(m.sender)}</span>`}
                        ${quote}
                        ${html}
                        ${this.metaHtml(m, mine)}
                    </div>
                    <div class="reactions"></div>
                    <div class="msg-hover">
                        <button type="button" class="icon-btn" data-act="react" title="Réagir" aria-label="Réagir">${icon('smile')}</button>
                        <button type="button" class="icon-btn" data-act="reply" title="Répondre" aria-label="Répondre">${icon('reply')}</button>
                        <button type="button" class="icon-btn" data-act="more" title="Plus d'actions" aria-label="Plus d'actions">${icon('more')}</button>
                    </div>
                </div>`;
            return row;
        }

        metaHtml(m, mine) {
            let tick = '';
            if (mine) {
                if (m._failed) tick = icon('alert', 'tick-failed');
                else if (m._pending) tick = icon('clock', 'tick-pending');
                else tick = icon('check');
            }
            return `<span class="bubble-meta">${U.esc(U.time(m.created_at))}${tick}</span>`;
        }

        captionOf(m) {
            if (['text', 'link'].includes(m.type)) return m.content || '';
            if (m.type === 'sticker') return '';
            if (m.content && m.content !== m.file_name && !/^vocal_\d+/.test(m.content)) return m.content;
            return '';
        }

        captionHtml(text) {
            return text ? `<div class="caption bubble-text">${U.richText(text)}<span class="meta-spacer"></span></div>` : '';
        }

        lbAttrs(type, url, name) {
            return `data-lb data-lb-type="${type}" data-lb-url="${U.esc(url)}" data-lb-name="${U.esc(name || (type === 'video' ? 'video.mp4' : 'photo.jpg'))}"`;
        }

        buildContent(m, mine) {
            const meta = m._meta || {};
            const url = U.safeUrl(m.file_url);
            const caption = this.captionOf(m);
            const isSticker = m.type === 'sticker' || (url && url.includes('assets/stickers/'));

            if (isSticker) {
                const src = url || U.safeUrl(m.content);
                return { rowCls: 'sticker', bubbleCls: '', html: `<img class="sticker-img" src="${U.esc(src)}" alt="Sticker" loading="lazy">` };
            }

            if (m.type === 'image' && url) {
                const ar = OC.Media.aspect(meta.w, meta.h);
                return {
                    rowCls: '',
                    bubbleCls: `has-media ${caption ? '' : 'media-only'}`,
                    html: `<a class="media ${ar ? '' : 'loading'}" href="${U.esc(url)}" ${this.lbAttrs('image', url, m.file_name)} style="${ar ? `aspect-ratio:${ar}` : 'min-height:160px'}">
                            <img src="${U.esc(url)}" alt="" loading="lazy" decoding="async">
                        </a>${this.captionHtml(caption)}`
                };
            }

            if (m.type === 'video' && url) {
                const ar = OC.Media.aspect(meta.w, meta.h) || '1.7778';
                return {
                    rowCls: '',
                    bubbleCls: `has-media ${caption ? '' : 'media-only'}`,
                    html: `<a class="media" href="${U.esc(url)}" ${this.lbAttrs('video', url, m.file_name)} style="aspect-ratio:${ar}">
                            <video src="${U.esc(url)}#t=0.1" muted playsinline preload="metadata"></video>
                            <span class="play-overlay">${icon('play')}</span>
                            ${meta.duration ? `<span class="media-badge">${icon('video')} ${U.duration(meta.duration)}</span>` : ''}
                        </a>${this.captionHtml(caption)}`
                };
            }

            if (m.type === 'album' && Array.isArray(meta.items) && meta.items.length) {
                const items = meta.items.filter((it) => U.safeUrl(it.url));
                const n = items.length;
                const shown = items.slice(0, 4);
                const cls = n === 1 ? '' : n === 2 ? 'album-2' : n === 3 ? 'album-3' : 'album-4';
                const cells = shown.map((it, i) => {
                    const u = U.safeUrl(it.url);
                    const more = i === 3 && n > 4 ? `<span class="album-more">+${n - 4}</span>` : '';
                    const inner = it.type === 'video'
                        ? `<video src="${U.esc(u)}#t=0.1" muted playsinline preload="metadata"></video><span class="play-overlay">${icon('play')}</span>`
                        : `<img src="${U.esc(u)}" alt="" loading="lazy" decoding="async">`;
                    return `<a class="media" href="${U.esc(u)}" ${this.lbAttrs(it.type === 'video' ? 'video' : 'image', u, it.name)}>${inner}${more}</a>`;
                }).join('');
                // hidden anchors so the gallery includes every item of the album
                const hidden = items.slice(4).map((it) => `<span hidden ${this.lbAttrs(it.type === 'video' ? 'video' : 'image', U.safeUrl(it.url), it.name)}></span>`).join('');
                return {
                    rowCls: '',
                    bubbleCls: `has-media ${caption ? '' : 'media-only'}`,
                    html: `<div class="album ${cls}">${cells}</div>${hidden}${this.captionHtml(caption)}`
                };
            }

            if (m.type === 'audio' && url) {
                return { rowCls: '', bubbleCls: 'has-voice', html: this.voiceHtml(m, url) + this.captionHtml(caption) };
            }

            if (m.type === 'file' || ((m.type === 'image' || m.type === 'video' || m.type === 'audio') && !url)) {
                const fv = U.fileVisual(m.file_name);
                return {
                    rowCls: '',
                    bubbleCls: 'has-file',
                    html: `<div class="file-card">
                            <span class="file-icon" style="--fc:${fv.color}">${icon(fv.icon)}${U.esc(fv.ext.slice(0, 4))}</span>
                            <div class="file-info" data-act="open-file" role="button" tabindex="0">
                                <div class="file-name">${U.esc(m.file_name || 'Fichier')}</div>
                                <div class="file-sub">${U.bytes(m.file_size)} · ${U.esc(fv.ext.toUpperCase())}</div>
                            </div>
                            <button type="button" class="file-dl" data-act="download" aria-label="Télécharger" title="Télécharger">${icon('download')}</button>
                        </div>${this.captionHtml(caption)}`
                };
            }

            // Text / link
            const text = m.content || '';
            const ec = !m.reply_to_id ? U.emojiCount(text) : 0;
            if (ec) {
                return { rowCls: `emoji-only e${ec}`, bubbleCls: '', html: `<div class="bubble-text">${U.esc(text)}</div>` };
            }
            return { rowCls: '', bubbleCls: '', html: `<div class="bubble-text">${U.richText(text)}<span class="meta-spacer"></span></div>` };
        }

        voiceHtml(m, url) {
            const meta = m._meta || {};
            const isVoice = !!(meta.voice || (meta.waveform && meta.waveform.length) || /^vocal_/i.test(m.file_name || ''));
            const wave = meta.waveform && meta.waveform.length ? U.resample(meta.waveform, 36) : U.fakeWave(m.file_name || url, 36);
            const bars = wave.map((v) => `<i style="height:${Math.max(14, Math.min(100, v))}%"></i>`).join('');
            const dur = Number(meta.duration) || 0;
            return `
                <div class="voice ${isVoice ? 'is-voice' : 'is-music'}" data-src="${U.esc(url)}" ${dur ? `data-duration="${dur}"` : ''}>
                    <button type="button" class="voice-play" aria-label="Lire le message audio">${icon('play', 'ic-play')}${icon('pause', 'ic-pause')}</button>
                    <div class="voice-body">
                        ${isVoice ? '' : `<div class="voice-name">${U.esc(m.file_name || 'Audio')}</div>`}
                        <div class="voice-wave" role="slider" aria-label="Position de lecture" aria-valuemin="0" aria-valuemax="100">
                            <div class="wave-bars">${bars}</div>
                            <div class="wave-bars played">${bars}</div>
                            <span class="voice-knob"></span>
                        </div>
                    </div>
                    <div class="voice-foot"><span class="voice-time">${dur ? U.duration(dur) : '0:00'}</span><button type="button" class="voice-speed" aria-label="Vitesse de lecture">1×</button></div>
                    ${isVoice ? `<span class="voice-mic-badge">${icon('mic')}</span>` : ''}
                </div>`;
        }

        afterRender(row, m) {
            if (!row.classList.contains('msg-row')) return;
            this.renderReactions(row, m._rx || {});
            if ((m.type === 'text' || m.type === 'link') && !row.classList.contains('emoji-only')) {
                const url = U.firstUrl(m.content);
                if (url) this.loadLinkPreview(row, url);
            }
            const voice = row.querySelector('.voice');
            if (voice && !voice.dataset.duration && !m._pending) this.player.probe(voice);
            if (voice) this.player.setSpeedLabel(voice);
        }

        renderReactions(row, rx, animate = false) {
            const box = row.querySelector('.reactions');
            if (!box) return;
            const entries = Object.entries(rx || {}).filter(([, users]) => users && users.length);
            box.innerHTML = entries.map(([emo, users]) => {
                const mine = users.some((u) => this.myNames.has(u));
                const names = users.filter((u) => u !== '·').map((u) => (this.myNames.has(u) ? 'Vous' : u)).join(', ');
                return `<button type="button" class="reaction ${mine ? 'mine' : ''} ${animate ? 'bump' : ''}" data-react="${U.esc(emo)}" title="${U.esc(names)}">
                    <span class="emo">${U.esc(emo)}</span>${users.length > 1 ? `<span class="count">${users.length}</span>` : ''}
                </button>`;
            }).join('');
            row.classList.toggle('has-reactions', entries.length > 0);
        }

        async loadLinkPreview(row, url) {
            let data = this.linkCache.get(url);
            if (data === undefined) {
                this.linkCache.set(url, null);
                try {
                    const d = await api.linkPreview(url);
                    data = d.title || d.description || d.image ? d : null;
                } catch (e) { data = null; }
                this.linkCache.set(url, data);
            }
            if (!data || !row.isConnected) return;
            const bubble = row.querySelector('.bubble');
            if (!bubble || bubble.querySelector('.link-card')) return;
            const near = this.isNearBottom();
            let domain = data.domain || '';
            try { if (!domain) domain = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { domain = ''; }
            const img = U.safeUrl(data.image);
            const card = document.createElement('a');
            card.className = 'link-card';
            card.href = url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.innerHTML = `
                ${img && /^https?:/i.test(img) ? `<img src="${U.esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
                <div class="link-card-body">
                    <div class="link-card-domain">${U.esc(domain)}</div>
                    ${data.title ? `<div class="link-card-title">${U.esc(data.title)}</div>` : ''}
                    ${data.description ? `<div class="link-card-desc">${U.esc(data.description)}</div>` : ''}
                </div>`;
            bubble.insertBefore(card, bubble.querySelector('.bubble-meta'));
            bubble.classList.add('has-link');
            if (near) this.scrollToBottom(true);
        }

        scheduleRegroup() {
            if (this._rg) return;
            this._rg = requestAnimationFrame(() => {
                this._rg = null;
                this.regroup();
            });
        }

        regroup() {
            const rows = $$('#messages .msg-row, #messages .sys-row');
            const same = (a, b) => a && b
                && a.classList.contains('msg-row') && b.classList.contains('msg-row')
                && a._msg && b._msg
                && a._msg.sender === b._msg.sender
                && a.parentElement === b.parentElement
                && Math.abs((a._msg._t || 0) - (b._msg._t || 0)) < 5 * 60 * 1000;
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                if (!r.classList.contains('msg-row')) continue;
                r.classList.toggle('grp-start', !same(rows[i - 1], r));
                r.classList.toggle('grp-end', !same(r, rows[i + 1]));
            }
            $$('#messages .day-group').forEach((g) => {
                if (g.children.length <= 1) {
                    g.remove();
                    return;
                }
                const label = U.dayLabel(g.dataset.day);
                if (g.firstElementChild.textContent !== label) g.firstElementChild.textContent = label;
            });
        }

        updateEmpty() {
            this.els.empty.hidden = this.els.messages.querySelector('.msg-row, .sys-row') !== null;
        }

        // ==============================================================
        // Scroll
        // ==============================================================
        bindScroll() {
            const s = this.els.scroll;
            s.addEventListener('scroll', () => {
                const dist = s.scrollHeight - s.scrollTop - s.clientHeight;
                this.stick = dist < 140;
                if (this.stick && this.unread) {
                    this.unread = 0;
                }
                this.els.fab.classList.toggle('show', dist > 320);
                this.updateFab();
                if (s.scrollTop < 400 && this.hasMore) this.loadOlder();
            }, { passive: true });

            this.els.fab.addEventListener('click', () => this.scrollToBottom());

            if (window.ResizeObserver) {
                new ResizeObserver(() => {
                    if (this.stick) s.scrollTop = s.scrollHeight;
                }).observe(this.els.inner);
            }

            // Images without stored size: keep the view pinned while they load
            this.els.messages.addEventListener('load', (e) => {
                const media = e.target.closest && e.target.closest('.media.loading');
                if (media) {
                    media.classList.remove('loading');
                    media.style.minHeight = '';
                }
                if (this.stick) s.scrollTop = s.scrollHeight;
            }, true);
            this.els.messages.addEventListener('error', (e) => {
                const media = e.target.closest && e.target.closest('.media');
                if (media) media.classList.remove('loading');
            }, true);

            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => {
                    if (this.stick) s.scrollTop = s.scrollHeight;
                });
            }
        }

        isNearBottom(th = 140) {
            const s = this.els.scroll;
            return s.scrollHeight - s.scrollTop - s.clientHeight < th;
        }

        scrollToBottom(instant = false) {
            const s = this.els.scroll;
            this.stick = true;
            this.unread = 0;
            this.updateFab();
            if (instant) {
                s.scrollTop = s.scrollHeight;
            } else {
                s.scrollTo({ top: s.scrollHeight, behavior: 'smooth' });
            }
        }

        updateFab() {
            const b = this.els.unreadBadge;
            b.hidden = !this.unread;
            b.textContent = this.unread > 99 ? '99+' : String(this.unread);
            if (this.unread) this.els.fab.classList.add('show');
        }

        jumpTo(id) {
            const row = this.rows.get(parseInt(id, 10));
            if (!row) {
                toast('Message d\'origine introuvable (trop ancien)');
                return;
            }
            this.stick = false;
            row.scrollIntoView({ block: 'center', behavior: 'smooth' });
            row.classList.remove('flash');
            void row.offsetWidth;
            row.classList.add('flash');
            setTimeout(() => row.classList.remove('flash'), 1500);
        }

        // ==============================================================
        // Composer
        // ==============================================================
        bindComposer() {
            const input = this.els.input;
            const saveDraft = U.debounce(() => {
                const v = input.value;
                if (v.trim()) store.set(`openchat_draft_${this.room}`, v);
                else store.del(`openchat_draft_${this.room}`);
            }, 400);

            input.addEventListener('input', () => {
                this.autosize();
                this.updateActionMode();
                this.onTypingInput();
                saveDraft();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
                if (e.shiftKey) return;
                if (this.enterSend || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.sendText();
                }
            });
            input.addEventListener('focus', () => {
                if (U.isTouch && !this.els.emoji.hidden) this.toggleEmoji(false);
                this.toggleAttach(false);
            });

            this.els.action.addEventListener('click', () => {
                if (this.els.action.dataset.mode === 'send') this.sendText();
            });

            $('#btnCamera').addEventListener('click', () => $('#inputCamera').click());
            ['#inputMedia', '#inputCamera', '#inputDoc', '#inputAudio'].forEach((sel) => {
                const el = $(sel);
                el.addEventListener('change', () => {
                    if (el.files && el.files.length) this.addFiles(el.files);
                    el.value = '';
                });
            });
            $('#btnCancelReply').addEventListener('click', () => this.clearReply());

            // Paste images / files from clipboard
            window.addEventListener('paste', (e) => {
                const items = e.clipboardData && e.clipboardData.files;
                if (items && items.length) {
                    e.preventDefault();
                    this.addFiles(items);
                }
            });
        }

        restoreDraft() {
            const d = store.get(`openchat_draft_${this.room}`);
            if (d) {
                this.els.input.value = d;
                this.autosize();
            }
        }

        autosize() {
            const el = this.els.input;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
        }

        updateActionMode() {
            const has = this.els.input.value.trim().length > 0;
            const mode = has ? 'send' : 'mic';
            this.els.action.dataset.mode = mode;
            this.els.action.setAttribute('aria-label', has ? 'Envoyer' : 'Maintenir pour enregistrer un vocal');
            this.els.action.title = has ? 'Envoyer (Entrée)' : 'Maintenir pour enregistrer · toucher pour mains libres';
            this.els.composer.classList.toggle('has-text', has);
        }

        setReply(m) {
            if (!m || !m.id) return;
            this.reply = { id: m.id, sender: m.sender, text: this.previewText(m).slice(0, 200) };
            $('#replyBarName').textContent = this.isMine(m) ? 'Vous' : m.sender;
            $('#replyBarName').style.color = this.colorOf(m);
            $('#replyBarText').textContent = this.reply.text;
            this.els.replyBar.hidden = false;
            if (!U.isTouch || this.els.emoji.hidden) this.els.input.focus();
        }

        clearReply() {
            this.reply = null;
            this.els.replyBar.hidden = true;
        }

        previewText(m) {
            const cap = this.captionOf(m);
            const meta = m._meta || {};
            switch (m.type) {
                case 'image': return `📷 ${cap || 'Photo'}`;
                case 'video': return `🎬 ${cap || 'Vidéo'}`;
                case 'album': return `🖼️ ${cap || `${(meta.items || []).length} photos`}`;
                case 'audio': return meta.voice || /^vocal_/.test(m.file_name || '') ? `🎤 Message vocal${meta.duration ? ` (${U.duration(meta.duration)})` : ''}` : `🎵 ${m.file_name || 'Audio'}`;
                case 'file': return `📄 ${m.file_name || 'Fichier'}`;
                case 'sticker': return '✨ Sticker';
                default: return m.content || '';
            }
        }

        makeLocal(fields, cid) {
            const extraMeta = fields._meta || {};
            delete fields._meta;
            const m = {
                id: 0,
                room_code: this.room,
                sender: this.username,
                type: 'text',
                content: '',
                file_url: null,
                file_name: null,
                file_size: null,
                reactions: '{}',
                created_at: U.nowSql(),
                ...fields
            };
            m._meta = { ...extraMeta, cid, color: this.avatarColor };
            m._rx = {};
            m._t = Date.now();
            m._pending = true;
            m._cid = cid;
            if (this.reply) {
                m.reply_to_id = this.reply.id;
                m.reply_to_sender = this.reply.sender;
                m.reply_to_content = this.reply.text;
                this.clearReply();
            }
            return m;
        }

        addPending(m) {
            const row = this.buildRow(m);
            row.classList.add('anim', 'pending');
            this.placeRow(row, m, 'end');
            this.afterRender(row, m);
            const p = { m, row };
            this.pending.set(m._cid, p);
            this.regroup();
            this.updateEmpty();
            this.scrollToBottom(true);
            return p;
        }

        payloadOf(m, overrides = {}) {
            const meta = { ...m._meta };
            const payload = {
                room_code: this.room,
                sender: this.username,
                type: m.type,
                content: m.content,
                meta
            };
            if (m.reply_to_id) {
                payload.reply_to_id = m.reply_to_id;
                payload.reply_to_sender = m.reply_to_sender;
                payload.reply_to_content = m.reply_to_content;
            }
            return { ...payload, ...overrides, meta: { ...meta, ...(overrides.meta || {}) } };
        }

        sendText() {
            const input = this.els.input;
            const text = input.value.trim();
            if (!text) return;
            if (text.length > 8000) {
                toast('Message trop long (8000 caractères max.)', { type: 'err' });
                return;
            }
            input.value = '';
            this.autosize();
            this.updateActionMode();
            this.stopTyping();
            store.del(`openchat_draft_${this.room}`);
            if (U.isTouch && !this.els.emoji.hidden) { /* keep panel */ } else if (!U.isTouch) input.focus();

            const cid = U.uid();
            const m = this.makeLocal({ type: /^https?:\/\/\S+$/i.test(text) ? 'link' : 'text', content: text }, cid);
            const p = this.addPending(m);
            p.job = () => this.postSimple(cid);
            p.job();
            if (this.soundOn) OC.sound.sent();
        }

        sendSticker(url) {
            const cid = U.uid();
            const m = this.makeLocal({ type: 'sticker', content: url, file_url: url }, cid);
            const p = this.addPending(m);
            p.job = () => this.postSimple(cid, { file_url: url });
            p.job();
            if (this.soundOn) OC.sound.sent();
        }

        async postSimple(cid, extra = {}) {
            const p = this.pending.get(cid);
            if (!p) return;
            try {
                const d = await api.send(this.payloadOf(p.m, extra));
                this.reconcile(cid, this.normalize(d.message));
            } catch (err) {
                this.markFailed(cid, err.message);
            }
        }

        reconcile(cid, server) {
            const p = this.pending.get(cid);
            if (!p) return;
            this.pending.delete(cid);
            const { m, row } = p;
            if (this.msgs.has(server.id)) {
                row.remove();
                this.regroup();
                return;
            }
            m.id = server.id;
            m.created_at = server.created_at || m.created_at;
            m._t = U.parseDate(m.created_at).getTime();
            m.type = server.type || m.type;
            m.content = server.content;
            m.file_name = server.file_name || m.file_name;
            m.file_size = server.file_size || m.file_size;
            m._remoteUrl = server.file_url;
            if (server.type === 'album' && server._meta && server._meta.items) m._remoteItems = server._meta.items;
            m._pending = false;
            m._failed = false;
            this.msgs.set(m.id, m);
            this.rows.set(m.id, row);
            this.lastId = Math.max(this.lastId, m.id);
            this.oldestId = this.oldestId ? Math.min(this.oldestId, m.id) : m.id;
            row.dataset.id = m.id;
            row.classList.remove('pending', 'failed');
            const meta = row.querySelector('.bubble-meta');
            if (meta) meta.outerHTML = this.metaHtml(m, true);
            const err = row.querySelector('.msg-error');
            if (err) err.remove();
            this.removeUploadUI(row);

            // Point downloads/sharing to the real remote files (previews keep their local blob)
            if (m._remoteUrl) {
                const lbs = row.querySelectorAll('[data-lb]');
                if (lbs.length === 1) lbs[0].dataset.lbUrl = m._remoteUrl;
                const voice = row.querySelector('.voice');
                if (voice) voice.dataset.remote = m._remoteUrl;
            }
            if (m._remoteItems) {
                row.querySelectorAll('[data-lb]').forEach((el, i) => {
                    if (m._remoteItems[i]) el.dataset.lbUrl = m._remoteItems[i].url;
                });
            }
            if (server.reactions) this.applyReactions(m.id, server.reactions);
        }

        fileUrlOf(m) {
            return m._remoteUrl || m.file_url;
        }

        markFailed(cid, message) {
            const p = this.pending.get(cid);
            if (!p) return;
            p.m._failed = true;
            p.row.classList.add('failed');
            const meta = p.row.querySelector('.bubble-meta');
            if (meta) meta.outerHTML = this.metaHtml(p.m, true);
            this.removeUploadUI(p.row);
            let err = p.row.querySelector('.msg-error');
            if (!err) {
                err = document.createElement('button');
                err.type = 'button';
                err.className = 'msg-error';
                err.dataset.act = 'retry';
                p.row.querySelector('.msg-col').appendChild(err);
            }
            err.innerHTML = `${icon('retry')} <span></span>`;
            err.querySelector('span').textContent = `Échec · Réessayer`;
            err.title = message || '';
            toast(message || 'Échec de l\'envoi', { type: 'err' });
        }

        retry(row) {
            const cid = row.dataset.cid;
            const p = cid && this.pending.get(cid);
            if (!p || !p.job) return;
            p.m._failed = false;
            row.classList.remove('failed');
            const err = row.querySelector('.msg-error');
            if (err) err.remove();
            const meta = row.querySelector('.bubble-meta');
            if (meta) meta.outerHTML = this.metaHtml(p.m, true);
            if (p.uploadType) this.attachUploadUI(row, p.uploadType);
            p.job();
        }

        // ==============================================================
        // Files: intake, upload queue
        // ==============================================================
        addFiles(fileList, caption = '') {
            const files = Array.from(fileList || []);
            const ok = [];
            files.forEach((f) => {
                if (f.size > this.maxBytes) toast(`« ${f.name} » dépasse ${this.maxMb} Mo`, { type: 'err', duration: 4000 });
                else ok.push(f);
            });
            if (ok.length > 30) {
                toast('30 fichiers maximum à la fois', { type: 'err' });
                ok.length = 30;
            }
            if (!ok.length) return;
            this.toggleAttach(false);
            this.toggleEmoji(false);
            this.sheet.open(ok.map((f) => OC.MediaSheet.itemFromFile(f)), caption);
        }

        async sendMediaItems(items, caption, { hd = false } = {}) {
            const visual = items.filter((i) => i.kind === 'image' || i.kind === 'video');
            const others = items.filter((i) => !visual.includes(i));
            const groups = [];
            if (visual.length >= 2) {
                for (let i = 0; i < visual.length; i += 10) groups.push({ type: 'album', items: visual.slice(i, i + 10) });
            } else if (visual.length === 1) {
                groups.push({ type: visual[0].kind, items: visual });
            }
            others.forEach((it) => groups.push({ type: it.kind === 'audio' ? 'audio' : 'file', items: [it] }));
            groups.forEach((g, i) => { g.caption = i === 0 ? caption : ''; });

            // Uploads run in parallel, but messages are posted in the order they were picked
            let prev = Promise.resolve();
            groups.forEach((g) => {
                g.prev = prev;
                g.posted = new Promise((resolve) => { g.markPosted = resolve; });
                prev = g.posted;
            });

            for (const g of groups) {
                // Read dimensions first so the optimistic bubble already has the right shape
                await Promise.all(g.items.map(async (it) => {
                    if (!it.file || it.w) return;
                    if (it.kind === 'image') Object.assign(it, await OC.Media.imageDims(it.file));
                    else if (it.kind === 'video') Object.assign(it, await OC.Media.videoMeta(it.file));
                }));
                this.queueGroup(g, hd);
            }
            if (this.soundOn) OC.sound.sent();
        }

        queueGroup(g, hd) {
            const cid = U.uid();
            const first = g.items[0];
            let fields;
            if (g.type === 'album') {
                fields = {
                    type: 'album',
                    content: g.caption,
                    _meta: { items: g.items.map((it) => ({ url: it.previewUrl, name: it.name, size: it.size, type: it.kind, w: it.w || 0, h: it.h || 0 })) }
                };
            } else {
                fields = {
                    type: g.type,
                    content: g.caption || first.name,
                    file_url: first.previewUrl,
                    file_name: first.name,
                    file_size: first.size,
                    _meta: {
                        ...(first.w && first.h ? { w: first.w, h: first.h } : {}),
                        ...(first.duration && !g.voice ? { duration: Math.round(first.duration) } : {}),
                        ...(g.voice ? g.voiceMeta : {})
                    }
                };
            }
            const m = this.makeLocal(fields, cid);
            const p = this.addPending(m);
            p.uploadType = g.type;
            this.attachUploadUI(p.row, g.type);
            p.job = () => this.runGroup(cid, g, hd);
            p.job();
        }

        async runGroup(cid, g, hd) {
            const p = this.pending.get(cid);
            if (!p) return;
            p.aborts = [];
            p.cancelled = false;
            const progress = g.items.map((it) => (it.result || it.uploaded ? 1 : 0));
            const setP = () => this.setUploadProgress(p.row, progress.reduce((a, b) => a + b, 0) / progress.length);
            setP();
            try {
                const results = [];
                for (let i = 0; i < g.items.length; i++) {
                    const it = g.items[i];
                    if (p.cancelled) return;
                    if (it.uploaded) { results[i] = it.uploaded; continue; }
                    if (it.result) { results[i] = it.result; continue; }
                    let file = it.file;
                    if (it.kind === 'image') {
                        const prep = await OC.Media.prepareImage(file, hd);
                        file = prep.file;
                        it.w = prep.w || it.w;
                        it.h = prep.h || it.h;
                    }
                    if (file.size > this.maxBytes) throw new Error(`« ${it.name} » dépasse ${this.maxMb} Mo`);
                    const up = api.upload(file, {
                        name: file.name || it.name,
                        kind: g.voice ? 'voice' : '',
                        onProgress: (r) => { progress[i] = r * 0.97; setP(); }
                    });
                    p.aborts.push(up.abort);
                    it.result = await up.promise;
                    results[i] = it.result;
                    progress[i] = 1;
                    setP();
                }

                let overrides;
                if (g.type === 'album') {
                    overrides = {
                        type: 'album',
                        content: g.caption,
                        meta: {
                            items: results.map((r, i) => ({
                                url: r.file_url,
                                name: r.file_name,
                                size: r.file_size,
                                type: g.items[i].kind,
                                w: g.items[i].w || 0,
                                h: g.items[i].h || 0,
                                duration: g.items[i].duration ? Math.round(g.items[i].duration) : 0
                            }))
                        }
                    };
                } else {
                    const r = results[0];
                    const it = g.items[0];
                    overrides = {
                        type: g.type,
                        content: g.caption || r.file_name,
                        file_url: r.file_url,
                        file_name: r.file_name,
                        file_size: r.file_size,
                        meta: it.w ? { w: it.w, h: it.h } : {}
                    };
                }
                if (g.prev) await g.prev;
                if (p.cancelled) return;
                const d = await api.send(this.payloadOf(p.m, overrides));
                this.reconcile(cid, this.normalize(d.message));
            } catch (err) {
                if (err.aborted || p.cancelled) return;
                this.markFailed(cid, err.message);
            } finally {
                // never block the following messages, even on failure/cancel
                if (g.markPosted) g.markPosted();
            }
        }

        ringHtml(small = false) {
            return `<span class="progress-ring ${small ? 'small' : ''}" data-act="cancel-upload" role="button" aria-label="Annuler l'envoi" title="Annuler">
                <svg class="ring" viewBox="0 0 52 52"><circle class="ring-track" cx="26" cy="26" r="23"/><circle class="ring-fill" cx="26" cy="26" r="23" stroke-dasharray="144.5" stroke-dashoffset="144.5"/></svg>
                ${icon('x')}
            </span>`;
        }

        attachUploadUI(row, type) {
            this.removeUploadUI(row);
            if (type === 'image' || type === 'video') {
                const media = row.querySelector('.media');
                if (media) media.insertAdjacentHTML('beforeend', `<div class="upload-overlay">${this.ringHtml()}</div>`);
            } else if (type === 'album') {
                const album = row.querySelector('.album');
                if (album) album.insertAdjacentHTML('beforeend', `<div class="upload-overlay">${this.ringHtml()}</div>`);
            } else if (type === 'audio') {
                const voice = row.querySelector('.voice');
                if (voice) {
                    voice.classList.add('uploading');
                    voice.insertAdjacentHTML('afterbegin', this.ringHtml(true));
                }
            } else {
                const dl = row.querySelector('.file-dl');
                if (dl) {
                    dl.hidden = true;
                    dl.insertAdjacentHTML('afterend', this.ringHtml(true));
                }
            }
        }

        removeUploadUI(row) {
            row.querySelectorAll('.upload-overlay, .progress-ring').forEach((el) => el.remove());
            const voice = row.querySelector('.voice.uploading');
            if (voice) voice.classList.remove('uploading');
            const dl = row.querySelector('.file-dl');
            if (dl) dl.hidden = false;
        }

        setUploadProgress(row, ratio) {
            row.querySelectorAll('.ring-fill').forEach((c) => {
                c.setAttribute('stroke-dashoffset', String(144.5 * (1 - U.clamp(ratio, 0, 1))));
            });
        }

        cancelUpload(row) {
            const cid = row.dataset.cid;
            const p = cid && this.pending.get(cid);
            if (!p) return;
            p.cancelled = true;
            (p.aborts || []).forEach((a) => { try { a(); } catch (e) { /* ignore */ } });
            this.pending.delete(cid);
            row.remove();
            this.regroup();
            this.updateEmpty();
            toast('Envoi annulé');
        }

        // ==============================================================
        // Voice recording UI (hold · slide to cancel · slide up to lock)
        // ==============================================================
        bindVoice() {
            const btn = this.els.action;
            const composer = this.els.composer;
            const rec = this.recorder;
            rec.canvas = $('#recCanvas');
            const holdTime = $('#recHoldTime');
            const lockedTime = $('#recLockedTime');
            rec.onTick = (sec) => {
                const t = U.duration(sec);
                if (holdTime.textContent !== t) holdTime.textContent = t;
                if (lockedTime.textContent !== t) lockedTime.textContent = t;
                if (sec >= 600 && rec.state === 'recording') this.finishRecording(true); // 10 min cap
            };

            btn.addEventListener('pointerdown', (e) => {
                if (btn.dataset.mode !== 'mic') {
                    e.preventDefault(); // keep the keyboard open when sending
                    return;
                }
                if (e.button > 0) return;
                e.preventDefault();
                this.beginHold(e);
            });
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('pointermove', (e) => this.moveHold(e));
            btn.addEventListener('pointerup', (e) => this.endHold(e));
            btn.addEventListener('pointercancel', (e) => this.endHold(e, true));
            btn.addEventListener('contextmenu', (e) => e.preventDefault());

            $('#btnRecDelete').addEventListener('click', () => this.cancelRecording());
            $('#btnRecSend').addEventListener('click', () => this.finishRecording(true));
            $('#btnRecPause').addEventListener('click', () => {
                const pb = $('#btnRecPause');
                if (rec.state === 'recording') {
                    rec.pause();
                    $('#recLocked').classList.add('paused');
                    pb.innerHTML = icon('mic');
                    pb.setAttribute('aria-label', 'Reprendre');
                    pb.title = 'Reprendre';
                } else if (rec.state === 'paused') {
                    rec.resume();
                    $('#recLocked').classList.remove('paused');
                    pb.innerHTML = icon('pause');
                    pb.setAttribute('aria-label', 'Pause');
                    pb.title = 'Pause';
                }
            });

            // Prevent accidental navigation while recording
            window.addEventListener('beforeunload', (e) => {
                const sending = Array.from(this.pending.values()).some((p) => !p.m._failed);
                if (rec.state === 'recording' || rec.state === 'paused' || sending) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
            composer.addEventListener('dragstart', (e) => e.preventDefault());
        }

        async beginHold(e) {
            if (!OC.VoiceRecorder.supported()) {
                toast(window.isSecureContext ? 'Votre navigateur ne permet pas l\'enregistrement audio' : 'Le micro nécessite une connexion sécurisée (HTTPS)', { type: 'err', duration: 4000 });
                return;
            }
            if (this.recorder.state !== 'idle') return;
            const btn = this.els.action;
            try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            this.hold = { x: e.clientX, y: e.clientY, t0: performance.now(), released: false, ready: false, locked: false, cancelled: false };
            this.player.stop();
            try {
                const ok = await this.recorder.start();
                if (!ok || !this.hold) return;
            } catch (err) {
                this.hold = null;
                const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
                toast(denied ? 'Accès au micro refusé. Autorisez-le dans les réglages du navigateur.' : 'Micro introuvable ou indisponible', { type: 'err', duration: 4500 });
                return;
            }
            if (this.soundOn) OC.sound.recordStart();
            U.haptic(20);
            if (this.hold.released) {
                // Quick tap (or released during permission prompt) → hands-free mode
                this.enterLocked();
                return;
            }
            this.hold.ready = true;
            this.els.composer.classList.add('rec-holding');
            btn.classList.add('recording');
        }

        moveHold(e) {
            const h = this.hold;
            if (!h || !h.ready || h.locked || h.cancelled) return;
            const dx = Math.min(0, e.clientX - h.x);
            const dy = Math.min(0, e.clientY - h.y);
            const slide = $('#recSlide');
            slide.style.setProperty('--slide', `${dx * 0.8}px`);
            slide.style.setProperty('--slide-o', String(U.clamp(1 + dx / 140, 0, 1)));
            this.els.action.classList.toggle('cancel-armed', dx < -80);
            const lock = $('#recLock');
            lock.style.setProperty('--lift', `${U.clamp(dy * 0.6, -50, 0)}px`);
            lock.classList.toggle('armed', dy < -50);
            if (dx < -120) {
                h.cancelled = true;
                this.cancelRecording();
                U.haptic([15, 30, 15]);
            } else if (dy < -80) {
                this.enterLocked();
                U.haptic(25);
            }
        }

        endHold(e, cancelled = false) {
            const h = this.hold;
            if (!h) return;
            h.released = true;
            try { this.els.action.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            if (!h.ready || h.locked || h.cancelled) return;
            const elapsed = performance.now() - h.t0;
            if (cancelled) {
                this.cancelRecording();
            } else if (elapsed < 350) {
                this.enterLocked();
            } else {
                this.finishRecording(true, true);
            }
        }

        resetHoldUI() {
            this.els.composer.classList.remove('rec-holding');
            this.els.action.classList.remove('recording', 'cancel-armed');
            const slide = $('#recSlide');
            slide.style.removeProperty('--slide');
            slide.style.removeProperty('--slide-o');
            const lock = $('#recLock');
            lock.style.removeProperty('--lift');
            lock.classList.remove('armed');
        }

        enterLocked() {
            if (this.hold) this.hold.locked = true;
            this.resetHoldUI();
            const bar = $('#recLocked');
            bar.hidden = false;
            bar.classList.remove('paused');
            $('#btnRecPause').innerHTML = icon('pause');
            $('#btnRecPause').hidden = !this.recorder.canPause();
            this.els.composer.classList.add('rec-locked-mode');
            this.toggleEmoji(false);
            this.toggleAttach(false);
        }

        exitRecordingUI() {
            this.hold = null;
            this.resetHoldUI();
            $('#recLocked').hidden = true;
            this.els.composer.classList.remove('rec-locked-mode');
        }

        cancelRecording() {
            this.recorder.cancel();
            this.exitRecordingUI();
            if (this.soundOn) OC.sound.cancel();
        }

        async finishRecording(send, fromHold = false) {
            if (this.recorder.state === 'idle') {
                this.exitRecordingUI();
                return;
            }
            const res = await this.recorder.stop();
            this.exitRecordingUI();
            if (!res || !send) return;
            if (res.duration < 0.8 || !res.blob.size) {
                if (fromHold) toast('Maintenez le bouton pour enregistrer, relâchez pour envoyer');
                return;
            }
            this.sendVoice(res);
        }

        sendVoice(res) {
            const mime = res.mime || res.blob.type || 'audio/webm';
            const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
            const name = `vocal_${Date.now()}.${ext}`;
            const file = new File([res.blob], name, { type: mime.split(';')[0] });
            const item = { key: U.uid(), file, kind: 'audio', name, size: file.size, previewUrl: URL.createObjectURL(file), duration: res.duration };
            this.queueGroup({
                type: 'audio',
                items: [item],
                caption: '',
                voice: true,
                voiceMeta: { voice: true, duration: Math.round(res.duration * 10) / 10, waveform: res.waveform }
            }, false);
            if (this.soundOn) OC.sound.sent();
        }

        // ==============================================================
        // Emoji & stickers panel
        // ==============================================================
        bindEmoji() {
            $('#btnEmoji').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEmoji(this.els.emoji.hidden);
            });
            document.addEventListener('click', (e) => {
                if (this.els.emoji.hidden) return;
                if (this.els.emoji.contains(e.target) || e.target.closest('#btnEmoji') || e.target.closest('#composerRow')) return;
                this.toggleEmoji(false);
            });
        }

        buildEmojiPanel() {
            const recents = store.json('openchat_recent_emojis', []);
            const sections = [
                { id: 'recent', tab: '🕘', title: 'Récents', list: recents.length ? recents : ['❤️', '😂', '👍', '🔥', '🙏', '😍', '🎉', '😭'] },
                { id: 'stickers', tab: '✨', title: 'Stickers animés', stickers: true },
                ...EMOJI_CATS
            ];
            this.els.emoji.innerHTML = `
                <div class="emoji-tabs" role="tablist">
                    ${sections.map((s, i) => `<button type="button" class="emoji-tab ${i === 0 ? 'active' : ''}" data-sec="${s.id}" title="${U.esc(s.title)}">${s.tab}</button>`).join('')}
                </div>
                <div class="emoji-scroll">
                    ${sections.map((s) => `
                        <div class="emoji-section" data-sec-id="${s.id}">
                            <div class="emoji-section-title">${U.esc(s.title)}</div>
                            ${s.stickers
                                ? `<div class="sticker-grid">${STICKERS.map((st) => `<button type="button" class="sticker-btn" data-sticker="${st.file}" title="${U.esc(st.name)}"><img src="${st.file}" alt="${U.esc(st.name)}" loading="lazy"></button>`).join('')}</div>`
                                : `<div class="emoji-grid">${s.list.map((em) => `<button type="button" class="emoji-btn">${em}</button>`).join('')}</div>`}
                        </div>`).join('')}
                </div>`;

            const scroller = this.els.emoji.querySelector('.emoji-scroll');
            this.els.emoji.querySelector('.emoji-tabs').addEventListener('click', (e) => {
                const t = e.target.closest('.emoji-tab');
                if (!t) return;
                const sec = this.els.emoji.querySelector(`[data-sec-id="${t.dataset.sec}"]`);
                if (sec) scroller.scrollTo({ top: sec.offsetTop - scroller.offsetTop, behavior: 'smooth' });
            });
            scroller.addEventListener('scroll', () => {
                const top = scroller.scrollTop + scroller.offsetTop + 12;
                let current = 'recent';
                this.els.emoji.querySelectorAll('.emoji-section').forEach((s) => { if (s.offsetTop <= top) current = s.dataset.secId; });
                this.els.emoji.querySelectorAll('.emoji-tab').forEach((t) => t.classList.toggle('active', t.dataset.sec === current));
            }, { passive: true });

            this.els.emoji.addEventListener('click', (e) => {
                const st = e.target.closest('[data-sticker]');
                if (st) {
                    this.sendSticker(st.dataset.sticker);
                    this.toggleEmoji(false);
                    return;
                }
                const b = e.target.closest('.emoji-btn');
                if (b) this.insertEmoji(b.textContent.trim());
            });
            this.emojiBuilt = true;
        }

        toggleEmoji(show) {
            if (show && !this.emojiBuilt) this.buildEmojiPanel();
            this.els.emoji.hidden = !show;
            $('#btnEmoji').classList.toggle('active', !!show);
            if (show) {
                this.toggleAttach(false);
                if (U.isTouch) this.els.input.blur();
                if (this.stick) requestAnimationFrame(() => this.scrollToBottom(true));
            }
        }

        insertEmoji(em) {
            const input = this.els.input;
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            input.value = input.value.slice(0, start) + em + input.value.slice(end);
            const pos = start + em.length;
            if (!U.isTouch) input.focus();
            try { input.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
            this.autosize();
            this.updateActionMode();
            this.onTypingInput();
            const rec = store.json('openchat_recent_emojis', []).filter((x) => x !== em);
            rec.unshift(em);
            store.setJson('openchat_recent_emojis', rec.slice(0, 32));
        }

        // ==============================================================
        // Attachment menu
        // ==============================================================
        bindAttach() {
            $('#btnAttach').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAttach(this.els.attach.hidden);
            });
            this.els.attach.addEventListener('click', (e) => {
                const b = e.target.closest('[data-pick]');
                if (!b) return;
                const map = { media: '#inputMedia', camera: '#inputCamera', doc: '#inputDoc', audio: '#inputAudio' };
                $(map[b.dataset.pick]).click();
                this.toggleAttach(false);
            });
            document.addEventListener('click', (e) => {
                if (this.els.attach.hidden) return;
                if (this.els.attach.contains(e.target) || e.target.closest('#btnAttach')) return;
                this.toggleAttach(false);
            });
        }

        toggleAttach(show) {
            this.els.attach.hidden = !show;
            $('#btnAttach').classList.toggle('active', !!show);
            if (show) this.toggleEmoji(false);
        }

        // ==============================================================
        // Drag & drop
        // ==============================================================
        bindDrop() {
            const zone = $('#dropzone');
            let depth = 0;
            const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
            window.addEventListener('dragenter', (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth++;
                zone.classList.add('show');
            });
            window.addEventListener('dragover', (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });
            window.addEventListener('dragleave', (e) => {
                if (!hasFiles(e)) return;
                depth = Math.max(0, depth - 1);
                if (!depth) zone.classList.remove('show');
            });
            window.addEventListener('drop', (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth = 0;
                zone.classList.remove('show');
                if (e.dataTransfer.files.length) this.addFiles(e.dataTransfer.files);
            });
        }

        // ==============================================================
        // Message interactions (tap, double-tap, long-press, swipe-to-reply)
        // ==============================================================
        bindMessages() {
            const box = this.els.messages;

            box.addEventListener('click', (e) => {
                const t = e.target;
                const row = t.closest('.msg-row');

                const lb = t.closest('[data-lb]');
                if (lb) {
                    e.preventDefault();
                    if (t.closest('[data-act="cancel-upload"]')) {
                        this.cancelUpload(row);
                        return;
                    }
                    this.openLightboxAt(lb);
                    return;
                }
                const act = t.closest('[data-act]');
                if (act && row) {
                    e.preventDefault();
                    this.handleAction(act.dataset.act, row, act);
                    return;
                }
                const rx = t.closest('[data-react]');
                if (rx && row && row._msg && row._msg.id) {
                    this.react(row._msg.id, rx.dataset.react);
                    return;
                }
                const q = t.closest('[data-jump]');
                if (q) {
                    this.jumpTo(q.dataset.jump);
                    return;
                }
                const vp = t.closest('.voice-play');
                if (vp) {
                    this.player.toggle(vp.closest('.voice'));
                    return;
                }
                const sp = t.closest('.voice-speed');
                if (sp) {
                    this.player.cycleRate(sp.closest('.voice'));
                    return;
                }
                if (t.closest('a[href], button, video, audio, .voice-wave')) return;

                // Double tap → ❤️
                const bubble = t.closest('.bubble');
                if (bubble && row && row._msg && row._msg.id) {
                    const now = Date.now();
                    if (this.lastTap && this.lastTap.row === row && now - this.lastTap.t < 320) {
                        this.lastTap = null;
                        this.heartPop(bubble);
                        const users = row._msg._rx['❤️'] || [];
                        if (!users.some((u) => this.myNames.has(u))) this.react(row._msg.id, '❤️');
                    } else {
                        this.lastTap = { row, t: now };
                    }
                }
            });

            box.addEventListener('pointerdown', (e) => {
                const wave = e.target.closest('.voice-wave');
                if (wave && !wave.closest('.msg-row.pending')) {
                    e.preventDefault();
                    this.player.scrub(wave.closest('.voice'), e);
                }
            });

            box.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act="open-file"]')) {
                    e.preventDefault();
                    this.handleAction('open-file', e.target.closest('.msg-row'));
                }
            });

            box.addEventListener('contextmenu', (e) => {
                const bubble = e.target.closest('.bubble');
                if (!bubble || e.target.closest('a[href]:not([data-lb])')) return;
                e.preventDefault();
                this.openCtx(bubble.closest('.msg-row'));
            });

            // Touch: long-press + swipe-to-reply
            let touch = null;
            box.addEventListener('touchstart', (e) => {
                const bubble = e.target.closest('.bubble');
                if (!bubble || e.touches.length > 1 || e.target.closest('.voice-wave, video, .progress-ring')) return;
                const row = bubble.closest('.msg-row');
                const p = e.touches[0];
                touch = { row, bubble, col: row.querySelector('.msg-col'), x: p.clientX, y: p.clientY, mode: null, fired: false };
                bubble.classList.add('is-pressing');
                touch.timer = setTimeout(() => {
                    if (!touch || touch.mode) return;
                    touch.fired = true;
                    bubble.classList.remove('is-pressing');
                    U.haptic(25);
                    this.openCtx(row);
                }, 430);
            }, { passive: true });

            box.addEventListener('touchmove', (e) => {
                if (!touch) return;
                const p = e.touches[0];
                const dx = p.clientX - touch.x;
                const dy = p.clientY - touch.y;
                if (!touch.mode) {
                    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
                    clearTimeout(touch.timer);
                    touch.bubble.classList.remove('is-pressing');
                    touch.mode = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.4 && touch.row._msg && touch.row._msg.id ? 'swipe' : 'scroll';
                }
                if (touch.mode === 'swipe') {
                    const off = U.clamp(dx * 0.55, 0, 78);
                    touch.col.style.transition = 'none';
                    touch.col.style.transform = `translateX(${off}px)`;
                    const ic = touch.col.querySelector('.swipe-reply');
                    ic.style.opacity = String(U.clamp(off / 60, 0, 1));
                    ic.style.transform = `scale(${0.5 + U.clamp(off / 60, 0, 1) * 0.5}) translateX(${-off * 0.4}px)`;
                    if (off >= 60 && !touch.armed) {
                        touch.armed = true;
                        U.haptic(12);
                    } else if (off < 60) {
                        touch.armed = false;
                    }
                }
            }, { passive: true });

            const endTouch = (e) => {
                if (!touch) return;
                clearTimeout(touch.timer);
                touch.bubble.classList.remove('is-pressing');
                if (touch.mode === 'swipe') {
                    touch.col.style.transition = '';
                    touch.col.style.transform = '';
                    const ic = touch.col.querySelector('.swipe-reply');
                    ic.style.opacity = '';
                    ic.style.transform = '';
                    if (touch.armed) this.setReply(touch.row._msg);
                }
                if (touch.fired && e.cancelable) e.preventDefault();
                touch = null;
            };
            box.addEventListener('touchend', endTouch);
            box.addEventListener('touchcancel', endTouch);
        }

        heartPop(bubble) {
            const h = document.createElement('span');
            h.className = 'heart-pop';
            h.textContent = '❤️';
            bubble.appendChild(h);
            U.haptic(18);
            setTimeout(() => h.remove(), 900);
        }

        handleAction(act, row, el) {
            const m = row && row._msg;
            if (!m) return;
            switch (act) {
                case 'react':
                case 'more':
                    this.openCtx(row);
                    break;
                case 'reply':
                    this.setReply(m);
                    break;
                case 'download':
                    this.download(this.fileUrlOf(m), m.file_name);
                    break;
                case 'open-file':
                    if (this.fileUrlOf(m)) window.open(U.inlineUrl(this.fileUrlOf(m), m.file_name), '_blank', 'noopener');
                    break;
                case 'retry':
                    this.retry(row);
                    break;
                case 'cancel-upload':
                    this.cancelUpload(row);
                    break;
                default:
                    break;
            }
        }

        async react(id, emoji) {
            const m = this.msgs.get(id);
            if (!m) return;
            const users = (m._rx[emoji] || []).slice();
            const mineIdx = users.findIndex((u) => this.myNames.has(u));
            if (mineIdx >= 0 && users[mineIdx] === this.username) users.splice(mineIdx, 1);
            else if (mineIdx < 0) users.push(this.username);
            const before = m._rx;
            m._rx = { ...m._rx };
            if (users.length) m._rx[emoji] = users; else delete m._rx[emoji];
            const row = this.rows.get(id);
            if (row) this.renderReactions(row, m._rx, true);
            U.haptic(10);
            try {
                const d = await api.react(id, emoji, this.username);
                this.applyReactions(id, d.reactions);
            } catch (e) {
                m._rx = before;
                if (row) this.renderReactions(row, m._rx);
                toast('Réaction non envoyée', { type: 'err' });
            }
        }

        openLightboxAt(el) {
            const nodes = $$('#messages [data-lb]');
            const items = nodes.map((n) => {
                const row = n.closest('.msg-row');
                const m = row && row._msg;
                const d = m ? U.parseDate(m.created_at) : null;
                return {
                    type: n.dataset.lbType,
                    url: n.dataset.lbUrl,
                    name: n.dataset.lbName,
                    caption: m ? this.captionOf(m) : '',
                    sender: m ? (this.isMine(m) ? 'Vous' : m.sender) : '',
                    time: d ? d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
                };
            });
            const idx = Math.max(0, nodes.indexOf(el));
            // Show the local preview while the remote URL is used for actions
            const viewItems = items.map((it, i) => {
                const img = nodes[i].querySelector('img');
                return img && img.src && img.src.startsWith('blob:') ? { ...it, viewUrl: img.src } : it;
            });
            this.lightbox.open(viewItems.map((it) => ({ ...it, url: it.viewUrl || it.url, remote: it.url })), idx);
        }

        // ==============================================================
        // Context menu
        // ==============================================================
        bindContextMenu() {
            const backdrop = this.els.ctxBackdrop;
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.closeOverlay('ctx');
            });
            backdrop.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.closeOverlay('ctx');
            });
            $('#ctxReactions').addEventListener('click', async (e) => {
                const b = e.target.closest('[data-emoji]');
                if (!b || !this.ctxMsg) return;
                const m = this.ctxMsg;
                await this.closeOverlay('ctx');
                this.react(m.id, b.dataset.emoji);
            });
            this.els.ctxMenu.querySelector('.ctx-actions').addEventListener('click', async (e) => {
                const b = e.target.closest('[data-ctx]');
                if (!b || !this.ctxMsg) return;
                const m = this.ctxMsg;
                await this.closeOverlay('ctx');
                const url = this.fileUrlOf(m);
                switch (b.dataset.ctx) {
                    case 'reply': this.setReply(m); break;
                    case 'copy': OC.copy(this.copyTextOf(m), 'Copié'); break;
                    case 'share': this.shareMessage(m); break;
                    case 'download':
                        if (m.type === 'album') this.downloadAlbum(m);
                        else this.download(url, m.file_name);
                        break;
                    case 'open': if (url) window.open(U.inlineUrl(url, m.file_name), '_blank', 'noopener'); break;
                    default: break;
                }
            });
        }

        copyTextOf(m) {
            if (m.type === 'text' || m.type === 'link') return m.content;
            const cap = this.captionOf(m);
            if (cap) return cap;
            if (m.type === 'album') return ((m._remoteItems || (m._meta && m._meta.items)) || []).map((i) => i.url).join('\n');
            return this.fileUrlOf(m) || m.content || '';
        }

        openCtx(row) {
            const m = row && row._msg;
            if (!m || !m.id || m._pending || this.isOverlayOpen('ctx')) return;
            this.ctxMsg = m;
            const bubble = row.querySelector('.bubble');
            const menu = this.els.ctxMenu;

            $$('#ctxReactions [data-emoji]').forEach((b) => {
                const users = m._rx[b.dataset.emoji] || [];
                b.classList.toggle('mine', users.some((u) => this.myNames.has(u)));
            });
            const hasFile = !!this.fileUrlOf(m) && m.type !== 'sticker';
            const copyText = this.copyTextOf(m);
            menu.querySelector('[data-ctx="copy"]').hidden = !copyText;
            $('#ctxCopyLabel').textContent = (m.type === 'text' || this.captionOf(m)) ? 'Copier le texte' : 'Copier le lien';
            menu.querySelector('[data-ctx="download"]').hidden = !(hasFile || m.type === 'album');
            menu.querySelector('[data-ctx="open"]').hidden = m.type !== 'file';

            this.els.ctxBackdrop.hidden = false;
            $$('.bubble.ctx-active').forEach((b) => b.classList.remove('ctx-active'));
            bubble.classList.add('ctx-active');

            // Position near the bubble, always inside the viewport
            const r = bubble.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const mw = Math.min(264, vw - 24);
            menu.style.width = `${mw}px`;
            const mh = menu.offsetHeight || 300;
            let left = this.isMine(m) ? r.right - mw : r.left;
            left = U.clamp(left, 12, vw - mw - 12);
            let top = r.bottom + 8;
            if (top + mh > vh - 12) top = r.top - mh - 8;
            if (top < 12) top = U.clamp(vh / 2 - mh / 2, 12, vh - mh - 12);
            menu.style.left = `${Math.round(left)}px`;
            menu.style.top = `${Math.round(top)}px`;

            this.pushOverlay('ctx', () => {
                this.els.ctxBackdrop.hidden = true;
                bubble.classList.remove('ctx-active');
            });
        }

        // ==============================================================
        // Download & share
        // ==============================================================
        download(url, name) {
            if (!url) return;
            const a = document.createElement('a');
            a.href = U.downloadUrl(url, name);
            a.download = name || '';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast('Téléchargement lancé', { type: 'ok' });
        }

        downloadAlbum(m) {
            const items = (m._remoteItems || (m._meta && m._meta.items)) || [];
            items.forEach((it, i) => setTimeout(() => this.download(it.url, it.name), i * 400));
        }

        guessMime(name) {
            const e = U.ext(name);
            const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', pdf: 'application/pdf', txt: 'text/plain' };
            return map[e] || 'application/octet-stream';
        }

        async shareFile(url, name, text) {
            if (!url) return;
            const remote = url;
            if (navigator.share && navigator.canShare) {
                try {
                    const res = await fetch(U.inlineUrl(remote, name));
                    if (res.ok) {
                        const blob = await res.blob();
                        if (blob.size < 50 * 1024 * 1024) {
                            const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : this.guessMime(name);
                            const file = new File([blob], name || 'fichier', { type });
                            if (navigator.canShare({ files: [file] })) {
                                await navigator.share({ files: [file], title: name, text: text || undefined });
                                return;
                            }
                        }
                    }
                } catch (e) {
                    if (e && e.name === 'AbortError') return;
                }
            }
            const shareable = /^https?:/i.test(remote) ? remote : this.shareUrl;
            if (navigator.share) {
                try {
                    await navigator.share({ title: name || 'OpenChat', text: text || name || '', url: shareable });
                    return;
                } catch (e) {
                    if (e && e.name === 'AbortError') return;
                }
            }
            OC.copy(shareable, 'Lien copié — collez-le dans WhatsApp, Telegram…');
        }

        async shareMessage(m) {
            const url = this.fileUrlOf(m);
            if (url && ['image', 'video', 'audio', 'file'].includes(m.type)) {
                this.shareFile(url, m.file_name, this.captionOf(m));
                return;
            }
            if (m.type === 'album') {
                const first = ((m._remoteItems || (m._meta && m._meta.items)) || [])[0];
                if (first) this.shareFile(first.url, first.name, this.captionOf(m));
                return;
            }
            const text = m.type === 'sticker' ? '' : m.content;
            if (navigator.share) {
                try {
                    await navigator.share({ text: text || 'OpenChat', ...(m.type === 'sticker' ? { url: this.shareUrl } : {}) });
                    return;
                } catch (e) {
                    if (e && e.name === 'AbortError') return;
                }
            }
            OC.copy(text, 'Texte copié — collez-le où vous voulez');
        }

        // ==============================================================
        // Notifications, visibility, PWA
        // ==============================================================
        notify(m) {
            if (this.soundOn) OC.sound.incoming();
            if (!document.hidden) return;
            this.hiddenUnread++;
            document.title = `(${this.hiddenUnread}) ${this.baseTitle}`;
            if (navigator.setAppBadge) navigator.setAppBadge(this.hiddenUnread).catch(() => {});
            this.systemNotification(m);
        }

        async systemNotification(m) {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;
            const title = `${m.sender} · ${this.isPublic ? 'Salon public' : this.room}`;
            const opts = {
                body: this.previewText(m).slice(0, 140),
                icon: 'assets/icons/icon-192.png',
                badge: 'assets/icons/icon-192.png',
                tag: `openchat-${this.room}`,
                renotify: true,
                data: { url: `./index.php?code=${encodeURIComponent(this.room)}` }
            };
            try {
                const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
                if (reg) {
                    await reg.showNotification(title, opts);
                    return;
                }
            } catch (e) { /* fallback */ }
            try {
                const n = new Notification(title, opts);
                n.onclick = () => { window.focus(); n.close(); };
            } catch (e) { /* not supported (Android needs SW) */ }
        }

        bindVisibility() {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stopTyping();
                    return;
                }
                this.hiddenUnread = 0;
                document.title = this.baseTitle;
                if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
                if (!this.es || this.es.readyState === 2) this.connect();
                this.ping();
            });
            window.addEventListener('online', () => {
                toast('Connexion rétablie', { type: 'ok' });
                this.connect();
            });
            window.addEventListener('offline', () => {
                this.setConnected(false);
                toast('Vous êtes hors ligne', { type: 'err' });
            });
        }

        setupNotifBanner() {
            const banner = $('#notifBanner');
            if (!('Notification' in window) || Notification.permission !== 'default') return;
            const dismissed = parseInt(store.get('openchat_notif_dismissed', '0'), 10);
            if (Date.now() - dismissed < 7 * 86400000) return;
            setTimeout(() => { banner.hidden = false; }, 5000);
            $('#btnAllowNotif').addEventListener('click', () => {
                banner.hidden = true;
                this.requestNotifications();
            });
            $('#btnDismissNotif').addEventListener('click', () => {
                banner.hidden = true;
                store.set('openchat_notif_dismissed', String(Date.now()));
            });
        }

        async requestNotifications() {
            if (!('Notification' in window)) return;
            try {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') toast('Notifications activées', { type: 'ok' });
                else toast('Notifications refusées', { type: 'err' });
            } catch (e) { /* ignore */ }
            $('#btnSettingsNotif').hidden = Notification.permission !== 'default';
        }

        setupPWA() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js').catch(() => {});
            }
            const buttons = ['#btnInstallHeader', '#btnInstallSidebar', '#menuInstall'].map((s) => $(s));
            const show = (on) => buttons.forEach((b) => { if (b) b.hidden = !on; });

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.installPrompt = e;
                show(true);
            });
            window.addEventListener('appinstalled', () => {
                this.installPrompt = null;
                show(false);
                toast('OpenChat est installé ! Il apparaît maintenant dans le menu « Partager » de vos apps.', { type: 'ok', duration: 5000 });
            });
            if (U.isIOS && !U.isStandalone) $('#menuInstall').hidden = false;
            buttons.forEach((b) => b && b.addEventListener('click', () => this.install()));
        }

        async install() {
            if (this.installPrompt) {
                this.installPrompt.prompt();
                try { await this.installPrompt.userChoice; } catch (e) { /* ignore */ }
                this.installPrompt = null;
                return;
            }
            if (U.isIOS) toast('Sur iPhone : touchez Partager ⬆️ puis « Sur l\'écran d\'accueil »', { duration: 6000 });
            else toast('Menu du navigateur ⋮ → « Installer l\'application »', { duration: 5000 });
        }

        // ==============================================================
        // QR pairing
        // ==============================================================
        checkPairing() {
            const p = new URLSearchParams(location.search);
            const token = p.get('paired');
            if (!token) return;
            p.delete('paired');
            this.replaceQuery(p);
            api.send({ room_code: this.room, sender: this.username, type: 'peer_joined', content: token }).catch(() => {});
            toast('Appareil connecté à ce salon 🎉', { type: 'ok' });
        }

        onPeerJoined(m) {
            if (!this.pairToken || m.content !== this.pairToken) return;
            const status = $('#qrStatus');
            status.classList.add('success');
            status.innerHTML = `${icon('check', 'ic-sm')} Appareil connecté !`;
            if (this.soundOn) OC.sound.success();
            toast('Nouvel appareil connecté 🎉', { type: 'ok' });
            this.pairToken = null;
            setTimeout(() => this.closeOverlay('inviteModal'), 1300);
        }

        // ==============================================================
        // Receiving shares from other apps (PWA share target)
        // ==============================================================
        async handleIncomingShare() {
            const p = new URLSearchParams(location.search);
            let payload = null;
            let source = null;

            if (p.get('shared') === 'error') {
                toast('Le partage n\'a pas pu être reçu', { type: 'err' });
            } else if (p.get('shared') === '1') {
                payload = await this.readSharedCache();
                source = 'cache';
            } else if (p.get('shared') === 'session') {
                try { payload = JSON.parse(sessionStorage.getItem('openchat_share_payload') || 'null'); } catch (e) { payload = null; }
                source = 'session';
            } else if (p.get('share')) {
                try {
                    const res = await fetch(`share.php?token=${encodeURIComponent(p.get('share'))}`, { cache: 'no-store' });
                    const d = await res.json();
                    if (d.success) payload = { title: d.share.title, text: d.share.text, url: d.share.url, uploaded: d.share.files || [], errors: d.share.errors || [] };
                    else toast(d.error || 'Partage expiré', { type: 'err' });
                } catch (e) { toast('Partage expiré', { type: 'err' }); }
                source = 'session';
            } else if (p.get('shared_text') || p.get('shared_url') || p.get('shared_title')) {
                payload = { title: p.get('shared_title') || '', text: p.get('shared_text') || '', url: p.get('shared_url') || '' };
                source = 'session';
            }

            const direct = p.get('direct') === '1';
            ['shared', 'share', 'shared_text', 'shared_url', 'shared_title', 'direct'].forEach((k) => p.delete(k));
            this.replaceQuery(p);

            if (!payload || (!payload.text && !payload.url && !payload.title && !(payload.files || []).length && !(payload.uploaded || []).length)) return;
            if (direct) {
                this.applyShare(payload, source);
                return;
            }
            this.pendingShare = { payload, source, used: false };
            this.renderShareModal();
            this.openModal('shareModal');
        }

        async readSharedCache() {
            if (!('caches' in window)) return null;
            try {
                const cache = await caches.open('openchat-share');
                const metaRes = await cache.match('__share__/meta.json');
                if (!metaRes) return null;
                const meta = await metaRes.json();
                const files = [];
                for (const f of meta.files || []) {
                    const r = await cache.match(`__share__/${f.key}`);
                    if (!r) continue;
                    const blob = await r.blob();
                    files.push(new File([blob], f.name, { type: f.type || blob.type, lastModified: Date.now() }));
                }
                return { title: meta.title, text: meta.text, url: meta.url, files };
            } catch (e) {
                return null;
            }
        }

        clearSharedCache() {
            if ('caches' in window) caches.delete('openchat-share').catch(() => {});
        }

        shareText(payload) {
            const parts = [];
            const text = (payload.text || '').trim();
            const url = (payload.url || '').trim();
            const title = (payload.title || '').trim();
            if (title && !text && !url) parts.push(title);
            if (text) parts.push(text);
            if (url && !text.includes(url)) parts.push(url);
            return parts.join('\n').trim();
        }

        renderShareModal() {
            const { payload } = this.pendingShare;
            const files = payload.files || [];
            const uploaded = payload.uploaded || [];
            const count = files.length + uploaded.length;
            const text = this.shareText(payload);

            const thumbs = [
                ...files.slice(0, 3).map((f) => (U.kindOf(f) === 'image'
                    ? `<img class="share-thumb" src="${URL.createObjectURL(f)}" alt="">`
                    : `<span class="share-thumb">${icon(U.kindOf(f) === 'video' ? 'video' : U.kindOf(f) === 'audio' ? 'music' : 'file')}</span>`)),
                ...uploaded.slice(0, 3).map((u) => (u.type === 'image'
                    ? `<img class="share-thumb" src="${U.esc(U.safeUrl(u.file_url))}" alt="">`
                    : `<span class="share-thumb">${icon(u.type === 'video' ? 'video' : u.type === 'audio' ? 'music' : 'file')}</span>`))
            ].slice(0, 3).join('');

            $('#sharePreview').innerHTML = `
                ${thumbs ? `<div class="share-thumbs">${thumbs}</div>` : `<span class="share-thumb">${icon('link')}</span>`}
                <div class="share-preview-text">
                    <strong>${count ? `${count} fichier${count > 1 ? 's' : ''}` : 'Texte partagé'}</strong>
                    <span>${U.esc(text || files.map((f) => f.name).join(', ') || uploaded.map((u) => u.file_name).join(', '))}</span>
                </div>`;

            const rooms = [];
            if (!this.isPublic) rooms.push({ code: this.room, label: `${this.room}`, sub: 'Salon actuel' });
            rooms.push({ code: 'public', label: 'Salon public', sub: 'Visible par tout le monde' });
            this.recentRooms().filter((r) => r.code !== this.room).slice(0, 8).forEach((r) => rooms.push({ code: r.code, label: r.code, sub: r.at ? `Visité ${U.ago(r.at)}` : 'Salon privé' }));

            const box = $('#shareRooms');
            box.innerHTML = rooms.map((r) => `
                <button type="button" class="room-item" data-share-room="${U.esc(r.code)}">
                    ${this.roomAvatar(r.code)}
                    <span class="room-item-body">
                        <span class="room-item-title">${U.esc(r.label)}</span>
                        <span class="room-item-sub">${U.esc(r.sub)}</span>
                    </span>
                    ${icon('chevron-right', 'ic-sm muted')}
                </button>`).join('');

            if (!this._shareBound) {
                this._shareBound = true;
                box.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-share-room]');
                    if (b) this.chooseShareRoom(b.dataset.shareRoom);
                });
                $('#btnShareNewRoom').addEventListener('click', async () => {
                    try {
                        const d = await api.createRoom();
                        this.chooseShareRoom(d.room.code);
                    } catch (e) { toast(e.message, { type: 'err' }); }
                });
            }
        }

        async chooseShareRoom(code) {
            const ps = this.pendingShare;
            if (!ps) return;
            ps.used = true;
            if (code === this.room) {
                await this.closeOverlay('shareModal');
                this.applyShare(ps.payload, ps.source);
                this.pendingShare = null;
                return;
            }
            if (ps.source === 'cache') {
                location.href = `index.php?code=${encodeURIComponent(code)}&shared=1&direct=1`;
            } else {
                const { title, text, url, uploaded } = ps.payload;
                try { sessionStorage.setItem('openchat_share_payload', JSON.stringify({ title, text, url, uploaded })); } catch (e) { /* ignore */ }
                location.href = `index.php?code=${encodeURIComponent(code)}&shared=session&direct=1`;
            }
        }

        applyShare(payload, source) {
            const text = this.shareText(payload);
            const items = [
                ...(payload.files || []).map((f) => OC.MediaSheet.itemFromFile(f)),
                ...(payload.uploaded || []).map((u) => OC.MediaSheet.itemFromUploaded(u))
            ];
            if (items.length) {
                this.sheet.open(items, text);
            } else if (text) {
                this.els.input.value = text;
                this.autosize();
                this.updateActionMode();
                this.els.input.focus();
                toast('Contenu prêt : vérifiez puis envoyez', { type: 'ok' });
            }
            (payload.errors || []).forEach((err) => toast(err, { type: 'err', duration: 4500 }));
            if (source === 'cache') this.clearSharedCache();
            if (source === 'session') {
                try { sessionStorage.removeItem('openchat_share_payload'); } catch (e) { /* ignore */ }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.openChatApp = new App();
    });
})();
