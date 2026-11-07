<?php
/**
 * OpenChat - Messages API Endpoint
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
    $limit = min(200, (int)($_GET['limit'] ?? 100));

    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    $messages = Database::getMessages($roomCode, $sinceId, $limit);

    Config::jsonResponse([
        'success' => true,
        'room_code' => $roomCode,
        'messages' => $messages,
        'count' => count($messages)
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    $roomCode = trim($data['room_code'] ?? '');
    $sender = trim($data['sender'] ?? 'Anonyme');
    $content = trim($data['content'] ?? '');
    $type = trim($data['type'] ?? 'text');
    $fileUrl = $data['file_url'] ?? null;
    $fileName = $data['file_name'] ?? null;
    $fileSize = isset($data['file_size']) ? (int)$data['file_size'] : null;

    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    if (empty($content) && empty($fileUrl)) {
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
        fileSize: $fileSize
    );

    Config::jsonResponse([
        'success' => true,
        'message' => $message
    ], 201);
}

Config::jsonResponse(['success' => false, 'error' => 'Méthode non autorisée.'], 405);
