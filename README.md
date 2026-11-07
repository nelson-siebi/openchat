# OpenChat 💬

> Plateforme de chat et de partage instantané open-source, sans inscription, sans mot de passe et sans friction.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP Version](https://img.shields.io/badge/PHP-8.1+-777bb4.svg)](https://php.net)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003b57.svg)](https://sqlite.org)

---

## 🎯 Objectif

Envoyez en 1 clic un message, un lien, une note, une capture d'écran ou un fichier entre votre **ordinateur et votre smartphone** ou avec un **ami**, sans perdre de temps à créer un compte ou à vous connecter sur une grosse plateforme.

---

## ✨ Fonctionnalités

- ⚡ **Zéro Inscription** : Créez un salon instantanément ou rejoignez-en un avec un code court (ex: `swift-drop-42`).
- 📱 **Synchronisation Mobile par QR Code** : Scannez le QR code affiché à l'écran avec votre téléphone pour rejoindre le salon sur votre PC en 2 secondes.
- 📎 **Drag & Drop & Presse-Papier** :
  - Glissez-déposez n'importe quel fichier sur l'écran pour l'envoyer directement.
  - Collez directement vos captures d'écran depuis le presse-papier avec `Ctrl + V`.
- 📋 **Copie rapide 1-clic** : Copiez n'importe quel message ou lien vers votre presse-papier d'un simple clic.
- 🔔 **Sons de notification subtils** : Générés via Web Audio API (aucun fichier lourd à charger).
- 🧹 **Éphémère & Respectueux de la vie privée** : Purge automatique des messages et fichiers temporaires après 24 heures.
- 🧩 **Architecture Modulaire** : Conçu pour basculer facilement vers **Node.js + WebSockets** (voir `ARCHITECTURE.md`).

---

## 🚀 Installation & Utilisation

### Option A : Dans Laragon / Wamp / XAMPP
1. Clonez ou placez le dossier dans votre répertoire web :
   ```bash
   cd e:/laragon/www
   git clone https://github.com/nelson-siebi/openchat.git
   ```
2. Ouvrez votre navigateur sur :
   ```
   http://openchat.test  (ou http://localhost/openchat)
   ```
3. C'est tout ! SQLite crée automatiquement la base de données au premier lancement.

### Option B : Serveur de développement PHP intégré
```bash
cd openchat
php -S 0.0.0.0:8000
```
Puis accédez à `http://localhost:8000`.

---

## 🏗️ Structure du Projet

```text
openchat/
├── api/             # Endpoints REST et SSE (rooms, messages, upload, stream)
├── assets/          # CSS responsive, JavaScript et bibliothèque QR Code
├── includes/        # Configuration globale et gestionnaire de base SQLite
├── data/            # Fichier SQLite généré automatiquement
├── uploads/         # Répertoire de stockage des fichiers temporaires
├── index.php        # Page d'accueil (créer / rejoindre un salon)
├── room.php         # Interface de chat et de drop en direct
├── ARCHITECTURE.md  # Guide d'architecture et plan de migration Node.js
└── README.md
```

---

## 🛣️ Feuille de Route (Roadmap)

- [x] Version PHP 8.3 légère avec SQLite et Server-Sent Events (SSE)
- [x] Drag & Drop et collage direct d'images (Ctrl+V)
- [x] Générateur QR Code intégré pour connexion smartphone
- [ ] Backend temps-réel Node.js + Express + Socket.io
- [ ] Chiffrement de bout-en-bout (E2EE) optionnel dans le navigateur

---

## 📄 Licence

Ce projet est sous licence MIT - libre de modification, d'hébergement et de distribution.

