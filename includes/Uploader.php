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
    /**
     * Every file type is accepted (code, scripts, archives, executables, markdown...).
     *
     * Only these extensions are written to OUR disk with their real extension, because a
     * web server will only ever serve them as passive content. Anything else (php, html,
     * svg, js, sh, exe, .htaccess, md...) is stored under a neutral ".bin" name, so it can
     * never be executed or rendered from our domain. The original name is kept for display
     * and downloads (api/download.php sends it back in Content-Disposition).
     */
    private const LOCAL_SAFE_EXTENSIONS = [
        'jpg', 'jpeg', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp', 'heic', 'heif',
        'mp4', 'mov', 'webm', 'mkv', 'm4v', '3gp', 'avi',
        'mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'flac', 'weba',
        'pdf', 'txt', 'csv', 'rtf', 'epub',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
        'zip', 'rar', '7z', 'gz', 'tgz', 'tar', 'bz2', 'xz', 'apk',
    ];

    /** Types a browser would render as a page/script: sent to B2 as plain downloads. */
    private const ACTIVE_CONTENT_EXTENSIONS = ['html', 'htm', 'xhtml', 'xht', 'shtml', 'xml', 'xsl', 'xslt', 'js', 'mjs'];

    public static function isActiveContent(string $extension, string $mimeType): bool
    {
        return in_array($extension, self::ACTIVE_CONTENT_EXTENSIONS, true)
            || (bool)preg_match('#^(text/html|application/xhtml|text/xml|application/xml|text/javascript|application/javascript)#i', $mimeType);
    }

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
                $forcedType = self::isActiveContent($extension, $mimeType) ? 'application/octet-stream' : null;
                $result = B2Storage::uploadFile($file['tmp_name'], $originalName, $forcedType);
                $result['type'] = $typeHint === 'audio' ? 'audio' : ($result['type'] ?? $type);
                $result['mime'] = $mimeType;
                return $result;
            } catch (Throwable $e) {
                error_log('B2 Upload error: ' . $e->getMessage());
            }
        }

        // 2. Local fallback
        return self::storeLocal($file['tmp_name'], $originalName, (int)$file['size'], $type, $mimeType);
    }

    /**
     * Save on our own disk under a random name. Non-passive extensions become ".bin".
     */
    public static function storeLocal(string $tmpPath, string $originalName, int $size, string $type, string $mimeType): array
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $storedExtension = in_array($extension, self::LOCAL_SAFE_EXTENSIONS, true) ? $extension : 'bin';
        $safeUniqueName = bin2hex(random_bytes(16)) . '.' . $storedExtension;
        $targetPath = Config::getUploadsDir() . DIRECTORY_SEPARATOR . $safeUniqueName;

        $moved = is_uploaded_file($tmpPath)
            ? move_uploaded_file($tmpPath, $targetPath)
            : rename($tmpPath, $targetPath);

        if (!$moved) {
            throw new RuntimeException('Impossible de sauvegarder le fichier sur le serveur.');
        }

        // A neutralised SVG can't be displayed inline any more: show it as a file
        if ($storedExtension === 'bin' && $type === 'image') {
            $type = 'file';
        }

        return [
            'success' => true,
            'file_url' => Config::getBaseUrl() . '/uploads/' . $safeUniqueName,
            'file_name' => $originalName,
            'file_size' => $size,
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
