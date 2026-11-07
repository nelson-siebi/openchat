<?php
/**
 * OpenChat - Rich Link Preview API (OpenGraph / Twitter Cards / Meta tags)
 * WhatsApp & Telegram style link card generator
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    exit;
}

$url = trim($_GET['url'] ?? '');

if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
    Config::jsonResponse(['success' => false, 'error' => 'URL invalide.'], 400);
}

// 1. SSRF Security Protection: Disallow local/private IP ranges
$parsed = parse_url($url);
$host = $parsed['host'] ?? '';
$scheme = strtolower($parsed['scheme'] ?? '');

if (!in_array($scheme, ['http', 'https'], true) || empty($host)) {
    Config::jsonResponse(['success' => false, 'error' => 'Protocole non supporté.'], 400);
}

// Check if host resolves to private/loopback IP
$ip = gethostbyname($host);
if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
    Config::jsonResponse(['success' => false, 'error' => 'Adresse IP non autorisée.'], 403);
}

// 2. Fetch partial HTML page content (max 256KB to be fast and safe)
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 4,
    CURLOPT_TIMEOUT => 4,
    CURLOPT_CONNECTTIMEOUT => 2,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; OpenChatBot/1.0; +https://openchat.izyboost.site)',
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER => [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8',
        'Range: bytes=0-262144' // Fetch at most first 256KB
    ]
]);

$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!$html || $httpCode >= 400) {
    Config::jsonResponse([
        'success' => true,
        'title' => $host,
        'description' => null,
        'image' => null,
        'site_name' => $host,
        'url' => $url
    ]);
}

// 3. Extract OpenGraph and standard Meta Tags
$title = null;
$description = null;
$image = null;
$siteName = $host;

// Suppress libxml warnings
libxml_use_internal_errors(true);
$dom = new DOMDocument();
@$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
libxml_clear_errors();

$xpath = new DOMXPath($dom);

// OpenGraph Title
$ogTitleNodes = $xpath->query('//meta[@property="og:title"]/@content | //meta[@name="twitter:title"]/@content');
if ($ogTitleNodes && $ogTitleNodes->length > 0) {
    $title = trim($ogTitleNodes->item(0)->nodeValue ?? '');
}
if (empty($title)) {
    $titleNodes = $xpath->query('//title');
    if ($titleNodes && $titleNodes->length > 0) {
        $title = trim($titleNodes->item(0)->nodeValue ?? '');
    }
}

// OpenGraph Description
$ogDescNodes = $xpath->query('//meta[@property="og:description"]/@content | //meta[@name="twitter:description"]/@content | //meta[@name="description"]/@content');
if ($ogDescNodes && $ogDescNodes->length > 0) {
    $description = trim($ogDescNodes->item(0)->nodeValue ?? '');
}

// OpenGraph Image
$ogImgNodes = $xpath->query('//meta[@property="og:image"]/@content | //meta[@name="twitter:image"]/@content');
if ($ogImgNodes && $ogImgNodes->length > 0) {
    $rawImg = trim($ogImgNodes->item(0)->nodeValue ?? '');
    if (!empty($rawImg)) {
        if (str_starts_with($rawImg, '//')) {
            $image = 'https:' . $rawImg;
        } elseif (str_starts_with($rawImg, '/')) {
            $image = $scheme . '://' . $host . $rawImg;
        } elseif (filter_var($rawImg, FILTER_VALIDATE_URL)) {
            $image = $rawImg;
        }
    }
}

// Site Name
$siteNameNodes = $xpath->query('//meta[@property="og:site_name"]/@content');
if ($siteNameNodes && $siteNameNodes->length > 0) {
    $siteName = trim($siteNameNodes->item(0)->nodeValue ?? '') ?: $host;
}

if (empty($title)) {
    $title = $host;
}

Config::jsonResponse([
    'success' => true,
    'title' => mb_substr($title, 0, 100),
    'description' => $description ? mb_substr($description, 0, 180) . (mb_strlen($description) > 180 ? '...' : '') : null,
    'image' => $image,
    'site_name' => $siteName,
    'url' => $url
]);
