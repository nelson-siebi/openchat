<?php
/**
 * OpenChat - User Authentication API (Register, Login, Me, Logout)
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';
require_once __DIR__ . '/../includes/Database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?? $_POST;
$action = trim((string)($data['action'] ?? ($_GET['action'] ?? 'me')));

if ($action === 'register') {
    $username = trim((string)($data['username'] ?? ''));
    $password = (string)($data['password'] ?? '');
    $email = isset($data['email']) ? trim((string)$data['email']) : null;
    $avatarColor = trim((string)($data['avatar_color'] ?? '#10b981'));

    $res = Database::registerUser($username, $password, $email, $avatarColor);
    if ($res['success']) {
        setcookie('openchat_token', $res['token'], [
            'expires' => time() + (30 * 86400),
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
        Config::jsonResponse($res, 201);
    } else {
        Config::jsonResponse($res, 400);
    }
}

if ($action === 'login') {
    $login = trim((string)($data['username'] ?? ($data['login'] ?? '')));
    $password = (string)($data['password'] ?? '');

    $res = Database::loginUser($login, $password);
    if ($res['success']) {
        setcookie('openchat_token', $res['token'], [
            'expires' => time() + (30 * 86400),
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
        Config::jsonResponse($res, 200);
    } else {
        Config::jsonResponse($res, 401);
    }
}

if ($action === 'logout') {
    $token = $_COOKIE['openchat_token'] ?? ($data['auth_token'] ?? '');
    if (!empty($token)) {
        Database::deleteSession((string)$token);
    }
    setcookie('openchat_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => false,
        'samesite' => 'Lax'
    ]);
    Config::jsonResponse(['success' => true]);
}

if ($action === 'me') {
    $user = Database::getAuthUser();
    Config::jsonResponse([
        'success' => true,
        'logged_in' => $user !== null,
        'user' => $user
    ]);
}

Config::jsonResponse(['success' => false, 'error' => 'Action inconnue.'], 400);
