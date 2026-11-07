<?php
/**
 * OpenChat - Rooms API Endpoint
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

// Helper to generate readable short slug
function generateRandomRoomCode(): string {
    $adjectives = ['swift', 'quick', 'easy', 'flash', 'cool', 'open', 'hyper', 'direct', 'silent', 'bright'];
    $nouns = ['drop', 'chat', 'link', 'note', 'box', 'flow', 'hub', 'beam', 'dock', 'space'];
    $adj = $adjectives[array_rand($adjectives)];
    $noun = $nouns[array_rand($nouns)];
    $randNum = rand(100, 999);
    return "{$adj}-{$noun}-{$randNum}";
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    $requestedCode = trim($data['code'] ?? '');
    $title = trim($data['title'] ?? '');

    if (empty($requestedCode)) {
        $requestedCode = generateRandomRoomCode();
    }

    $room = Database::getOrCreateRoom($requestedCode, $title);
    
    // Purge old messages occasionally (1 out of 20 times)
    if (rand(1, 20) === 1) {
        Database::purgeOldData();
    }

    Config::jsonResponse([
        'success' => true,
        'room' => $room,
        'share_url' => Config::getBaseUrl() . '/room.php?code=' . urlencode($room['code'])
    ]);
}

if ($method === 'GET') {
    $code = trim($_GET['code'] ?? '');
    if (empty($code)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    $room = Database::getOrCreateRoom($code);

    Config::jsonResponse([
        'success' => true,
        'room' => $room,
        'share_url' => Config::getBaseUrl() . '/room.php?code=' . urlencode($room['code'])
    ]);
}

Config::jsonResponse(['success' => false, 'error' => 'Méthode non autorisée.'], 405);
