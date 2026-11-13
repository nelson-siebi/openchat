<?php
/**
 * OpenChat - Shared upload pipeline (Backblaze B2 with local fallback)
 * Used by api/upload.php and the PWA share target (share.php).
 */

declare(strict_types=1);

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/B2Storage.php';

class Uploader
{
    private const BLOCKED_EXTENSIONS = [
        'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phps', 'phar', 'cgi', 'pl', 'asp', 'aspx', 'jsp',
        'exe', 'bat', 'sh', 'com', 'cmd', 'vbs', 'ps1', 'htaccess', 'htpasswd', 'ini', 'shtml'
    ];

    public static function detectType(string $mimeType, string $extension): string
    {
        $isImage = str_starts_with($mimeType, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'heic', 'heif', 'jfif', 'bmp'], true);
        $isVideo = str_starts_with($mimeType, 'video/') || in_array($extension, ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'], true);
        $isAudio = str_starts_with($mimeType, 'audio/') || in_array($extension, ['wav', 'mp3', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'flac', 'weba'], true);

        // Voice notes recorded as webm are audio even if finfo says video/webm
        if ($isVideo && $extension === 'webm' && str_starts_with(strtolower($mimeType), 'audio/')) {
            return 'audio';
        }

        return $isImage ? 'image' : ($isVideo ? 'video' : ($isAudio ? 'audio' : 'file'));
    }

    /**
     * Store one entry of $_FILES. Returns the API payload or throws a RuntimeException with a user-facing message.
     */
    public static function store(array $file, ?string $typeHint = null): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $code = (int)($file['error'] ?? -1);
            $msg = match ($code) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Le fichier dépasse la taille autorisée par le serveur.',
                UPLOAD_ERR_PARTIAL => 'Le téléversement a été interrompu.',
                UPLOAD_ERR_NO_FILE => 'Aucun fichier reçu.',
                default => 'Erreur lors du téléversement (code: ' . $code . ').',
            };
            throw new RuntimeException($msg);
        }

        $maxSizeBytes = Config::MAX_FILE_SIZE_MB * 1024 * 1024;
        if ((int)$file['size'] > $maxSizeBytes) {
            throw new RuntimeException('Le fichier dépasse la taille maximale autorisée (' . Config::MAX_FILE_SIZE_MB . ' Mo).');
        }

        $originalName = trim(basename(str_replace('\\', '/', (string)$file['name'])));
        if ($originalName === '' || $originalName === '.' || $originalName === '..') {
            $originalName = 'fichier';
        }
        $originalName = mb_substr($originalName, 0, 180);
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
            throw new RuntimeException('Type de fichier non autorisé pour des raisons de sécurité.');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']) ?: '';
        $clientMime = (string)($file['type'] ?? '');

        $type = self::detectType($clientMime !== '' ? $clientMime : $mimeType, $extension);
        if ($type === 'file') {
            $type = self::detectType($mimeType, $extension);
        }
        if ($typeHint === 'audio') {
            $type = 'audio';
        }

        // 1. Backblaze B2 (zero VPS disk usage)
        if (B2Storage::isConfigured()) {
            try {
                $result = B2Storage::uploadFile($file['tmp_name'], $originalName);
                $result['type'] = $typeHint === 'audio' ? 'audio' : ($result['type'] ?? $type);
                $result['mime'] = $mimeType;
                return $result;
            } catch (Throwable $e) {
                error_log('B2 Upload error: ' . $e->getMessage());
            }
        }

        // 2. Local fallback
        $safeUniqueName = bin2hex(random_bytes(16)) . ($extension ? '.' . preg_replace('/[^a-z0-9]/', '', $extension) : '');
        $targetPath = Config::getUploadsDir() . DIRECTORY_SEPARATOR . $safeUniqueName;

        $moved = is_uploaded_file($file['tmp_name'])
            ? move_uploaded_file($file['tmp_name'], $targetPath)
            : rename($file['tmp_name'], $targetPath);

        if (!$moved) {
            throw new RuntimeException('Impossible de sauvegarder le fichier sur le serveur.');
        }

        return [
            'success' => true,
            'file_url' => Config::getBaseUrl() . '/uploads/' . $safeUniqueName,
            'file_name' => $originalName,
            'file_size' => (int)$file['size'],
            'type' => $type,
            'mime' => $mimeType,
        ];
    }

    /**
     * Normalise $_FILES['x'] (single or multiple) into a flat list of file arrays.
     */
    public static function normalizeFilesArray(array $entry): array
    {
        if (!is_array($entry['name'] ?? null)) {
            return [$entry];
        }
        $files = [];
        foreach ($entry['name'] as $i => $name) {
            $files[] = [
                'name' => $name,
                'type' => $entry['type'][$i] ?? '',
                'tmp_name' => $entry['tmp_name'][$i] ?? '',
                'error' => $entry['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                'size' => $entry['size'][$i] ?? 0,
            ];
        }
        return $files;
    }
}
