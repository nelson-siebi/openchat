<?php
/**
 * OpenChat - Application Principale
 * Salon Public par défaut & Salons Privés instantanés
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/Config.php';
require_once __DIR__ . '/includes/Database.php';

// Determine initial room: defaults to 'public' if no code provided
$requestedCode = trim($_GET['code'] ?? '');
if (empty($requestedCode)) {
    $requestedCode = 'public';
}

$room = Database::getOrCreateRoom($requestedCode, $requestedCode === 'public' ? 'Salon Public Général' : '');
$isPublicRoom = ($room['code'] === 'public');

$pageTitle = $isPublicRoom ? 'OpenChat - Chat & Partage Instantané Sans Inscription' : 'Salon Privé ' . htmlspecialchars($room['code']) . ' - OpenChat';
$pageDesc = 'Partagez en 1 seconde chrono des messages, liens, photos, vocaux et fichiers entre PC et Smartphone ou avec vos amis sans compte ni mot de passe.';
$canonicalUrl = Config::getBaseUrl() . '/index.php' . ($isPublicRoom ? '' : '?code=' . urlencode($room['code']));
$ogImage = Config::getBaseUrl() . '/assets/img/logo.png';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <!-- SEO Standard Meta -->
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta name="keywords" content="chat instantané, partage fichier rapide, transfert pc mobile, pwa chat, chat sans inscription, open source chat, drop rapide, backblaze b2">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="<?= htmlspecialchars($canonicalUrl) ?>">

    <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta property="og:url" content="<?= htmlspecialchars($canonicalUrl) ?>">
    <meta property="og:image" content="<?= htmlspecialchars($ogImage) ?>">
    <meta property="og:site_name" content="OpenChat">

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= htmlspecialchars($pageTitle) ?>">
    <meta name="twitter:description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta name="twitter:image" content="<?= htmlspecialchars($ogImage) ?>">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "OpenChat",
      "url": "https://openchat.izyboost.site",
      "description": "Plateforme de chat instantané et de partage de fichiers sans compte.",
      "applicationCategory": "CommunicationApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
    </script>

    <!-- PWA & Mobile Icons -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#020617">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="OpenChat">
    <link rel="apple-touch-icon" href="assets/icons/icon.svg">
    <link rel="icon" type="image/svg+xml" href="assets/icons/icon.svg">

    <!-- Styles -->
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>

    <!-- Notification Permission Top Banner -->
    <div id="notificationBanner" class="notification-banner" style="display: none;">
        <span>🔔 <strong>Activez les notifications</strong> pour être averti en direct des nouveaux messages et fichiers même en arrière-plan.</span>
        <div class="notification-banner-actions">
            <button id="btnAllowNotifications" class="btn btn-primary btn-sm">Autoriser</button>
            <button id="btnDismissNotifications" class="btn btn-outline btn-sm">Plus tard</button>
        </div>
    </div>

    <!-- Header -->
    <header class="app-header">
        <div class="header-left">
            <button id="btnToggleSidebar" class="btn-icon" title="Menu des Salons" aria-label="Menu">
                ☰
            </button>

            <a href="index.php" class="logo-area" title="OpenChat Accueil">
                <img src="assets/img/logo.svg" alt="OpenChat" class="app-logo-img" onerror="this.src='assets/img/logo.png'">
            </a>

            <div class="room-header-details">
                <div class="room-badge <?= $isPublicRoom ? '' : 'private' ?>" id="currentRoomBadge">
                    <span class="pulse-dot"></span>
                    <span id="roomCodeDisplay"><?= $isPublicRoom ? '🌍 Salon Public' : '🔒 ' . htmlspecialchars($room['code']) ?></span>
                </div>
                <button type="button" class="header-members-pill" id="btnOpenMembersModal" title="Voir les membres du salon">
                    <span class="members-online-dot"></span>
                    <span id="headerOnlineCount">1 en ligne</span>
                </button>
            </div>
        </div>

        <div class="header-actions">
            <!-- PWA Install Button -->
            <button id="btnPwaInstall" class="btn btn-primary btn-sm" style="display: none;" title="Installer l'application">
                📲 <span class="btn-text-hide">Installer</span>
            </button>

            <!-- Quick Desktop Buttons -->
            <button id="btnShowQr" class="btn btn-outline btn-sm btn-desktop-only" title="Connecter un autre appareil (QR Code)">
                📱 <span>Connecter</span>
            </button>

            <button id="btnCopyShareLink" class="btn btn-outline btn-sm btn-desktop-only" title="Copier le lien direct du salon">
                🔗 <span>Partager</span>
            </button>

            <!-- Settings / Customization Button -->
            <button id="btnOpenSettings" class="btn btn-outline btn-sm" title="Personnalisation & Paramètres">
                ⚙️ <span id="headerUsernameShort" class="btn-text-hide">Paramètres</span>
            </button>

            <!-- Dropdown More Menu Button -->
            <div class="header-more-container">
                <button id="btnHeaderMore" class="btn-icon" title="Plus d'options">
                    ⋮
                </button>
                <div id="headerMoreDropdown" class="header-more-dropdown" style="display: none;">
                    <button type="button" class="more-dropdown-item" id="menuItemQr">
                        <span>📱</span> Connecter un appareil (QR)
                    </button>
                    <button type="button" class="more-dropdown-item" id="menuItemShare">
                        <span>🔗</span> Copier le lien du salon
                    </button>
                    <button type="button" class="more-dropdown-item" id="menuItemMembers">
                        <span>👥</span> Membres du salon (<span id="menuOnlineCount">1</span>)
                    </button>
                    <button type="button" class="more-dropdown-item" id="menuItemToggleSound">
                        <span id="menuSoundIcon">🔔</span> Sons des messages
                    </button>
                    <button type="button" class="more-dropdown-item" id="menuItemPwa" style="display: none;">
                        <span>📲</span> Installer OpenChat PWA
                    </button>
                    <div class="dropdown-divider"></div>
                    <button type="button" class="more-dropdown-item danger" id="menuItemLeave">
                        <span>🚪</span> Quitter ce salon
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Overlay for mobile drawer -->
    <div id="sidebarOverlay" class="sidebar-overlay"></div>

    <div class="app-container">
        <!-- Sidebar Drawer -->
        <aside id="appSidebar" class="sidebar">
            <div class="sidebar-header">
                <span class="sidebar-title">Espaces de discussion</span>
                <button id="btnCloseSidebar" class="btn-icon" style="width: 28px; height: 28px; font-size: 0.8rem;">✕</button>
            </div>

            <div class="sidebar-content">
                <!-- Salon Public -->
                <div>
                    <a href="index.php" class="room-nav-item <?= $isPublicRoom ? 'active' : '' ?>">
                        <span class="room-nav-icon">🌍</span>
                        <div class="room-nav-info">
                            <div class="room-nav-name">Salon Public Général</div>
                            <div class="room-nav-sub">Accessible à tous en direct</div>
                        </div>
                    </a>
                </div>

                <!-- Salons Privés Section -->
                <div>
                    <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin: 0.75rem 0.5rem 0.5rem;">
                        Salons Privés (Éphémères)
                    </div>

                    <button id="btnOpenCreateModal" class="btn btn-secondary btn-sm" style="width: 100%; margin-bottom: 0.75rem;">
                        ➕ Nouveau salon privé
                    </button>

                    <button id="btnOpenJoinModal" class="btn btn-outline btn-sm" style="width: 100%; margin-bottom: 0.75rem;">
                        🔑 Rejoindre avec un code
                    </button>

                    <!-- Recent Rooms List -->
                    <div id="recentRoomsList" style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <!-- Injected via JavaScript from localStorage -->
                    </div>
                </div>
            </div>

            <div class="sidebar-footer">
                <a href="https://github.com/nelson-siebi/openchat" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="width: 100%;">
                    ⭐ Code Source GitHub
                </a>
            </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="chat-main">
            <?php if ($isPublicRoom): ?>
                <div class="public-banner">
                    <span>💡 <strong>Salon Public :</strong> Messages, photos, vidéos, vocaux et fichiers partagés ici. Pour un échange confidentiel, créez un salon privé.</span>
                </div>
            <?php endif; ?>

            <!-- Drag & Drop overlay indicator -->
            <div id="dropzoneOverlay" class="dropzone-overlay">
                📥 Déposez vos photos, vidéos ou documents ici !
            </div>

            <!-- Messages Stream Container -->
            <div id="chatMessages" class="chat-messages">
                <!-- Messages will be injected dynamically -->
            </div>

            <!-- Smart Scroll Down Button -->
            <button id="btnScrollBottom" class="scroll-bottom-btn" title="Descendre aux nouveaux messages">
                ⬇️ <span id="scrollBottomText">Nouveaux messages</span>
            </button>

            <!-- Active Context Bar (Reply / Pending Upload) -->
            <div id="activeContextBar" class="active-context-bar">
                <div class="active-context-info" id="activeContextInfo">
                    <!-- Injected by JS: Reply target or Pending file -->
                </div>
                <button type="button" id="btnCancelContext" class="btn-icon" style="width: 24px; height: 24px; font-size: 0.75rem;" title="Annuler">✕</button>
            </div>

            <!-- Emoji Picker Popover -->
            <div id="emojiPopover" class="emoji-popover">
                <!-- Injected by JS with quick emojis -->
            </div>

            <!-- Chat Input Footer -->
            <footer class="chat-footer">
                <input type="file" id="fileInput" style="display: none;">

                <div class="input-bar">
                    <!-- Standard Input Bar Controls -->
                    <div id="normalInputBar" style="display: flex; align-items: center; width: 100%; gap: 0.45rem;">
                        <button type="button" id="btnAttachFile" class="btn-icon" title="Envoyer une photo, vidéo ou document">
                            📎
                        </button>

                        <button type="button" id="btnToggleEmoji" class="btn-icon" title="Ajouter des emojis et stickers">
                            😊
                        </button>

                        <button type="button" id="btnStartVoice" class="btn-icon" title="Enregistrer un message vocal (Audio)">
                            🎙️
                        </button>

                        <textarea 
                            id="messageInput" 
                            placeholder="<?= $isPublicRoom ? 'Écrivez un message, collez un email ou une image (Ctrl+V)...' : 'Écrivez dans ce salon privé...' ?>" 
                            rows="1"
                        ></textarea>

                        <button type="button" id="btnSendMessage" class="btn btn-primary" title="Envoyer le message">
                            <span>Envoyer</span> ➤
                        </button>
                    </div>

                    <!-- Upload Progress Bar (Live backblaze B2 percentage) -->
                    <div id="uploadProgressBarContainer" class="upload-progress-container" style="display: none;">
                        <div class="upload-progress-info">
                            <span id="uploadProgressFileName">Téléversement en cours...</span>
                            <span id="uploadProgressPercent">0%</span>
                        </div>
                        <div class="upload-progress-track">
                            <div id="uploadProgressFill" class="upload-progress-fill" style="width: 0%;"></div>
                        </div>
                    </div>

                    <!-- Voice Recording Mode Controls with live waveform canvas -->
                    <div id="voiceRecordingBar" class="recording-bar" style="display: none;">
                        <div class="record-indicator">
                            <span class="record-pulse"></span>
                            <span class="record-label">Enregistrement</span>
                        </div>

                        <canvas id="voiceWaveCanvas" class="voice-wave-canvas" width="160" height="34"></canvas>

                        <span id="voiceRecordTimer" class="record-timer">00:00</span>

                        <div style="flex: 1;"></div>

                        <button type="button" id="btnCancelVoice" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" title="Annuler le vocal">
                            ✕ Annuler
                        </button>

                        <button type="button" id="btnSendVoice" class="btn btn-primary btn-sm" title="Envoyer le vocal">
                            ✔ Envoyer
                        </button>
                    </div>
                </div>
            </footer>
        </main>
    </div>

    <!-- Modal QR Code & Live Pairing -->
    <div id="qrModal" class="modal-overlay">
        <div class="modal-content">
            <button id="qrModalClose" class="modal-close">&times;</button>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.4rem; color: #fff;">Connecter un autre appareil</h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">
                Scannez ce QR Code avec l'appareil photo de votre smartphone ou tablette pour le connecter instantanément.
            </p>

            <div class="qr-box">
                <div id="qrCodeContainer"></div>
            </div>

            <div id="qrStatusBox" style="font-size: 0.82rem; color: #34d399; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                <span class="pulse-dot"></span> En attente du scan...
            </div>

            <p style="font-size: 0.8rem; color: var(--text-muted); word-break: break-all;" id="qrShareUrlText">
                <?= htmlspecialchars(Config::getBaseUrl() . '/index.php?code=' . urlencode($room['code'])) ?>
            </p>
        </div>
    </div>

    <!-- Modal Nouveau Salon Privé -->
    <div id="createRoomModal" class="modal-overlay">
        <div class="modal-content">
            <button id="createRoomModalClose" class="modal-close">&times;</button>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #fff;">Créer un Salon Privé</h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 1.25rem;">
                Un salon privé est confidentiel, accessible uniquement via son code secret ou lien direct.
            </p>

            <button id="btnGenerateInstantRoom" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem; padding: 0.8rem;">
                ⚡ Générer un salon aléatoire
            </button>

            <div style="display: flex; align-items: center; margin: 1.25rem 0; color: var(--text-muted); font-size: 0.82rem;">
                <span style="flex: 1; border-bottom: 1px solid var(--border-subtle);"></span>
                <span style="padding: 0 0.75rem;">OU CHOISIR UN NOM</span>
                <span style="flex: 1; border-bottom: 1px solid var(--border-subtle);"></span>
            </div>

            <form id="formCustomRoom">
                <div class="form-group">
                    <label for="customRoomInput" class="form-label">Nom ou code du salon :</label>
                    <input type="text" id="customRoomInput" class="form-input" placeholder="Ex: mon-transfert-pc ou secret-77" required autocomplete="off">
                </div>
                <button type="submit" class="btn btn-secondary" style="width: 100%;">
                    Créer / Rejoindre ce salon
                </button>
            </form>
        </div>
    </div>

    <!-- Modal Rejoindre un Salon avec Code -->
    <div id="joinRoomModal" class="modal-overlay">
        <div class="modal-content">
            <button id="joinRoomModalClose" class="modal-close">&times;</button>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #fff;">Rejoindre un Salon</h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 1.25rem;">
                Entrez le code du salon privé qui vous a été partagé.
            </p>

            <form id="formJoinRoomCode">
                <div class="form-group">
                    <label for="joinRoomInput" class="form-label">Code du salon :</label>
                    <input type="text" id="joinRoomInput" class="form-input" placeholder="Ex: swift-drop-42" required autocomplete="off">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    Rejoindre maintenant ➔
                </button>
            </form>
        </div>
    </div>

    <!-- Modal Paramètres & Personnalisation (Fond, Couleurs, Pseudo) -->
    <div id="settingsModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 480px;">
            <button id="settingsModalClose" class="modal-close">&times;</button>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.25rem; color: #fff;">⚙️ Personnalisation & Paramètres</h2>
            <p style="color: var(--text-secondary); font-size: 0.84rem; margin-bottom: 1.2rem;">
                Personnalisez votre apparence, le fond d'écran du chat et votre profil sans compte.
            </p>

            <!-- Profil / Pseudo -->
            <div class="settings-section">
                <label class="form-label" style="font-weight: 700; color: #a7f3d0;">👤 Mon Pseudo</label>
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                    <div id="settingsAvatarPreview" class="user-avatar-preview">I</div>
                    <input type="text" id="settingsUsernameInput" class="form-input" placeholder="Ex: Alex-Dev" maxlength="24">
                </div>
                <div class="color-picker-row" id="avatarColorPicker">
                    <span style="font-size: 0.75rem; color: var(--text-muted); align-self: center;">Couleur :</span>
                    <button type="button" class="color-dot active" data-color="#10b981" style="background: #10b981;"></button>
                    <button type="button" class="color-dot" data-color="#2563eb" style="background: #2563eb;"></button>
                    <button type="button" class="color-dot" data-color="#8b5cf6" style="background: #8b5cf6;"></button>
                    <button type="button" class="color-dot" data-color="#ec4899" style="background: #ec4899;"></button>
                    <button type="button" class="color-dot" data-color="#f59e0b" style="background: #f59e0b;"></button>
                    <button type="button" class="color-dot" data-color="#06b6d4" style="background: #06b6d4;"></button>
                </div>
            </div>

            <!-- Fond d'écran du chat -->
            <div class="settings-section">
                <label class="form-label" style="font-weight: 700; color: #a7f3d0;">🎨 Fond d'écran du chat</label>
                <div class="wallpaper-grid" id="wallpaperPicker">
                    <button type="button" class="wallpaper-option active" data-wp="default">
                        <span class="wp-preview wp-default"></span>
                        <span class="wp-label">Nelsius Dark</span>
                    </button>
                    <button type="button" class="wallpaper-option" data-wp="doodle">
                        <span class="wp-preview wp-doodle"></span>
                        <span class="wp-label">Doodle Chat</span>
                    </button>
                    <button type="button" class="wallpaper-option" data-wp="aurora">
                        <span class="wp-preview wp-aurora"></span>
                        <span class="wp-label">Aurore</span>
                    </button>
                    <button type="button" class="wallpaper-option" data-wp="midnight">
                        <span class="wp-preview wp-midnight"></span>
                        <span class="wp-label">Bleu Nuit</span>
                    </button>
                    <button type="button" class="wallpaper-option" data-wp="oled">
                        <span class="wp-preview wp-oled"></span>
                        <span class="wp-label">Noir OLED</span>
                    </button>
                </div>
            </div>

            <!-- Couleur des bulles envoyées -->
            <div class="settings-section">
                <label class="form-label" style="font-weight: 700; color: #a7f3d0;">💬 Couleur de vos bulles de messages</label>
                <div class="bubble-color-row" id="bubbleColorPicker">
                    <button type="button" class="bubble-color-btn active" data-bubble-color="#059669" style="background: #059669;">Émeraude</button>
                    <button type="button" class="bubble-color-btn" data-bubble-color="#2563eb" style="background: #2563eb;">Saphir</button>
                    <button type="button" class="bubble-color-btn" data-bubble-color="#7c3aed" style="background: #7c3aed;">Violet</button>
                    <button type="button" class="bubble-color-btn" data-bubble-color="#db2777" style="background: #db2777;">Fuchsia</button>
                    <button type="button" class="bubble-color-btn" data-bubble-color="#0891b2" style="background: #0891b2;">Cyan</button>
                </div>
            </div>

            <button type="button" id="btnSaveSettings" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                ✔ Enregistrer mes préférences
            </button>
        </div>
    </div>

    <!-- Modal Membres du Salon (Présence en ligne en direct) -->
    <div id="membersModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 420px;">
            <button id="membersModalClose" class="modal-close">&times;</button>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.25rem; color: #fff;">👥 Membres du Salon</h2>
            <p style="color: var(--text-secondary); font-size: 0.84rem; margin-bottom: 1rem;">
                Personnes connectées à ce salon en ce moment.
            </p>

            <div id="membersListContainer" class="members-list-container">
                <!-- Injected via JavaScript from api/presence.php -->
                <div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                    Chargement des membres...
                </div>
            </div>

            <div style="margin-top: 1.2rem; display: flex; gap: 0.5rem;">
                <button type="button" id="btnLeaveRoom" class="btn btn-outline" style="flex: 1; color: var(--danger); border-color: rgba(239, 68, 68, 0.4);">
                    🚪 Quitter ce salon
                </button>
                <button type="button" id="btnInviteMember" class="btn btn-secondary" style="flex: 1;">
                    🔗 Inviter
                </button>
            </div>
        </div>
    </div>

    <!-- Floating Message Context Menu (Long-press / Right-click / More options) -->
    <div id="messageContextMenuBackdrop" class="msg-context-backdrop" style="display: none;">
        <div id="messageContextMenu" class="msg-context-menu" role="menu">
            <div class="msg-context-reactions">
                <button type="button" class="reaction-quick-btn" data-emoji="❤️" title="Cœur">❤️</button>
                <button type="button" class="reaction-quick-btn" data-emoji="👍" title="J'aime">👍</button>
                <button type="button" class="reaction-quick-btn" data-emoji="😂" title="Rire">😂</button>
                <button type="button" class="reaction-quick-btn" data-emoji="🔥" title="Feu">🔥</button>
                <button type="button" class="reaction-quick-btn" data-emoji="😮" title="Wouah">😮</button>
                <button type="button" class="reaction-quick-btn" data-emoji="🎉" title="Fête">🎉</button>
            </div>
            <div class="msg-context-divider"></div>
            <div class="msg-context-actions">
                <button type="button" class="msg-context-action-btn" id="ctxBtnReply">
                    <span class="ctx-icon">↩️</span>
                    <span>Répondre</span>
                </button>
                <button type="button" class="msg-context-action-btn" id="ctxBtnCopy">
                    <span class="ctx-icon">📋</span>
                    <span id="ctxBtnCopyText">Copier le message</span>
                </button>
                <button type="button" class="msg-context-action-btn" id="ctxBtnDownload" style="display: none;">
                    <span class="ctx-icon">⬇️</span>
                    <span>Télécharger le fichier</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div class="toast-container"></div>

    <!-- Scripts -->
    <script src="assets/js/qrcode.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
