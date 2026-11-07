<?php
/**
 * OpenChat - File / Image Upload API
 * Seamless Cloud (Backblaze B2) and Local fallback
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';
require_once __DIR__ . '/../includes/B2Storage.php';

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

// Generate safe filename
$originalName = basename($file['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

// Dangerous executable extensions blocked
$blockedExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'cgi', 'pl', 'exe', 'bat', 'sh', 'com', 'cmd', 'vbs', 'htaccess'];
if (in_array($extension, $blockedExtensions, true)) {
    Config::jsonResponse(['success' => false, 'error' => 'Type de fichier non autorisé pour des raisons de sécurité.'], 400);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']) ?: '';

$isImage = str_starts_with($mimeType, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'heic', 'heif', 'jfif', 'bmp'], true);
$isVideo = str_starts_with($mimeType, 'video/') || in_array($extension, ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'], true);
$isAudio = str_starts_with($mimeType, 'audio/') || in_array($extension, ['wav', 'mp3', 'ogg', 'm4a', 'aac', 'opus'], true);
$type = $isImage ? 'image' : ($isVideo ? 'video' : ($isAudio ? 'audio' : 'file'));

// 1. Try uploading to Backblaze B2 (Zero VPS Disk Space)
if (B2Storage::isConfigured()) {
    try {
        $result = B2Storage::uploadFile($file['tmp_name'], $originalName);
        Config::jsonResponse($result);
    } catch (Throwable $e) {
        // Log or fallback to local if B2 fails
        error_log('B2 Upload error: ' . $e->getMessage());
    }
}

// 2. Fallback to local storage if B2 is disabled or temporarily unavailable
$safeUniqueName = bin2hex(random_bytes(16)) . ($extension ? '.' . $extension : '');
$uploadsDir = Config::getUploadsDir();
$targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $safeUniqueName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    Config::jsonResponse(['success' => false, 'error' => 'Impossible de sauvegarder le fichier sur le serveur.'], 500);
}

$fileUrl = Config::getBaseUrl() . '/uploads/' . $safeUniqueName;

Config::jsonResponse([
    'success' => true,
    'file_url' => $fileUrl,
    'file_name' => $originalName,
    'file_size' => (int)$file['size'],
    'type' => $type
]);
