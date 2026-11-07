<?php
/**
 * OpenChat - Direct File Download Proxy
 * Forces browser attachment download instead of in-tab preview
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';

$fileUrl = trim($_GET['url'] ?? '');
$fileName = trim($_GET['name'] ?? 'fichier');

if (empty($fileUrl)) {
    http_response_code(400);
    exit('URL de fichier manquante.');
}

// Sanitize filename for download header
$safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);
if (empty($safeName)) {
    $safeName = 'fichier_telecharge';
}

// Ensure the URL is from our Backblaze bucket or local uploads
$isB2 = str_contains($fileUrl, 'backblazeb2.com');
$isLocal = str_starts_with($fileUrl, Config::getBaseUrl() . '/uploads/');

if (!$isB2 && !$isLocal) {
    http_response_code(403);
    exit('Téléchargement non autorisé.');
}

// Send direct download headers
header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $safeName . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');

// Stream file to user
$ch = curl_init($fileUrl);
curl_setopt_array($ch, [
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_RETURNTRANSFER => false, // directly output to browser
    CURLOPT_TIMEOUT => 300,
    CURLOPT_SSL_VERIFYPEER => true
]);

curl_exec($ch);
curl_close($ch);
exit;
