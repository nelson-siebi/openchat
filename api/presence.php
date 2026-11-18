<?php
/**
 * OpenChat - Presence, Typing & Room Participants API Endpoint
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
    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    if ($roomCode !== 'public') {
        $authUser = Database::getAuthUser();
        if (!$authUser) {
            Config::jsonResponse(['success' => false, 'error' => 'Compte requis.', 'auth_required' => true], 401);
        }
    }

    $me = trim((string)($_GET['user'] ?? ''));
    $presence = Database::getRoomPresence($roomCode);
    $peerMaxReadId = Database::getRoomMaxReadId($roomCode, $me);
    $peerCount = Database::getPeerCount($roomCode, $me);

    Config::jsonResponse([
        'success' => true,
        'room_code' => $roomCode,
        'online_count' => $presence['online_count'],
        'total_active' => $presence['total_active'],
        'peer_max_read_id' => $peerMaxReadId,
        'peer_count' => $peerCount,
        'members' => $presence['members']
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    $action = trim((string)($data['action'] ?? ($_GET['action'] ?? 'ping')));
    $roomCode = trim((string)($data['room_code'] ?? ($_GET['code'] ?? '')));
    $username = trim((string)($data['username'] ?? ($_GET['username'] ?? 'Invité')));
    $color = trim((string)($data['color'] ?? ($_GET['color'] ?? '#10b981')));
    $lastReadId = (int)($data['last_read_id'] ?? ($_GET['last_read_id'] ?? 0));

    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    if ($roomCode !== 'public') {
        $authUser = Database::getAuthUser();
        if (!$authUser) {
            Config::jsonResponse(['success' => false, 'error' => 'Compte requis.', 'auth_required' => true], 401);
        }
    }

    if ($action === 'leave') {
        Database::leavePresence($roomCode, $username);
        Config::jsonResponse(['success' => true, 'action' => 'left']);
    }

    if ($action === 'typing' || $action === 'stop_typing') {
        Database::setTyping($roomCode, $username, $action === 'typing');
        Config::jsonResponse(['success' => true]);
    }

    if ($action === 'read') {
        if ($lastReadId > 0) {
            Database::setLastRead($roomCode, $username, $lastReadId);
        }
        Config::jsonResponse(['success' => true, 'last_read_id' => $lastReadId]);
    }

    $presence = Database::updatePresence($roomCode, $username, $color, $lastReadId);
    $peerMaxReadId = Database::getRoomMaxReadId($roomCode, $username);
    $peerCount = Database::getPeerCount($roomCode, $username);

    Config::jsonResponse([
        'success' => true,
        'room_code' => $roomCode,
        'online_count' => $presence['online_count'],
        'total_active' => $presence['total_active'],
        'peer_max_read_id' => $peerMaxReadId,
        'peer_count' => $peerCount,
        'members' => $presence['members']
    ]);
}

Config::jsonResponse(['success' => false, 'error' => 'Méthode non autorisée.'], 405);
