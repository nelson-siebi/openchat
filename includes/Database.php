<?php
/**
 * OpenChat - SQLite Database Wrapper
 * Messages, Replies, Reactions, Presence, Typing & Ephemeral Storage
 */

declare(strict_types=1);

require_once __DIR__ . '/Config.php';

class Database
{
    private static ?PDO $pdo = null;

    /** Allowed message types (anything else is stored as plain text). */
    public const MESSAGE_TYPES = ['text', 'link', 'file', 'image', 'video', 'audio', 'album', 'sticker', 'peer_joined', 'system'];

    public static function getConnection(): PDO
    {
        if (self::$pdo === null) {
            $dbPath = Config::getDatabasePath();
            self::$pdo = new PDO('sqlite:' . $dbPath);
            self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // Performance pragmas for SQLite
            self::$pdo->exec('PRAGMA journal_mode = WAL;');
            self::$pdo->exec('PRAGMA synchronous = NORMAL;');
            self::$pdo->exec('PRAGMA busy_timeout = 4000;');

            self::initSchema();
            self::checkMigrations();
        }

        return self::$pdo;
    }

    private static function initSchema(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                title TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT NOT NULL,
                sender TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'text',
                content TEXT NOT NULL,
                file_url TEXT NULL,
                file_name TEXT NULL,
                file_size INTEGER NULL,
                reply_to_id INTEGER DEFAULT NULL,
                reply_to_sender TEXT DEFAULT NULL,
                reply_to_content TEXT DEFAULT NULL,
                reactions TEXT DEFAULT '{}',
                meta TEXT DEFAULT NULL,
                updated_at TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS room_presence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT NOT NULL,
                username TEXT NOT NULL,
                avatar_color TEXT NOT NULL DEFAULT '#10b981',
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                typing_at TEXT DEFAULT NULL,
                UNIQUE(room_code, username)
            );

            CREATE TABLE IF NOT EXISTS share_drafts (
                token TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages (room_code, id);
            CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
            CREATE INDEX IF NOT EXISTS idx_presence_room ON room_presence (room_code, last_seen);
        ";

        self::$pdo->exec($sql);
    }

    private static function checkMigrations(): void
    {
        $db = self::$pdo;
        $cols = $db->query("PRAGMA table_info(messages)")->fetchAll(PDO::FETCH_COLUMN, 1);

        $messageColumns = [
            'reply_to_id' => "INTEGER DEFAULT NULL",
            'reply_to_sender' => "TEXT DEFAULT NULL",
            'reply_to_content' => "TEXT DEFAULT NULL",
            'reactions' => "TEXT DEFAULT '{}'",
            'meta' => "TEXT DEFAULT NULL",
            'updated_at' => "TEXT DEFAULT NULL",
        ];
        foreach ($messageColumns as $name => $definition) {
            if (!in_array($name, $cols, true)) {
                $db->exec("ALTER TABLE messages ADD COLUMN {$name} {$definition}");
            }
        }

        $presenceCols = $db->query("PRAGMA table_info(room_presence)")->fetchAll(PDO::FETCH_COLUMN, 1);
        if (!in_array('typing_at', $presenceCols, true)) {
            $db->exec("ALTER TABLE room_presence ADD COLUMN typing_at TEXT DEFAULT NULL");
        }

        $db->exec("CREATE INDEX IF NOT EXISTS idx_messages_room_updated ON messages (room_code, updated_at)");
    }

    /** Current UTC timestamp with millisecond precision (lexicographically sortable). */
    public static function nowMs(): string
    {
        return (string)self::getConnection()->query("SELECT strftime('%Y-%m-%d %H:%M:%f', 'now')")->fetchColumn();
    }

    public static function getOrCreateRoom(string $code, string $title = ''): array
    {
        $code = self::sanitizeCode($code);
        if ($code === '') {
            $code = 'public';
        }
        $db = self::getConnection();

        $stmt = $db->prepare("SELECT * FROM rooms WHERE code = :code LIMIT 1");
        $stmt->execute([':code' => $code]);
        $room = $stmt->fetch();

        if ($room) {
            $upd = $db->prepare("UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE id = :id");
            $upd->execute([':id' => $room['id']]);
            return $room;
        }

        if (empty($title)) {
            $title = $code === 'public' ? 'Salon Public Général' : 'Salon ' . strtoupper($code);
        }

        $ins = $db->prepare("INSERT INTO rooms (code, title) VALUES (:code, :title)");
        $ins->execute([':code' => $code, ':title' => $title]);

        return [
            'id' => (int)$db->lastInsertId(),
            'code' => $code,
            'title' => $title,
            'created_at' => gmdate('Y-m-d H:i:s'),
            'last_activity' => gmdate('Y-m-d H:i:s')
        ];
    }

