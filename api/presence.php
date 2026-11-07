<?php
/**
 * OpenChat - Presence & Room Participants API Endpoint
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

    $presence = Database::getRoomPresence($roomCode);
    Config::jsonResponse([
        'success' => true,
        'room_code' => $roomCode,
        'online_count' => $presence['online_count'],
        'total_active' => $presence['total_active'],
        'members' => $presence['members']
    ]);
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    $action = trim($data['action'] ?? ($_GET['action'] ?? 'ping'));
    $roomCode = trim($data['room_code'] ?? ($_GET['code'] ?? ''));
    $username = trim($data['username'] ?? ($_GET['username'] ?? 'Invité'));
    $color = trim($data['color'] ?? ($_GET['color'] ?? '#10b981'));

    if (empty($roomCode)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    if ($action === 'leave') {
        Database::leavePresence($roomCode, $username);
        Config::jsonResponse(['success' => true, 'action' => 'left']);
    }

    $presence = Database::updatePresence($roomCode, $username, $color);
    Config::jsonResponse([
        'success' => true,
        'room_code' => $roomCode,
        'online_count' => $presence['online_count'],
        'total_active' => $presence['total_active'],
        'members' => $presence['members']
    ]);
}
