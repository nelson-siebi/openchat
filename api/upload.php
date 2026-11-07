<?php
/**
 * OpenChat - File / Image Upload API
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';

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
    Config::jsonResponse(['success' => false, 'error' => 'Aucun fichier reçu.'], 400);
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    Config::jsonResponse(['success' => false, 'error' => 'Erreur lors du téléversement (code: ' . $file['error'] . ').'], 400);
}

$maxSizeBytes = Config::MAX_FILE_SIZE_MB * 1024 * 1024;
if ($file['size'] > $maxSizeBytes) {
    Config::jsonResponse(['success' => false, 'error' => 'Le fichier dépasse la taille maximale autorisée (' . Config::MAX_FILE_SIZE_MB . ' Mo).'], 400);
}

// Generate safe unique filename
$originalName = basename($file['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

// Dangerous executable extensions blocked
$blockedExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'cgi', 'pl', 'exe', 'bat', 'sh', 'com', 'cmd', 'vbs', 'htaccess'];
if (in_array($extension, $blockedExtensions, true)) {
    Config::jsonResponse(['success' => false, 'error' => 'Type de fichier non autorisé pour des raisons de sécurité.'], 400);
}

$safeUniqueName = bin2hex(random_bytes(16)) . ($extension ? '.' . $extension : '');
$uploadsDir = Config::getUploadsDir();
$targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $safeUniqueName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    Config::jsonResponse(['success' => false, 'error' => 'Impossible de sauvegarder le fichier sur le serveur.'], 500);
}

$isImage = in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'], true);
$type = $isImage ? 'image' : 'file';

$fileUrl = Config::getBaseUrl() . '/uploads/' . $safeUniqueName;

Config::jsonResponse([
    'success' => true,
    'file_url' => $fileUrl,
    'file_name' => $originalName,
    'file_size' => (int)$file['size'],
    'type' => $type
]);
