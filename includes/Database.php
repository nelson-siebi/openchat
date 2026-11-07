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
                type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'image', 'video', 'audio', 'link', 'peer_joined'
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

            CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages (room_code, id);
            CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
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
