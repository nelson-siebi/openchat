<?php
require_once __DIR__ . '/includes/Config.php';
require_once __DIR__ . '/includes/Database.php';

$code = trim($_GET['code'] ?? '');
if (empty($code)) {
    header('Location: index.php');
    exit;
}

$room = Database::getOrCreateRoom($code);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salon: <?= htmlspecialchars($room['code']) ?> - OpenChat</title>
    <link rel="stylesheet" href="assets/css/app.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💬</text></svg>">
</head>
<body>

    <header class="app-header">
        <a href="index.php" class="logo-area">
            <div class="logo-icon">💬</div>
            <span>OpenChat</span>
        </a>

        <div class="room-meta">
            <div class="room-badge">
                <span class="dot"></span>
                <span id="roomCodeDisplay"><?= htmlspecialchars($room['code']) ?></span>
            </div>

            <button id="userNickname" class="btn btn-outline btn-sm" title="Cliquez pour changer votre pseudo">
                👤 Chargement...
            </button>

            <button id="btnShowQr" class="btn btn-outline btn-sm" title="Afficher le QR code pour votre mobile">
                📱 QR Code
            </button>

            <button id="btnCopyShareLink" class="btn btn-outline btn-sm" title="Copier le lien direct du salon">
                🔗 Copier le lien
            </button>

            <button id="btnToggleSound" class="btn-icon" title="Activer / Désactiver le son">
                🔔
            </button>

            <a href="index.php" class="btn-icon" title="Quitter le salon">
                ✕
            </a>
        </div>
    </header>

    <main class="chat-wrapper">
        <!-- Drag & Drop overlay indicator -->
        <div id="dropzoneOverlay" class="dropzone-overlay">
            📥 Déposez votre fichier ici pour l'envoyer instantanément !
        </div>

        <!-- Chat messages history -->
        <div id="chatMessages" class="chat-box">
            <!-- Messages will be injected dynamically -->
        </div>

        <!-- Chat Input Footer -->
        <footer class="chat-footer">
            <input type="file" id="fileInput" style="display: none;">

            <div class="input-bar">
                <button type="button" id="btnAttachFile" class="btn-icon" title="Envoyer un fichier ou une photo">
                    📎
                </button>

                <textarea 
                    id="messageInput" 
                    placeholder="Écrivez un message, collez un lien ou une image (Ctrl+V)..." 
                    rows="1"
                ></textarea>

                <button type="button" id="btnSendMessage" class="btn btn-primary" style="padding: 0.6rem 1rem;">
                    <span>Envoyer</span> ➤
                </button>
            </div>
        </footer>
    </main>

    <!-- Modal QR Code -->
    <div id="qrModal" class="modal-overlay">
        <div class="modal-content">
            <button id="qrModalClose" class="modal-close">&times;</button>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #fff;">Connectez votre mobile</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                Scannez ce QR Code avec l'appareil photo de votre smartphone pour rejoindre ce salon immédiatement.
            </p>

            <div class="qr-box">
                <div id="qrCodeContainer"></div>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-secondary); word-break: break-all;">
                <?= htmlspecialchars(Config::getBaseUrl() . '/room.php?code=' . urlencode($room['code'])) ?>
            </p>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div class="toast-container"></div>

    <script src="assets/js/qrcode.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>

