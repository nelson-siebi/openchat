<?php
/**
 * OpenChat - Backblaze B2 Cloud Storage Integration
 * Zero disk footprint on VPS
 */

declare(strict_types=1);

require_once __DIR__ . '/Config.php';

class B2Storage
{
    private const CACHE_FILE = 'b2_auth_cache.json';

    public static function isConfigured(): bool
    {
        return !empty(Config::B2_KEY_ID) && !empty(Config::B2_APPLICATION_KEY) && !empty(Config::B2_BUCKET_ID);
    }

    private static function getCachePath(): string
    {
        return sys_get_temp_dir() . DIRECTORY_SEPARATOR . self::CACHE_FILE;
    }

    /**
     * Authorize with B2 API (with caching for token validity)
     */
    public static function getAuth(): array
    {
        $cachePath = self::getCachePath();
        if (file_exists($cachePath)) {
            $data = json_decode(file_get_contents($cachePath), true);
            // Tokens last 24h, refresh if older than 20h
            if (!empty($data['authorizationToken']) && (time() - ($data['cached_at'] ?? 0) < 72000)) {
                return $data;
            }
        }

        $credentials = base64_encode(Config::B2_KEY_ID . ':' . Config::B2_APPLICATION_KEY);
        $ch = curl_init('https://api.backblazeb2.com/b2api/v2/b2_authorize_account');
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => ['Authorization: Basic ' . $credentials],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            throw new RuntimeException("Échec d'authentification Backblaze B2 (code: {$httpCode})");
        }

        $auth = json_decode($response, true);
        $auth['cached_at'] = time();
        @file_put_contents($cachePath, json_encode($auth));

        return $auth;
    }

    /**
     * Upload a file to Backblaze B2 and return public or signed download URL
     */
    public static function uploadFile(string $filePath, string $originalFileName): array
    {
        if (!file_exists($filePath)) {
            throw new InvalidArgumentException("Fichier introuvable: {$filePath}");
        }

        $auth = self::getAuth();
        $fileBytes = file_get_contents($filePath);
        if ($fileBytes === false) {
            throw new RuntimeException("Impossible de lire le fichier: {$filePath}");
        }

        $fileSize = strlen($fileBytes);
        $fileSha1 = sha1($fileBytes);
        $extension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
        $uniqueName = 'chat_' . bin2hex(random_bytes(10)) . ($extension ? '.' . $extension : '');

        // 1. Get Upload URL
        $ch = curl_init($auth['apiUrl'] . '/b2api/v2/b2_get_upload_url');
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $auth['authorizationToken'],
                'Content-Type: application/json'
            ],
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(['bucketId' => Config::B2_BUCKET_ID]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15
        ]);

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$res) {
            throw new RuntimeException("Impossible d'obtenir l'URL d'upload B2 (code {$httpCode}): " . $res);
        }

        $uploadMeta = json_decode($res, true);
        $uploadUrl = $uploadMeta['uploadUrl'];
        $uploadAuthToken = $uploadMeta['authorizationToken'];

        // Determine content type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->buffer($fileBytes) ?: 'application/octet-stream';

        // 2. Upload file bytes via POST
        $ch = curl_init($uploadUrl);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $uploadAuthToken,
                'X-Bz-File-Name: ' . rawurlencode($uniqueName),
                'Content-Type: ' . $mimeType,
                'Content-Length: ' . $fileSize,
                'X-Bz-Content-Sha1: ' . $fileSha1
            ],
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fileBytes,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60
        ]);

        $uploadRes = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$uploadRes) {
            throw new RuntimeException("Erreur de téléversement vers B2 (code {$httpCode}): " . $uploadRes);
        }

        $fileData = json_decode($uploadRes, true);

        // 3. Generate 7-day download authorization token for this file
        $downloadToken = self::getDownloadAuthToken($uniqueName, 86400 * 7);

        $downloadBaseUrl = $auth['downloadUrl'] . '/file/' . rawurlencode(Config::B2_BUCKET_NAME) . '/' . rawurlencode($uniqueName);
        $finalUrl = $downloadToken ? ($downloadBaseUrl . '?Authorization=' . urlencode($downloadToken)) : $downloadBaseUrl;

        $isImage = str_starts_with($mimeType, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'heic', 'heif', 'jfif', 'bmp'], true);
        $isVideo = str_starts_with($mimeType, 'video/') || in_array($extension, ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'], true);
        $isAudio = str_starts_with($mimeType, 'audio/') || in_array($extension, ['wav', 'mp3', 'ogg', 'm4a', 'aac', 'opus'], true);
        $type = $isImage ? 'image' : ($isVideo ? 'video' : ($isAudio ? 'audio' : 'file'));

        return [
            'success' => true,
            'file_id' => $fileData['fileId'],
            'file_name' => $originalFileName,
            'b2_file_name' => $uniqueName,
            'file_size' => $fileSize,
            'file_url' => $finalUrl,
            'type' => $type
        ];
    }

    /**
     * Get a download authorization token for a file
     */
    public static function getDownloadAuthToken(string $fileNamePrefix = '', int $validSeconds = 604800): ?string
    {
        try {
            $auth = self::getAuth();
            $ch = curl_init($auth['apiUrl'] . '/b2api/v2/b2_get_download_authorization');
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER => [
                    'Authorization: ' . $auth['authorizationToken'],
                    'Content-Type: application/json'
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode([
                    'bucketId' => Config::B2_BUCKET_ID,
                    'fileNamePrefix' => $fileNamePrefix,
                    'validDurationInSeconds' => $validSeconds
                ]),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15
            ]);

            $res = curl_exec($ch);
            curl_close($ch);
            if ($res) {
                $data = json_decode($res, true);
                return $data['authorizationToken'] ?? null;
            }
        } catch (Throwable $e) {
            // ignore
        }
        return null;
    }

    /**
     * Delete file from B2
     */
    public static function deleteFile(string $fileId, string $fileName): bool
    {
        try {
            $auth = self::getAuth();
            $ch = curl_init($auth['apiUrl'] . '/b2api/v2/b2_delete_file_version');
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER => [
                    'Authorization: ' . $auth['authorizationToken'],
                    'Content-Type: application/json'
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode([
                    'fileName' => $fileName,
                    'fileId' => $fileId
                ]),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15
            ]);
            $res = curl_exec($ch);
            curl_close($ch);
            return $res !== false;
        } catch (Throwable $e) {
            return false;
        }
    }
}
