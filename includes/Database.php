<?php
/**
 * OpenChat - SQLite Database Wrapper
 * Messages, Replies, Reactions & Ephemeral Storage
 */

declare(strict_types=1);

require_once __DIR__ . '/Config.php';

class Database
{
    private static ?PDO $pdo = null;

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
                type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'image', 'video', 'audio', 'link', 'sticker', 'peer_joined', 'system'
                content TEXT NOT NULL,
                file_url TEXT NULL,
                file_name TEXT NULL,
                file_size INTEGER NULL,
                reply_to_id INTEGER DEFAULT NULL,
                reply_to_sender TEXT DEFAULT NULL,
                reply_to_content TEXT DEFAULT NULL,
                reactions TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS room_presence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT NOT NULL,
                username TEXT NOT NULL,
                avatar_color TEXT NOT NULL DEFAULT '#10b981',
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(room_code, username)
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

        if (!in_array('reply_to_id', $cols, true)) {
            $db->exec("ALTER TABLE messages ADD COLUMN reply_to_id INTEGER DEFAULT NULL");
        }
        if (!in_array('reply_to_sender', $cols, true)) {
            $db->exec("ALTER TABLE messages ADD COLUMN reply_to_sender TEXT DEFAULT NULL");
        }
        if (!in_array('reply_to_content', $cols, true)) {
            $db->exec("ALTER TABLE messages ADD COLUMN reply_to_content TEXT DEFAULT NULL");
        }
        if (!in_array('reactions', $cols, true)) {
            $db->exec("ALTER TABLE messages ADD COLUMN reactions TEXT DEFAULT '{}'");
        }
    }

    public static function getOrCreateRoom(string $code, string $title = ''): array
    {
        $code = self::sanitizeCode($code);
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
            'created_at' => date('Y-m-d H:i:s'),
            'last_activity' => date('Y-m-d H:i:s')
        ];
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
        ?string $replyToContent = null
    ): array {
        $roomCode = self::sanitizeCode($roomCode);
        $sender = trim($sender) !== '' ? trim(strip_tags($sender)) : 'Anonyme';
        $db = self::getConnection();

        // Ensure room exists
        self::getOrCreateRoom($roomCode);

        $stmt = $db->prepare("
            INSERT INTO messages (
                room_code, sender, type, content, file_url, file_name, file_size, 
                reply_to_id, reply_to_sender, reply_to_content, reactions
            )
            VALUES (
                :room_code, :sender, :type, :content, :file_url, :file_name, :file_size,
                :reply_to_id, :reply_to_sender, :reply_to_content, '{}'
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
            ':reply_to_content' => $replyToContent
        ]);

        $messageId = (int)$db->lastInsertId();

        // Update room activity
        $upd = $db->prepare("UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE code = :code");
        $upd->execute([':code' => $roomCode]);

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
            'created_at' => date('Y-m-d H:i:s')
        ];
    }

    public static function toggleReaction(int $messageId, string $emoji): array
    {
        $db = self::getConnection();
        $stmt = $db->prepare("SELECT id, room_code, reactions FROM messages WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $messageId]);
        $msg = $stmt->fetch();

        if (!$msg) {
            return ['success' => false, 'error' => 'Message introuvable'];
        }

        $reactions = json_decode($msg['reactions'] ?: '{}', true) ?: [];
        $currentCount = $reactions[$emoji] ?? 0;
        $reactions[$emoji] = $currentCount + 1;

        $upd = $db->prepare("UPDATE messages SET reactions = :reactions WHERE id = :id");
        $upd->execute([
            ':reactions' => json_encode($reactions, JSON_UNESCAPED_UNICODE),
            ':id' => $messageId
        ]);

        return [
            'success' => true,
            'message_id' => $messageId,
            'reactions' => $reactions,
            'room_code' => $msg['room_code']
        ];
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

    public static function updatePresence(string $roomCode, string $username, string $avatarColor = '#10b981'): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $username = trim(strip_tags($username));
        if (empty($username)) $username = 'Invité';
        $db = self::getConnection();

        // Check if user was already active in the last 60 seconds
        $check = $db->prepare("SELECT last_seen FROM room_presence WHERE room_code = :room AND username = :user LIMIT 1");
        $check->execute([':room' => $roomCode, ':user' => $username]);
        $existing = $check->fetch();

        $isNewJoin = false;
        if (!$existing) {
            $isNewJoin = true;
        } else {
            $lastSeenSecs = time() - strtotime($existing['last_seen']);
            if ($lastSeenSecs > 120) {
                $isNewJoin = true;
            }
        }

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
                content: "👋 {$username} a rejoint le salon.",
                type: 'system'
            );
        }

        return self::getRoomPresence($roomCode);
    }

    public static function leavePresence(string $roomCode, string $username): void
    {
        $roomCode = self::sanitizeCode($roomCode);
        $username = trim(strip_tags($username));
        $db = self::getConnection();

        $stmt = $db->prepare("DELETE FROM room_presence WHERE room_code = :room AND username = :user");
        $stmt->execute([':room' => $roomCode, ':user' => $username]);

        if ($roomCode !== 'public') {
            self::addMessage(
                roomCode: $roomCode,
                sender: 'Système',
                content: "🚪 {$username} a quitté le salon.",
                type: 'system'
            );
        }
    }

    public static function getRoomPresence(string $roomCode): array
    {
        $roomCode = self::sanitizeCode($roomCode);
        $db = self::getConnection();

        // Active members in the last 60 seconds
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

    public static function purgeOldData(): void
    {
        try {
            $db = self::getConnection();
            $hours = Config::MESSAGE_RETENTION_HOURS;
            $cutoff = date('Y-m-d H:i:s', strtotime("-{$hours} hours"));

            // Find old files to delete physically
            $stmt = $db->prepare("SELECT file_url FROM messages WHERE created_at < :cutoff AND file_url IS NOT NULL");
            $stmt->execute([':cutoff' => $cutoff]);
            $files = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $uploadsDir = Config::getUploadsDir();
            foreach ($files as $fileUrl) {
                $base = basename($fileUrl);
                $filePath = $uploadsDir . DIRECTORY_SEPARATOR . $base;
                if (file_exists($filePath)) {
                    @unlink($filePath);
                }
            }

            // Delete old messages
            $del = $db->prepare("DELETE FROM messages WHERE created_at < :cutoff");
            $del->execute([':cutoff' => $cutoff]);
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
