<?php
/**
 * OpenChat - Messages & Reactions API Endpoint
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';
require_once __DIR__ . '/../includes/Database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $roomCode = trim($_GET['code'] ?? '');
    $sinceId = (int)($_GET['since_id'] ?? 0);
    $beforeId = (int)($_GET['before_id'] ?? 0);
    $latest = !empty($_GET['latest']);
    $limit = max(1, min(200, (int)($_GET['limit'] ?? 100)));

    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    if ($latest || $beforeId > 0) {
        // Fetch one extra row to know whether older history exists
        $messages = Database::getLatestMessages($roomCode, $limit + 1, $beforeId);
        $hasMore = count($messages) > $limit;
        if ($hasMore) {
            array_shift($messages);
        }
    } else {
        $messages = Database::getMessages($roomCode, $sinceId, $limit);
        $hasMore = false;
    }

    Config::jsonResponse([
        'success' => true,
        'room_code' => $roomCode,
        'messages' => $messages,
        'count' => count($messages),
        'has_more' => $hasMore,
        'server_time' => Database::nowMs()
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    // Handle reaction toggle
    if (($data['action'] ?? '') === 'react') {
        $messageId = (int)($data['message_id'] ?? 0);
        $emoji = trim((string)($data['emoji'] ?? '❤️'));
        $username = trim((string)($data['username'] ?? 'Invité'));

        if ($messageId <= 0) {
            Config::jsonResponse(['success' => false, 'error' => 'ID message manquant.'], 400);
        }

        $res = Database::toggleReaction($messageId, $emoji, $username);
        Config::jsonResponse($res, $res['success'] ? 200 : 404);
    }

    $roomCode = trim((string)($data['room_code'] ?? ''));
    $sender = trim((string)($data['sender'] ?? 'Anonyme'));
    $content = trim((string)($data['content'] ?? ''));
    $type = trim((string)($data['type'] ?? 'text'));
    $fileUrl = isset($data['file_url']) ? (string)$data['file_url'] : null;
    $fileName = isset($data['file_name']) ? (string)$data['file_name'] : null;
    $fileSize = isset($data['file_size']) ? (int)$data['file_size'] : null;
    $meta = Database::sanitizeMeta($data['meta'] ?? null);

    $replyToId = isset($data['reply_to_id']) ? (int)$data['reply_to_id'] : null;
    $replyToSender = isset($data['reply_to_sender']) ? (string)$data['reply_to_sender'] : null;
    $replyToContent = isset($data['reply_to_content']) ? (string)$data['reply_to_content'] : null;

    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    // Reserved types can't be forged by clients
    if ($type === 'system') {
        $type = 'text';
    }

    if ($fileUrl !== null && Database::sanitizeFileUrl($fileUrl) === null) {
        Config::jsonResponse(['success' => false, 'error' => 'Lien de fichier invalide.'], 400);
    }

    if ($content === '' && empty($fileUrl) && $type !== 'album') {
        Config::jsonResponse(['success' => false, 'error' => 'Le message ne peut pas être vide.'], 400);
    }

    // Auto-detect links if it's a plain text URL
    if ($type === 'text' && preg_match('#^https?://[^\s]+$#i', $content)) {
        $type = 'link';
    }

    $message = Database::addMessage(
        roomCode: $roomCode,
        sender: $sender,
        content: $content,
        type: $type,
        fileUrl: $fileUrl,
        fileName: $fileName,
        fileSize: $fileSize,
        replyToId: $replyToId,
        replyToSender: $replyToSender,
        replyToContent: $replyToContent,
        meta: $meta
    );

    // Housekeeping (1 request out of 25)
    if (random_int(1, 25) === 1) {
        Database::purgeOldData();
    }

    Config::jsonResponse([
        'success' => true,
        'message' => $message
    ], 201);
}

Config::jsonResponse(['success' => false, 'error' => 'Méthode non autorisée.'], 405);
