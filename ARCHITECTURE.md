# OpenChat - Architecture & Spécifications de Migration

Ce document détaille l'architecture modulaire de **OpenChat** et fournit la feuille de route pour la future transition du backend de **PHP** vers **Node.js (Express + Socket.io)** sans altérer la compatibilité de l'interface utilisateur.

---

## 1. Philosophie & Principes

- **Zéro barrière** : Pas d'inscription, pas de mot de passe, pas de collecte d'emails.
- **Accès instantané par Salon** : Une URL unique ou un scan de QR Code suffit pour synchroniser deux appareils (PC ↔ Smartphone) ou deux personnes.
- **Contrat d'API Agnostique** : Le frontend communique via des formats JSON standardisés. Que le serveur soit en PHP ou en Node.js, les endpoints et charges utiles (payloads) sont identiques.
- **Auto-nettoyage éphémère** : Suppression automatique des messages et fichiers au-delà de 24 heures pour garantir la confidentialité et économiser l'espace disque.

---

## 2. Structure Actuelle (PHP 8.3 + SQLite)

```
openchat/
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── data/                  # Base de données SQLite (openchat.sqlite)
├── uploads/               # Fichiers et images partagés
├── includes/
│   ├── Config.php         # Chemins, taille max, durée de rétention, helper JSON
│   └── Database.php       # Connexion SQLite PDO, tables 'rooms' et 'messages'
├── api/
│   ├── rooms.php          # Création / Consultation d'un salon
│   ├── messages.php       # Envoi / Récupération de messages
│   ├── upload.php         # Téléversement de pièces jointes et captures d'écran
│   └── stream.php         # Server-Sent Events (SSE) pour le push temps-réel
├── assets/
│   ├── css/app.css        # Design moderne, responsive et dark-mode
│   └── js/
│       ├── qrcode.min.js  # Générateur QR code autonome (sans tiers)
│       └── app.js         # Logique frontend (SSE, polling, dropzone, audio)
├── index.php              # Page d'accueil (créer/rejoindre salon)
└── room.php               # Interface de discussion & échange de fichiers
```

---

## 3. Contrat d'API (Spécification)

### `POST /api/rooms.php`
- **Request Body** : `{"code": "optionnel", "title": "optionnel"}`
- **Response** :
  ```json
  {
    "success": true,
    "room": {
      "id": 1,
      "code": "swift-drop-42",
      "title": "Salon SWIFT-DROP-42"
    },
    "share_url": "http://.../room.php?code=swift-drop-42"
  }
  ```

### `GET /api/messages.php?code=swift-drop-42&since_id=0`
- **Response** :
  ```json
  {
    "success": true,
    "messages": [
      {
        "id": 10,
        "room_code": "swift-drop-42",
        "sender": "Nelson",
        "type": "text",
        "content": "Salut !",
        "file_url": null,
        "created_at": "2026-11-07 20:30:00"
      }
    ]
  }
  ```

### `POST /api/messages.php`
- **Request Body** :
  ```json
  {
    "room_code": "swift-drop-42",
    "sender": "Nelson",
    "content": "Voici le document",
    "type": "text"
  }
  ```

### `POST /api/upload.php`
- **Form-Data** : `file` (max 25 Mo)
- **Response** :
  ```json
  {
    "success": true,
    "file_url": "http://.../uploads/abc12345.png",
    "file_name": "capture.png",
    "file_size": 1048576,
    "type": "image"
  }
  ```

---

## 4. Plan de Migration vers Node.js

Lorsque vous souhaiterez basculer sur **Node.js** :

1. **Stack cible** :
   - `express` pour servir les fichiers statiques et l'API d'upload.
   - `socket.io` pour les WebSockets bidirectionnels temps-réel à latence ultra-faible.
   - `multer` pour le traitement des uploads.
   - `better-sqlite3` (ou persistance en mémoire / Redis).

2. **Événements Socket.io recommandés** :
   - `join-room` : `socket.join(roomCode)`
   - `send-message` : `io.to(roomCode).emit('new-message', messageData)`
   - `typing` : indicateur de frappe optionnel.

3. **Transition du Frontend** :
   - Dans `assets/js/app.js`, remplacer la méthode `setupLiveSync()` par le client Socket.io (`socket.on('new-message')`).
   - Toutes les interfaces HTML (`index.php` -> `index.html` et `room.php` -> `room.html`) restent 100% compatibles !

---

## 5. Déploiement sur Serveur Linux / VPS

- **PHP** : Nginx / Apache + PHP-FPM + SQLite (zéro configuration DB).
- **Node.js (futur)** : PM2 (`pm2 start server.js`) + Nginx Reverse Proxy avec support WebSocket (`Upgrade $http_upgrade`).
