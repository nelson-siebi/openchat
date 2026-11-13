<?php
/**
 * OpenChat - File / Image Upload API
 * Seamless Cloud (Backblaze B2) and Local fallback
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';
require_once __DIR__ . '/../includes/Uploader.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Config::jsonResponse(['success' => false, 'error' => 'Méthode non autorisée.'], 405);
}

if (empty($_FILES['file'])) {
    // post_max_size exceeded empties $_FILES and $_POST entirely
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    $error = $len > 0 ? 'Le fichier est trop volumineux pour le serveur.' : 'Aucun fichier reçu.';
    Config::jsonResponse(['success' => false, 'error' => $error], 400);
}

try {
    $hint = ($_POST['kind'] ?? '') === 'voice' ? 'audio' : null;
    $result = Uploader::store($_FILES['file'], $hint);
    Config::jsonResponse($result);
} catch (RuntimeException $e) {
    Config::jsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
} catch (Throwable $e) {
    error_log('Upload error: ' . $e->getMessage());
    Config::jsonResponse(['success' => false, 'error' => 'Erreur serveur lors du téléversement.'], 500);
}
