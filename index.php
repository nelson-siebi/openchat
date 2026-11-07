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

            <div class="room-badge <?= $isPublicRoom ? '' : 'private' ?>" id="currentRoomBadge">
                <span class="pulse-dot"></span>
                <span id="roomCodeDisplay"><?= $isPublicRoom ? '🌍 Salon Public' : '🔒 ' . htmlspecialchars($room['code']) ?></span>
            </div>
        </div>

        <div class="header-actions">
            <!-- PWA Install Button -->
            <button id="btnPwaInstall" class="btn btn-primary btn-sm" style="display: none;" title="Installer l'application">
                📲 <span class="btn-text-hide">Installer</span>
            </button>

            <button id="userNickname" class="btn btn-outline btn-sm" title="Modifier votre pseudo">
                👤 Chargement...
            </button>

            <button id="btnShowQr" class="btn btn-outline btn-sm" title="Connecter un autre appareil (QR Code)">
                📱 <span class="btn-text-hide">Connecter</span>
            </button>

            <button id="btnCopyShareLink" class="btn btn-outline btn-sm" title="Copier le lien direct du salon">
                🔗 <span class="btn-text-hide">Partager</span>
            </button>

            <button id="btnToggleSound" class="btn-icon" title="Activer / Désactiver les notifications sonores">
                🔔
            </button>
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

                    <!-- Voice Recording Mode Controls -->
                    <div id="voiceRecordingBar" class="recording-bar">
                        <div class="record-indicator">
                            <span class="record-pulse"></span>
                            <span>Enregistrement</span>
                        </div>

                        <span id="voiceRecordTimer" class="record-timer">00:00</span>

                        <div style="flex: 1;"></div>

                        <button type="button" id="btnCancelVoice" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" title="Annuler le vocal">
                            ✕ Annuler
                        </button>

                        <button type="button" id="btnSendVoice" class="btn btn-primary btn-sm" title="Envoyer le vocal">
                            ✔ Envoyer le vocal
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
