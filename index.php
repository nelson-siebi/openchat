<?php
require_once __DIR__ . '/includes/Config.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenChat - Chat & Drop instantané sans inscription</title>
    <link rel="stylesheet" href="assets/css/app.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💬</text></svg>">
</head>
<body>

    <header class="app-header">
        <a href="index.php" class="logo-area">
            <div class="logo-icon">💬</div>
            <span>OpenChat</span>
        </a>
        <div class="header-actions">
            <a href="https://github.com/nelson-siebi/openchat" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                ⭐ GitHub
            </a>
        </div>
    </header>

    <main class="hero-container">
        <h1 class="hero-title">Partagez & discutez en 1 seconde chrono</h1>
        <p class="hero-subtitle">
            Aucun compte. Aucun mot de passe. Ouvrez un salon, scannez le QR code avec votre téléphone ou partagez le lien avec un ami pour vous envoyer instantanément des messages, liens et fichiers.
        </p>

        <div class="card-container">
            <button id="btnCreateRoom" class="btn btn-primary" style="width: 100%; font-size: 1.1rem; padding: 0.9rem;">
                🚀 Créer un salon instantané
            </button>

            <div class="divider">ou rejoindre un salon</div>

            <form id="formJoinRoom">
                <div class="form-group">
                    <label for="inputRoomCode" class="form-label">Code ou nom du salon :</label>
                    <input 
                        type="text" 
                        id="inputRoomCode" 
                        class="form-input" 
                        placeholder="Ex: swift-drop-42 ou mon-salon" 
                        required 
                        autocomplete="off"
                    >
                </div>
                <button type="submit" class="btn btn-outline" style="width: 100%;">
                    Rejoindre le salon ➔
                </button>
            </form>
        </div>

        <section class="features-grid">
            <div class="feature-box">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Zéro inscription</div>
                <div class="feature-desc">Pas de formulaire, pas d'email, pas d'attente. Vos conversations restent temporaires et privées.</div>
            </div>

            <div class="feature-box">
                <div class="feature-icon">📱</div>
                <div class="feature-title">PC ↔ Mobile instantané</div>
                <div class="feature-desc">Un QR code s'affiche dans votre salon. Scannez-le pour envoyer un lien ou une photo de votre téléphone vers votre PC.</div>
            </div>

            <div class="feature-box">
                <div class="feature-icon">📎</div>
                <div class="feature-title">Fichiers & Presse-papier</div>
                <div class="feature-desc">Glissez-déposez n'importe quel fichier ou collez directement des captures d'écran avec Ctrl+V.</div>
            </div>
        </section>
    </main>

    <footer style="text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem; margin-top: auto;">
        OpenChat • Plateforme Open-Source & Légère • Conçue pour la simplicité absolue
    </footer>

    <script src="assets/js/app.js"></script>
</body>
</html>
