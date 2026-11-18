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
    $action = trim((string)($data['action'] ?? ($_GET['action'] ?? '')));

    // 1. Verify Public Room Access Code
    if ($action === 'verify_public_code') {
        $code = trim((string)($data['code'] ?? ''));
        $currentCode = Database::getPublicAccessCode();
        if ($code !== '' && hash_equals($currentCode, $code)) {
            $hash = Database::getPublicAccessHash($currentCode);
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
            setcookie('openchat_public_access', $hash, [
                'expires' => time() + (86400 * 30),
                'path' => '/',
                'secure' => $isHttps,
                'httponly' => false,
                'samesite' => 'Lax'
            ]);
            Config::jsonResponse([
                'success' => true,
                'token' => $hash,
                'message' => 'Accès au salon public autorisé.'
            ]);
        } else {
            Config::jsonResponse([
                'success' => false,
                'error' => 'Code d\'accès incorrect. Veuillez réessayer.'
            ], 401);
        }
    }

    // 2. Nelson Pro: Get current Public Room Access Code
    if ($action === 'get_public_code') {
        $authUser = Database::getAuthUser();
        if (!Database::isNelsonAdmin($authUser)) {
            Config::jsonResponse(['success' => false, 'error' => 'Accès réservé exclusivement à Nelson Pro.'], 403);
        }
        Config::jsonResponse([
            'success' => true,
            'code' => Database::getPublicAccessCode()
        ]);
    }

    // 3. Nelson Pro: Update Public Room Access Code
    if ($action === 'set_public_code') {
        $authUser = Database::getAuthUser();
        if (!Database::isNelsonAdmin($authUser)) {
            Config::jsonResponse(['success' => false, 'error' => 'Accès réservé exclusivement à Nelson Pro.'], 403);
        }
        $newCode = trim((string)($data['code'] ?? ''));
        if (strlen($newCode) < 3) {
            Config::jsonResponse(['success' => false, 'error' => 'Le code d\'accès doit contenir au moins 3 caractères.'], 400);
        }
        Database::setPublicAccessCode($newCode);
        Config::jsonResponse([
            'success' => true,
            'code' => $newCode,
            'message' => 'Code d\'accès du salon public mis à jour avec succès.'
        ]);
    }

    // 4. Direct Message: Get or Create 1-on-1 private discussion
    if ($action === 'get_or_create_dm') {
        $authUser = Database::getAuthUser();
        if (!$authUser) {
            Config::jsonResponse([
                'success' => false,
                'error' => 'Veuillez vous connecter ou créer un compte pour démarrer une discussion privée.',
                'auth_required' => true
            ], 401);
        }
        $target = trim((string)($data['target'] ?? ($_GET['target'] ?? '')));
        if ($target === '') {
            Config::jsonResponse(['success' => false, 'error' => 'Destinataire manquant.'], 400);
        }
        if (strcasecmp($target, (string)$authUser['username']) === 0) {
            Config::jsonResponse(['success' => false, 'error' => 'Vous ne pouvez pas créer de discussion privée avec vous-même.'], 400);
        }
        $room = Database::getOrCreateDmRoom((string)$authUser['username'], $target);
        Config::jsonResponse([
            'success' => true,
            'room' => $room,
            'room_code' => $room['code'],
            'target' => $target
        ]);
    }

    // 5. Search registered users
    if ($action === 'search_users') {
        $q = trim((string)($data['q'] ?? ($_GET['q'] ?? '')));
        $users = Database::searchUsers($q, 20);
        Config::jsonResponse([
            'success' => true,
            'users' => $users
        ]);
    }

    // 6. Create Private Room (requires authenticated account)
    $authUser = Database::getAuthUser();
    if (!$authUser) {
        Config::jsonResponse([
            'success' => false,
            'error' => 'Veuillez créer un compte ou vous connecter pour créer un salon privé.',
            'auth_required' => true
        ], 401);
    }

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
    $action = trim((string)($_GET['action'] ?? ''));
    if ($action === 'search_users') {
        $q = trim((string)($_GET['q'] ?? ''));
        $users = Database::searchUsers($q, 20);
        Config::jsonResponse([
            'success' => true,
            'users' => $users
        ]);
    }

    $code = trim($_GET['code'] ?? '');
    if (empty($code)) {
        Config::jsonResponse(['success' => false, 'error' => 'Code de salon manquant.'], 400);
    }

    $authUser = Database::getAuthUser();

    // Public room check
    if ($code === 'public') {
        if (!Database::hasPublicAccess($authUser)) {
            Config::jsonResponse([
                'success' => false,
                'error' => 'Code d\'accès requis pour accéder au salon public.',
                'public_access_required' => true
            ], 403);
        }
    } else {
        // Private rooms require an account
        if (!$authUser) {
            Config::jsonResponse([
                'success' => false,
                'error' => 'Veuillez créer un compte ou vous connecter pour accéder à ce salon privé.',
                'auth_required' => true
            ], 401);
        }
    }

    $room = Database::getOrCreateRoom($code);

    Config::jsonResponse([
        'success' => true,
        'room' => $room,
        'share_url' => Config::getBaseUrl() . '/room.php?code=' . urlencode($room['code'])
    ]);
}

Config::jsonResponse(['success' => false, 'error' => 'Méthode non autorisée.'], 405);

