<?php
/**
 * OpenChat - PWA Share Target endpoint
 *
 * When OpenChat is installed as an app, it appears in the system share sheet
 * (next to WhatsApp, Telegram...). Android/desktop browsers POST the shared
 * content here (see manifest.json "share_target").
 *
 * - Normally the service worker intercepts this POST, keeps the files locally
 *   and redirects to index.php?shared=1 (instant, nothing uploaded yet).
 * - If the service worker is not active, this PHP fallback uploads the files,
 *   stores a short-lived draft and redirects to index.php?share=<token>.
 * - GET share.php?token=...&format=json returns (and consumes) that draft.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/Config.php';
require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/Uploader.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET' && isset($_GET['token'])) {
    $draft = Database::takeShareDraft((string)$_GET['token']);
    Config::jsonResponse($draft ? ['success' => true, 'share' => $draft] : ['success' => false, 'error' => 'Partage expiré.'], $draft ? 200 : 404);
}

if ($method !== 'POST') {
    // Text-only GET shares (e.g. share_target with method GET or manual links)
    $params = array_filter([
        'shared_title' => mb_substr(trim((string)($_GET['title'] ?? '')), 0, 300),
        'shared_text' => mb_substr(trim((string)($_GET['text'] ?? '')), 0, 4000),
        'shared_url' => mb_substr(trim((string)($_GET['url'] ?? '')), 0, 2000),
    ]);
    header('Location: index.php' . ($params ? '?' . http_build_query($params) : ''), true, 303);
    exit;
}

$payload = [
    'title' => mb_substr(trim((string)($_POST['title'] ?? '')), 0, 300),
    'text' => mb_substr(trim((string)($_POST['text'] ?? '')), 0, 4000),
    'url' => mb_substr(trim((string)($_POST['url'] ?? '')), 0, 2000),
    'files' => [],
    'errors' => [],
];

if (!empty($_FILES['files'])) {
    foreach (array_slice(Uploader::normalizeFilesArray($_FILES['files']), 0, 10) as $file) {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        try {
            $res = Uploader::store($file);
            $payload['files'][] = [
                'file_url' => $res['file_url'],
                'file_name' => $res['file_name'],
                'file_size' => $res['file_size'],
                'type' => $res['type'],
                'mime' => $res['mime'] ?? '',
            ];
        } catch (Throwable $e) {
            $payload['errors'][] = ($file['name'] ?? 'fichier') . ' : ' . $e->getMessage();
        }
    }
}

$token = Database::saveShareDraft($payload);
header('Location: index.php?share=' . urlencode($token), true, 303);
exit;