    /**
     * Only http(s) URLs and bundled sticker paths are accepted as attachments.
     */
    public static function sanitizeFileUrl(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }
        $url = trim($url);
        if ($url === '') {
            return null;
        }
        if (preg_match('#^assets/stickers/[a-z0-9_\-]+\.(svg|png|webp|gif)$#i', $url)) {
            return $url;
        }
        if (preg_match('#^https?://#i', $url) && filter_var($url, FILTER_VALIDATE_URL)) {
            return $url;
        }
        return null;
    }

    /**
     * Meta is a small JSON object (voice waveform, durations, image sizes, album items, client id).
     */
    public static function sanitizeMeta(mixed $meta): ?string
    {
        if ($meta === null || $meta === '') {
            return null;
        }
        if (is_string($meta)) {
            $meta = json_decode($meta, true);
        }
        if (!is_array($meta)) {
            return null;
        }

        // Album items must carry valid URLs
        if (isset($meta['items']) && is_array($meta['items'])) {
            $items = [];
            foreach (array_slice($meta['items'], 0, 30) as $item) {
                if (!is_array($item)) continue;
                $url = self::sanitizeFileUrl($item['url'] ?? null);
                if (!$url) continue;
                $items[] = [
                    'url' => $url,
                    'name' => mb_substr((string)($item['name'] ?? 'fichier'), 0, 180),
                    'size' => (int)($item['size'] ?? 0),
                    'type' => in_array($item['type'] ?? '', ['image', 'video'], true) ? $item['type'] : 'image',
                    'w' => (int)($item['w'] ?? 0),
                    'h' => (int)($item['h'] ?? 0),
                    'duration' => (float)($item['duration'] ?? 0),
                ];
            }
            $meta['items'] = $items;
        }

        if (isset($meta['waveform']) && is_array($meta['waveform'])) {
            $meta['waveform'] = array_map(
                static fn($v) => max(0, min(100, (int)$v)),
                array_slice($meta['waveform'], 0, 96)
            );
        }

        $json = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false || strlen($json) > 16000) {
            return null;
        }
        return $json;
    }

    public static function addMessage(
        string $roomCode,
        string $sender,
        string $content,
        string $type = 'text',
        ?string $fileUrl = null,
        ?string $fileName = null,
        ?int $fileSize = null,
        ?int $replyToId = null,
        ?string $replyToSender = null,
        ?string $replyToContent = null,
        ?string $meta = null
    ): array {
        $roomCode = self::sanitizeCode($roomCode);
        $sender = trim($sender) !== '' ? mb_substr(trim(strip_tags($sender)), 0, 32) : 'Anonyme';
        $type = in_array($type, self::MESSAGE_TYPES, true) ? $type : 'text';
        $content = mb_substr($content, 0, 8000);
        $fileUrl = self::sanitizeFileUrl($fileUrl);
        $fileName = $fileName !== null ? mb_substr(strip_tags($fileName), 0, 180) : null;
        $replyToSender = $replyToSender !== null ? mb_substr(strip_tags($replyToSender), 0, 32) : null;
        $replyToContent = $replyToContent !== null ? mb_substr($replyToContent, 0, 300) : null;

        $db = self::getConnection();

        // Ensure room exists
        self::getOrCreateRoom($roomCode);

        $stmt = $db->prepare("
            INSERT INTO messages (
                room_code, sender, type, content, file_url, file_name, file_size,
                reply_to_id, reply_to_sender, reply_to_content, reactions, meta
            )
            VALUES (
                :room_code, :sender, :type, :content, :file_url, :file_name, :file_size,
                :reply_to_id, :reply_to_sender, :reply_to_content, '{}', :meta
            )
        ");

        $stmt->execute([
            ':room_code' => $roomCode,
            ':sender' => $sender,
            ':type' => $type,
            ':content' => $content,
            ':file_url' => $fileUrl,
            ':file_name' => $fileName,
            ':file_size' => $fileSize,
            ':reply_to_id' => $replyToId,
            ':reply_to_sender' => $replyToSender,
            ':reply_to_content' => $replyToContent,
            ':meta' => $meta
        ]);

        $messageId = (int)$db->lastInsertId();

        // Update room activity
        $upd = $db->prepare("UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE code = :code");
        $upd->execute([':code' => $roomCode]);

        // The author is not typing anymore
        $typing = $db->prepare("UPDATE room_presence SET typing_at = NULL WHERE room_code = :room AND username = :user");
        $typing->execute([':room' => $roomCode, ':user' => $sender]);

        return [
            'id' => $messageId,
            'room_code' => $roomCode,
            'sender' => $sender,
            'type' => $type,
            'content' => $content,
            'file_url' => $fileUrl,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'reply_to_id' => $replyToId,
            'reply_to_sender' => $replyToSender,
            'reply_to_content' => $replyToContent,
            'reactions' => '{}',
            'meta' => $meta,
            'updated_at' => null,
            'created_at' => gmdate('Y-m-d H:i:s')
        ];
    }

    /**
     * Toggle a reaction for a given user. Reactions are stored as {"emoji": ["user1", "user2"]}.
     * Legacy integer counters are preserved as anonymous entries.
     */
    public static function toggleReaction(int $messageId, string $emoji, string $username = 'Invité'): array
    {
        $db = self::getConnection();
        $emoji = mb_substr(trim($emoji), 0, 16);
        $username = mb_substr(trim(strip_tags($username)), 0, 32) ?: 'Invité';

        if ($emoji === '') {
            return ['success' => false, 'error' => 'Emoji manquant'];
        }

        $stmt = $db->prepare("SELECT id, room_code, reactions FROM messages WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $messageId]);
        $msg = $stmt->fetch();

        if (!$msg) {
            return ['success' => false, 'error' => 'Message introuvable'];
        }

        $reactions = self::normalizeReactions($msg['reactions'] ?? '{}');
        $users = $reactions[$emoji] ?? [];

        if (in_array($username, $users, true)) {
            $users = array_values(array_filter($users, static fn($u) => $u !== $username));
        } else {
            $users[] = $username;
        }

        if (empty($users)) {
            unset($reactions[$emoji]);
        } else {
            $reactions[$emoji] = $users;
        }

        $json = empty($reactions) ? '{}' : json_encode($reactions, JSON_UNESCAPED_UNICODE);

        $upd = $db->prepare("UPDATE messages SET reactions = :reactions, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = :id");
        $upd->execute([
            ':reactions' => $json,
            ':id' => $messageId
        ]);

        return [
            'success' => true,
            'message_id' => $messageId,
            'reactions' => empty($reactions) ? new stdClass() : $reactions,
            'room_code' => $msg['room_code']
        ];
    }

    /** @return array<string, string[]> */
    public static function normalizeReactions(?string $raw): array
    {
        $decoded = json_decode($raw ?: '{}', true);
        if (!is_array($decoded)) {
            return [];
        }
        $out = [];
        foreach ($decoded as $emoji => $value) {
            if (is_array($value)) {
                $out[(string)$emoji] = array_values(array_map('strval', $value));
            } elseif (is_numeric($value) && (int)$value > 0) {
                $out[(string)$emoji] = array_fill(0, min(500, (int)$value), '·');
            }
        }
        return $out;
    }

    public static function getMessages(string $roomCode, int $sinceId = 0, int $limit = 100): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $db = self::getConnection();

        $stmt = $db->prepare("
            SELECT * FROM messages
            WHERE room_code = :code AND id > :since_id
            ORDER BY id ASC
            LIMIT :limit
        ");
        $stmt->bindValue(':code', $roomCode, PDO::PARAM_STR);
        $stmt->bindValue(':since_id', $sinceId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /** Latest N messages (or the N messages right before $beforeId), returned in ascending order. */
    public static function getLatestMessages(string $roomCode, int $limit = 60, int $beforeId = 0): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $db = self::getConnection();

        $sql = "SELECT * FROM messages WHERE room_code = :code" . ($beforeId > 0 ? " AND id < :before" : "") . " ORDER BY id DESC LIMIT :limit";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':code', $roomCode, PDO::PARAM_STR);
        if ($beforeId > 0) {
            $stmt->bindValue(':before', $beforeId, PDO::PARAM_INT);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return array_reverse($stmt->fetchAll());
    }

    /** Messages whose reactions changed after $since (ms timestamp). */
    public static function getReactionUpdates(string $roomCode, string $since): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $stmt = self::getConnection()->prepare("
            SELECT id, reactions, updated_at FROM messages
            WHERE room_code = :code AND updated_at IS NOT NULL AND updated_at > :since
            ORDER BY updated_at ASC LIMIT 100
        ");
        $stmt->execute([':code' => $roomCode, ':since' => $since]);
        return $stmt->fetchAll();
    }

    public static function updatePresence(string $roomCode, string $username, string $avatarColor = '#10b981'): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $username = mb_substr(trim(strip_tags($username)), 0, 32);
        if (empty($username)) $username = 'Invité';
        if (!preg_match('/^#[0-9a-f]{6}$/i', $avatarColor)) $avatarColor = '#10b981';
        $db = self::getConnection();

        // Check if user was already active recently
        $check = $db->prepare("SELECT CAST((strftime('%s', 'now') - strftime('%s', last_seen)) AS INTEGER) AS secs FROM room_presence WHERE room_code = :room AND username = :user LIMIT 1");
        $check->execute([':room' => $roomCode, ':user' => $username]);
        $existing = $check->fetch();

        $isNewJoin = !$existing || (int)$existing['secs'] > 120;

        // Upsert presence
        $stmt = $db->prepare("
            INSERT INTO room_presence (room_code, username, avatar_color, last_seen, joined_at)
            VALUES (:room, :user, :color, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(room_code, username) DO UPDATE SET
                avatar_color = excluded.avatar_color,
                last_seen = CURRENT_TIMESTAMP
        ");
        $stmt->execute([':room' => $roomCode, ':user' => $username, ':color' => $avatarColor]);

        // If new join, create system announcement message
        if ($isNewJoin && $roomCode !== 'public') {
            self::addMessage(
                roomCode: $roomCode,
                sender: 'Système',
                content: "{$username} a rejoint le salon",
                type: 'system'
            );
        }

        return self::getRoomPresence($roomCode);
    }

    public static function setTyping(string $roomCode, string $username, bool $isTyping): void
    {
        $roomCode = self::sanitizeCode($roomCode);
        $username = mb_substr(trim(strip_tags($username)), 0, 32);
        if ($username === '' || $roomCode === '') return;

        $db = self::getConnection();
        if ($isTyping) {
            $stmt = $db->prepare("
                INSERT INTO room_presence (room_code, username, last_seen, joined_at, typing_at)
                VALUES (:room, :user, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, strftime('%Y-%m-%d %H:%M:%f', 'now'))
                ON CONFLICT(room_code, username) DO UPDATE SET
                    typing_at = strftime('%Y-%m-%d %H:%M:%f', 'now'),
                    last_seen = CURRENT_TIMESTAMP
            ");
        } else {
            $stmt = $db->prepare("UPDATE room_presence SET typing_at = NULL WHERE room_code = :room AND username = :user");
        }
        $stmt->execute([':room' => $roomCode, ':user' => $username]);
    }

    /** @return string[] usernames currently typing (last 6 seconds) */
    public static function getTyping(string $roomCode, string $excludeUser = ''): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $stmt = self::getConnection()->prepare("
            SELECT username FROM room_presence
            WHERE room_code = :room AND typing_at IS NOT NULL
              AND typing_at > strftime('%Y-%m-%d %H:%M:%f', 'now', '-6 seconds')
              AND username != :me
            ORDER BY typing_at DESC LIMIT 5
        ");
        $stmt->execute([':room' => $roomCode, ':me' => $excludeUser]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public static function leavePresence(string $roomCode, string $username): void
    {
        $roomCode = self::sanitizeCode($roomCode);
        $username = mb_substr(trim(strip_tags($username)), 0, 32);
        $db = self::getConnection();

        $stmt = $db->prepare("DELETE FROM room_presence WHERE room_code = :room AND username = :user");
        $stmt->execute([':room' => $roomCode, ':user' => $username]);

        if ($roomCode !== 'public') {
            self::addMessage(
                roomCode: $roomCode,
                sender: 'Système',
                content: "{$username} a quitté le salon",
                type: 'system'
            );
        }
    }

    public static function getRoomPresence(string $roomCode): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $db = self::getConnection();

        // Active members in the last 5 minutes
        $stmt = $db->prepare("
            SELECT username, avatar_color, last_seen, joined_at,
                   CAST((strftime('%s', 'now') - strftime('%s', last_seen)) AS INTEGER) AS seconds_ago
            FROM room_presence
            WHERE room_code = :room AND last_seen >= datetime('now', '-300 seconds')
            ORDER BY last_seen DESC
        ");
        $stmt->execute([':room' => $roomCode]);
        $rows = $stmt->fetchAll();

        $members = [];
        $onlineCount = 0;
        foreach ($rows as $row) {
            $isOnline = (int)$row['seconds_ago'] <= 45;
            if ($isOnline) $onlineCount++;
            $members[] = [
                'username' => $row['username'],
                'avatar_color' => $row['avatar_color'],
                'is_online' => $isOnline,
                'seconds_ago' => (int)$row['seconds_ago'],
                'joined_at' => $row['joined_at']
            ];
        }

        return [
            'online_count' => max(1, $onlineCount),
            'total_active' => count($members),
            'members' => $members
        ];
    }

    // ------------------------------------------------------------------
    // Share drafts (PWA share target fallback when the service worker
    // is not controlling the page)
    // ------------------------------------------------------------------

    public static function saveShareDraft(array $payload): string
    {
        $token = bin2hex(random_bytes(12));
        $stmt = self::getConnection()->prepare("INSERT INTO share_drafts (token, payload) VALUES (:t, :p)");
        $stmt->execute([':t' => $token, ':p' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        return $token;
    }

    public static function takeShareDraft(string $token): ?array
    {
        $token = preg_replace('/[^a-f0-9]/', '', strtolower($token));
        if ($token === '') return null;
        $db = self::getConnection();
        $stmt = $db->prepare("SELECT payload FROM share_drafts WHERE token = :t AND created_at >= datetime('now', '-1 hour') LIMIT 1");
        $stmt->execute([':t' => $token]);
        $raw = $stmt->fetchColumn();
        $db->prepare("DELETE FROM share_drafts WHERE token = :t OR created_at < datetime('now', '-1 hour')")->execute([':t' => $token]);
        if (!$raw) return null;
        $data = json_decode((string)$raw, true);
        return is_array($data) ? $data : null;
    }

    public static function purgeOldData(): void
    {
        try {
            $db = self::getConnection();
            $hours = Config::MESSAGE_RETENTION_HOURS;
            $cutoff = gmdate('Y-m-d H:i:s', strtotime("-{$hours} hours"));

            // Find old files to delete physically
            $stmt = $db->prepare("SELECT file_url FROM messages WHERE created_at < :cutoff AND file_url IS NOT NULL");
            $stmt->execute([':cutoff' => $cutoff]);
            $files = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $uploadsDir = Config::getUploadsDir();
            foreach ($files as $fileUrl) {
                $base = basename((string)parse_url((string)$fileUrl, PHP_URL_PATH));
                if ($base === '' || $base === '.gitkeep') continue;
                $filePath = $uploadsDir . DIRECTORY_SEPARATOR . $base;
                if (is_file($filePath)) {
                    @unlink($filePath);
                }
            }

            // Delete old messages
            $del = $db->prepare("DELETE FROM messages WHERE created_at < :cutoff");
            $del->execute([':cutoff' => $cutoff]);
            $db->exec("DELETE FROM share_drafts WHERE created_at < datetime('now', '-1 hour')");
            $db->exec("DELETE FROM room_presence WHERE last_seen < datetime('now', '-1 day')");
        } catch (Throwable $e) {
            // Silently ignore during runtime
        }
    }

    public static function sanitizeCode(string $code): string
    {
        $code = strtolower(trim($code));
        $code = preg_replace('/[^a-z0-9_-]/', '', $code);
        return substr($code, 0, 50);
    }
}
