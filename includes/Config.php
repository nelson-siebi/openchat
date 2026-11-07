<?php
/**
 * OpenChat - Application Configuration
 */

declare(strict_types=1);

class Config
{
    public const APP_NAME = 'OpenChat';
    public const APP_VERSION = '1.0.0';
    public const MAX_FILE_SIZE_MB = 25;
    public const MESSAGE_RETENTION_HOURS = 24; // Automatically cleans messages older than 24h

    public static function getRootDir(): string
    {
        return dirname(__DIR__);
    }

    public static function getDataDir(): string
    {
        $dir = self::getRootDir() . DIRECTORY_SEPARATOR . 'data';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    public static function getUploadsDir(): string
    {
        $dir = self::getRootDir() . DIRECTORY_SEPARATOR . 'uploads';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    public static function getDatabasePath(): string
    {
        return self::getDataDir() . DIRECTORY_SEPARATOR . 'openchat.sqlite';
    }

    /**
     * Dynamically detect base URL of the application.
     */
    public static function getBaseUrl(): string
    {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        $protocol = $isHttps ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

        // Get script path relative to document root
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $baseDir = str_replace('\\', '/', dirname($scriptName));
        
        // Remove trailing api or subfolder if in api/
        $baseDir = preg_replace('#/(api|includes|assets.*)$#', '', $baseDir);
        $baseDir = rtrim($baseDir, '/');

        return $protocol . $host . $baseDir;
    }

    public static function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
