<?php
/**
 * OpenChat - Direct File Download Proxy
 * Forces a real "download" (Content-Disposition: attachment) for cross-origin
 * Backblaze files, which is the only reliable way on iOS / Android PWAs.
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';

$fileUrl = trim($_GET['url'] ?? '');
$fileName = trim($_GET['name'] ?? 'fichier');
$inline = !empty($_GET['inline']);

if ($fileUrl === '' || !filter_var($fileUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    exit('URL de fichier manquante.');
}

// Only our Backblaze bucket or our own local uploads can be proxied (prevents SSRF)
$parts = parse_url($fileUrl);
$host = strtolower($parts['host'] ?? '');
$scheme = strtolower($parts['scheme'] ?? '');
$isB2 = $scheme === 'https' && (str_ends_with($host, '.backblazeb2.com'));
$isLocal = str_starts_with($fileUrl, Config::getBaseUrl() . '/uploads/');

if (!$isB2 && !$isLocal) {
    http_response_code(403);
    exit('Téléchargement non autorisé.');
}

// Local files are served straight from disk
if ($isLocal) {
    $base = basename((string)($parts['path'] ?? ''));
    $path = Config::getUploadsDir() . DIRECTORY_SEPARATOR . $base;
    if ($base === '' || !is_file($path)) {
        http_response_code(404);
        exit('Fichier introuvable.');
    }
}

// RFC 5987 filename (keeps accents) + ASCII fallback
$fileName = str_replace(["\r", "\n", '"', '/', '\\'], '', $fileName) ?: 'fichier';
$asciiName = preg_replace('/[^A-Za-z0-9._-]/', '_', $fileName) ?: 'fichier';
$disposition = ($inline ? 'inline' : 'attachment') . '; filename="' . $asciiName . '"; filename*=UTF-8\'\'' . rawurlencode($fileName);

while (ob_get_level() > 0) {
    ob_end_clean();
}

header('Content-Description: File Transfer');
header('Content-Disposition: ' . $disposition);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=3600');

if ($isLocal) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $localType = $finfo->file($path) ?: 'application/octet-stream';
    $safeInline = (bool)preg_match('#^(application/pdf|image/(png|jpe?g|gif|webp|avif)|video/|audio/|text/plain)#', $localType);
    header('Content-Type: ' . ($inline && $safeInline ? $localType : 'application/octet-stream'));
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

// Stream from B2, forwarding size & (safe) type headers so the browser can show progress
header('Content-Type: application/octet-stream');
$ch = curl_init($fileUrl);
curl_setopt_array($ch, [
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use ($inline) {
        $lower = strtolower(trim($header));
        if (str_starts_with($lower, 'content-length:')) {
            header(trim($header));
        } elseif ($inline && str_starts_with($lower, 'content-type:')) {
            $type = trim(substr($lower, 13));
            // Never render active content (HTML/SVG/JS) inline from our origin
            if (preg_match('#^(application/pdf|image/(png|jpe?g|gif|webp|avif)|video/|audio/|text/plain)#', $type)) {
                header('Content-Type: ' . $type);
            }
        }
        return strlen($header);
    },
]);

curl_exec($ch);
curl_close($ch);
exit;
