<?php
/**
 * OpenChat - Application Principale
 * Salon Public par défaut & Salons Privés instantanés
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/Config.php';
require_once __DIR__ . '/includes/Database.php';

// Determine initial room: defaults to 'public' if no code provided
$requestedCode = Database::sanitizeCode((string)($_GET['code'] ?? ''));
if ($requestedCode === '') {
    $requestedCode = 'public';
}

$room = Database::getOrCreateRoom($requestedCode, $requestedCode === 'public' ? 'Salon Public Général' : '');
$isPublicRoom = ($room['code'] === 'public');
$roomCode = (string)$room['code'];

$pageTitle = $isPublicRoom ? 'OpenChat - Chat & Partage Instantané Sans Inscription' : 'Salon ' . $roomCode . ' - OpenChat';
$pageDesc = 'Partagez en 1 seconde des messages, liens, photos, vocaux et fichiers entre PC et smartphone ou avec vos amis, sans compte ni mot de passe.';
$baseUrl = Config::getBaseUrl();
$canonicalUrl = $baseUrl . '/index.php' . ($isPublicRoom ? '' : '?code=' . urlencode($roomCode));
$ogImage = $baseUrl . '/assets/img/logo.png';
$shareUrl = $baseUrl . '/index.php?code=' . urlencode($roomCode);

$asset = static function (string $path): string {
    $full = __DIR__ . '/' . $path;
    return $path . (is_file($full) ? '?v=' . filemtime($full) : '');
};
$e = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">

    <title><?= $e($pageTitle) ?></title>
    <meta name="description" content="<?= $e($pageDesc) ?>">
    <meta name="keywords" content="chat instantané, partage fichier rapide, transfert pc mobile, pwa chat, chat sans inscription, open source chat, messages vocaux">
    <meta name="robots" content="<?= $isPublicRoom ? 'index, follow' : 'noindex, nofollow' ?>">
    <link rel="canonical" href="<?= $e($canonicalUrl) ?>">

    <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= $e($isPublicRoom ? $pageTitle : 'Rejoignez le salon « ' . $roomCode . ' » sur OpenChat') ?>">
    <meta property="og:description" content="<?= $e($pageDesc) ?>">
    <meta property="og:url" content="<?= $e($canonicalUrl) ?>">
    <meta property="og:image" content="<?= $e($ogImage) ?>">
    <meta property="og:site_name" content="OpenChat">

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= $e($pageTitle) ?>">
    <meta name="twitter:description" content="<?= $e($pageDesc) ?>">
    <meta name="twitter:image" content="<?= $e($ogImage) ?>">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "OpenChat",
      "url": "https://openchat.izyboost.site",
      "description": "Plateforme de chat instantané et de partage de fichiers sans compte.",
      "applicationCategory": "CommunicationApplication",
      "operatingSystem": "All",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
    </script>

    <!-- PWA & Mobile Icons -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#0b1014" id="metaThemeColor">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="OpenChat">
    <link rel="apple-touch-icon" href="assets/icons/icon-192.png">
    <link rel="icon" type="image/svg+xml" href="assets/icons/icon.svg">

    <!-- Apply saved theme before first paint (no flash) -->
    <script>
        (function () {
            try {
                var pref = localStorage.getItem('openchat_theme') || 'auto';
                var dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
                var bubble = localStorage.getItem('openchat_bubble_color');
                if (bubble && /^#[0-9a-f]{6}$/i.test(bubble)) document.documentElement.style.setProperty('--bubble-mine', bubble);
            } catch (e) {}
        })();
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="<?= $asset('assets/css/app.css') ?>">
</head>
<body>

<!-- ============================ ICON SPRITE ============================ -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
    <defs>
        <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/></symbol>
        <symbol id="i-send" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M3.4 20.4 21.85 12.8a.9.9 0 0 0 0-1.6L3.4 3.6a.9.9 0 0 0-1.24 1.06L4.3 11.2a1 1 0 0 0 .76.66l7.44 1.14-7.44 1.14a1 1 0 0 0-.76.66l-2.14 6.54a.9.9 0 0 0 1.24 1.06Z"/></symbol>
        <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M19 10.5v1a7 7 0 0 1-14 0v-1M12 18.5v3"/></symbol>
        <symbol id="i-paperclip" viewBox="0 0 24 24"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></symbol>
        <symbol id="i-camera" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.2"/></symbol>
        <symbol id="i-smile" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/></symbol>
        <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></symbol>
        <symbol id="i-file" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M9 13h6M9 17h4"/></symbol>
        <symbol id="i-music" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></symbol>
        <symbol id="i-video" viewBox="0 0 24 24"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2.5"/></symbol>
        <symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M7 4.9v14.2a1.2 1.2 0 0 0 1.8 1l11.4-7.1a1.2 1.2 0 0 0 0-2L8.8 3.9A1.2 1.2 0 0 0 7 4.9z"/></symbol>
        <symbol id="i-pause" viewBox="0 0 24 24"><rect fill="currentColor" stroke="none" x="5.5" y="4" width="4.5" height="16" rx="1.3"/><rect fill="currentColor" stroke="none" x="14" y="4" width="4.5" height="16" rx="1.3"/></symbol>
        <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></symbol>
        <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/></symbol>
        <symbol id="i-reply" viewBox="0 0 24 24"><path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></symbol>
        <symbol id="i-forward" viewBox="0 0 24 24"><path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></symbol>
        <symbol id="i-share" viewBox="0 0 24 24"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M20 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/></symbol>
        <symbol id="i-qr" viewBox="0 0 24 24"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M21 15h-3a2 2 0 0 0-2 2v4M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1"/></symbol>
        <symbol id="i-more" viewBox="0 0 24 24"><circle fill="currentColor" stroke="none" cx="12" cy="5" r="1.6"/><circle fill="currentColor" stroke="none" cx="12" cy="12" r="1.6"/><circle fill="currentColor" stroke="none" cx="12" cy="19" r="1.6"/></symbol>
        <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>
        <symbol id="i-settings" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></symbol>
        <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
        <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a14.5 14.5 0 0 0 0 19 14.5 14.5 0 0 0 0-19M2.5 12h19"/></symbol>
        <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></symbol>
        <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
        <symbol id="i-chevron-up" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></symbol>
        <symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
        <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
        <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7M19 12H5"/></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
        <symbol id="i-check-check" viewBox="0 0 24 24"><path d="M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16"/></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/></symbol>
        <symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5V12.5M12 16.5h.01"/></symbol>
        <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></symbol>
        <symbol id="i-logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></symbol>
        <symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></symbol>
        <symbol id="i-bell-off" viewBox="0 0 24 24"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20"/></symbol>
        <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></symbol>
        <symbol id="i-moon" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></symbol>
        <symbol id="i-monitor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2.5"/><path d="M8 21h8M12 17v4"/></symbol>
        <symbol id="i-external" viewBox="0 0 24 24"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></symbol>
        <symbol id="i-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></symbol>
        <symbol id="i-sparkles" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></symbol>
        <symbol id="i-phone" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/></symbol>
        <symbol id="i-retry" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></symbol>
        <symbol id="i-install" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><rect x="3" y="17" width="18" height="4" rx="1.5"/></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></symbol>
        <symbol id="i-message" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></symbol>
        <symbol id="i-plane" viewBox="0 0 24 24"><path d="M14.5 21.7a.5.5 0 0 0 .94-.02l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.02.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/></symbol>
        <symbol id="i-sms" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></symbol>
        <symbol id="i-chat-plus" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6M9 10h6"/></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95Z"/></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5z"/></symbol>
        <symbol id="i-sticker" viewBox="0 0 24 24"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4M8 13s1.5 2 4 2 4-2 4-2"/></symbol>
        <symbol id="i-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/></symbol>
        <symbol id="i-volume" viewBox="0 0 24 24"><path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5ZM16 9a5 5 0 0 1 0 6M19.4 18.4a9 9 0 0 0 0-12.8"/></symbol>
        <symbol id="i-hd" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M7 9v6M11 9v6M7 12h4M14.5 9v6h1.5a3 3 0 0 0 0-6Z"/></symbol>
    </defs>
</svg>

<div class="app" id="app" data-room="<?= $e($roomCode) ?>" data-public="<?= $isPublicRoom ? '1' : '0' ?>" data-share-url="<?= $e($shareUrl) ?>">

    <!-- ============================ SIDEBAR ============================ -->
    <aside class="sidebar" id="sidebar" aria-label="Salons">
        <div class="sidebar-head">
            <a href="index.php" class="brand" title="OpenChat">
                <img src="assets/icons/icon.svg" alt="" class="brand-logo" width="34" height="34">
                <span class="brand-name">OpenChat</span>
            </a>
            <div class="sidebar-head-actions">
                <button type="button" class="icon-btn" data-open="settingsModal" title="Paramètres" aria-label="Paramètres">
                    <svg class="ic"><use href="#i-settings"/></svg>
                </button>
                <button type="button" class="icon-btn only-mobile" id="btnCloseSidebar" title="Fermer" aria-label="Fermer le menu">
                    <svg class="ic"><use href="#i-x"/></svg>
                </button>
            </div>
        </div>

        <form class="sidebar-search" id="formQuickJoin" autocomplete="off">
            <svg class="ic"><use href="#i-search"/></svg>
            <input type="text" id="quickJoinInput" placeholder="Rechercher ou rejoindre un salon…" aria-label="Rechercher ou rejoindre un salon" enterkeyhint="go">
        </form>

        <div class="quick-actions">
            <button type="button" class="quick-action" data-open="roomModal" data-tab="create">
                <span class="qa-icon qa-green"><svg class="ic"><use href="#i-chat-plus"/></svg></span>
                <span>Nouveau</span>
            </button>
            <button type="button" class="quick-action" data-open="roomModal" data-tab="join">
                <span class="qa-icon qa-blue"><svg class="ic"><use href="#i-key"/></svg></span>
                <span>Rejoindre</span>
            </button>
            <button type="button" class="quick-action" data-open="inviteModal">
                <span class="qa-icon qa-violet"><svg class="ic"><use href="#i-qr"/></svg></span>
                <span>Connecter</span>
            </button>
        </div>

        <nav class="room-list" id="roomList">
            <a href="index.php?code=public" class="room-item <?= $isPublicRoom ? 'active' : '' ?>" data-code="public">
                <span class="room-avatar room-avatar-public"><svg class="ic"><use href="#i-globe"/></svg></span>
                <span class="room-item-body">
                    <span class="room-item-title">Salon public</span>
                    <span class="room-item-sub">Ouvert à tous, en direct</span>
                </span>
            </a>
            <div class="room-list-label">Salons privés récents</div>
            <div id="recentRooms" class="recent-rooms"></div>
        </nav>

        <div class="sidebar-foot">
            <button type="button" class="profile-chip" data-open="settingsModal" title="Modifier mon profil">
                <span class="avatar avatar-sm" id="profileAvatar">?</span>
                <span class="profile-chip-body">
                    <span class="profile-chip-name" id="profileName">Invité</span>
                    <span class="profile-chip-sub">Toucher pour personnaliser</span>
                </span>
                <svg class="ic ic-sm muted"><use href="#i-chevron-right"/></svg>
            </button>
            <div class="sidebar-foot-row">
                <button type="button" class="btn btn-soft btn-sm" id="btnInstallSidebar" hidden>
                    <svg class="ic ic-sm"><use href="#i-install"/></svg> Installer l'app
                </button>
                <a href="https://github.com/nelson-siebi/openchat" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">
                    <svg class="ic ic-sm"><use href="#i-star"/></svg> GitHub
                </a>
            </div>
        </div>
    </aside>
    <div class="scrim" id="sidebarScrim"></div>

    <!-- ============================ CHAT ============================ -->
    <main class="chat" id="chat">
        <header class="chat-header">
            <button type="button" class="icon-btn only-mobile" id="btnOpenSidebar" aria-label="Menu des salons">
                <svg class="ic"><use href="#i-menu"/></svg>
                <span class="header-unread-dot" id="sidebarUnreadDot" hidden></span>
            </button>

            <button type="button" class="room-ident" data-open="membersModal" title="Infos du salon">
                <span class="room-avatar <?= $isPublicRoom ? 'room-avatar-public' : '' ?>" id="headerRoomAvatar">
                    <?php if ($isPublicRoom): ?><svg class="ic"><use href="#i-globe"/></svg><?php else: ?><?= $e(strtoupper(mb_substr($roomCode, 0, 2))) ?><?php endif; ?>
                </span>
                <span class="room-ident-body">
                    <span class="room-ident-title">
                        <?php if (!$isPublicRoom): ?><svg class="ic ic-xs"><use href="#i-lock"/></svg><?php endif; ?>
                        <span id="roomTitle"><?= $isPublicRoom ? 'Salon public' : $e($roomCode) ?></span>
                    </span>
                    <span class="room-ident-sub" id="roomSubtitle"><span class="online-dot"></span><span id="onlineText">connexion…</span></span>
                </span>
            </button>

            <div class="header-actions">
                <button type="button" class="icon-btn" id="btnInstallHeader" title="Installer l'application" hidden>
                    <svg class="ic"><use href="#i-install"/></svg>
                </button>
                <button type="button" class="icon-btn" data-open="inviteModal" title="Inviter / Connecter un appareil" aria-label="Inviter">
                    <svg class="ic"><use href="#i-share"/></svg>
                </button>
                <div class="menu-anchor">
                    <button type="button" class="icon-btn" id="btnHeaderMore" aria-haspopup="menu" aria-expanded="false" title="Plus d'options">
                        <svg class="ic"><use href="#i-more"/></svg>
                    </button>
                    <div class="dropdown" id="headerMenu" role="menu">
                        <button type="button" class="dropdown-item" data-open="inviteModal"><svg class="ic"><use href="#i-qr"/></svg> Connecter un appareil</button>
                        <button type="button" class="dropdown-item" id="menuCopyLink"><svg class="ic"><use href="#i-link"/></svg> Copier le lien du salon</button>
                        <button type="button" class="dropdown-item" data-open="membersModal"><svg class="ic"><use href="#i-users"/></svg> Membres <span class="dropdown-badge" id="menuOnlineCount">1</span></button>
                        <button type="button" class="dropdown-item" id="menuToggleSound"><svg class="ic" id="menuSoundIcon"><use href="#i-bell"/></svg> <span id="menuSoundText">Couper les sons</span></button>
                        <button type="button" class="dropdown-item" data-open="settingsModal"><svg class="ic"><use href="#i-palette"/></svg> Thème & fond d'écran</button>
                        <button type="button" class="dropdown-item" id="menuInstall" hidden><svg class="ic"><use href="#i-install"/></svg> Installer OpenChat</button>
                        <div class="dropdown-sep"></div>
                        <button type="button" class="dropdown-item danger" id="menuLeave"><svg class="ic"><use href="#i-logout"/></svg> Quitter ce salon</button>
                    </div>
                </div>
            </div>
        </header>

        <div class="notif-banner" id="notifBanner" hidden>
            <svg class="ic"><use href="#i-bell"/></svg>
            <span><strong>Ne ratez rien.</strong> Activez les notifications pour ce salon.</span>
            <button type="button" class="btn btn-primary btn-xs" id="btnAllowNotif">Activer</button>
            <button type="button" class="icon-btn icon-btn-sm" id="btnDismissNotif" aria-label="Plus tard"><svg class="ic ic-sm"><use href="#i-x"/></svg></button>
        </div>

        <div class="chat-body" id="chatScroll">
            <div class="chat-inner">
                <div class="load-older" id="loadOlder" hidden><span class="spinner"></span></div>

                <?php if ($isPublicRoom): ?>
                <div class="pinned-note" id="publicNote">
                    <svg class="ic ic-sm"><use href="#i-globe"/></svg>
                    <span>Salon public : tout le monde voit ces messages. Pour un échange confidentiel, <button type="button" class="link-btn" data-open="roomModal" data-tab="create">créez un salon privé</button>.</span>
                </div>
                <?php else: ?>
                <div class="pinned-note">
                    <svg class="ic ic-sm"><use href="#i-lock"/></svg>
                    <span>Salon privé éphémère : accessible uniquement avec son lien. Messages et fichiers effacés après <?= (int)Config::MESSAGE_RETENTION_HOURS ?> h.</span>
                </div>
                <?php endif; ?>

                <div class="empty-state" id="emptyState" hidden>
                    <div class="empty-art" aria-hidden="true">
                        <span class="empty-bubble b1"></span>
                        <span class="empty-bubble b2"></span>
                        <span class="empty-bubble b3"></span>
                    </div>
                    <h2>C'est calme ici…</h2>
                    <p>Envoyez un message, un vocal, une photo ou un fichier. Ou connectez votre téléphone en scannant un QR code.</p>
                    <div class="empty-actions">
                        <button type="button" class="btn btn-primary" data-open="inviteModal"><svg class="ic ic-sm"><use href="#i-qr"/></svg> Connecter un appareil</button>
                        <button type="button" class="btn btn-soft" data-open="inviteModal"><svg class="ic ic-sm"><use href="#i-share"/></svg> Inviter</button>
                    </div>
                </div>

                <div class="messages" id="messages" role="log" aria-live="polite"></div>

                <div class="typing-row" id="typingRow" hidden>
                    <div class="typing-bubble"><span></span><span></span><span></span></div>
                    <span class="typing-label" id="typingLabel"></span>
                </div>
            </div>
        </div>

        <button type="button" class="fab-scroll" id="btnScrollBottom" aria-label="Aller aux derniers messages">
            <svg class="ic"><use href="#i-chevron-down"/></svg>
            <span class="fab-badge" id="unreadBadge" hidden>0</span>
        </button>

        <div class="dropzone" id="dropzone">
            <div class="dropzone-card">
                <svg class="ic ic-xl"><use href="#i-download"/></svg>
                <strong>Déposez pour envoyer</strong>
                <span>Photos, vidéos, audios, documents… jusqu'à <?= (int)Config::MAX_FILE_SIZE_MB ?> Mo</span>
            </div>
        </div>

        <!-- ============================ COMPOSER ============================ -->
        <footer class="composer" id="composer">
            <div class="composer-panel emoji-panel" id="emojiPanel" hidden></div>

            <div class="composer-panel attach-menu" id="attachMenu" hidden>
                <button type="button" class="attach-item" data-pick="media">
                    <span class="attach-icon a-violet"><svg class="ic"><use href="#i-image"/></svg></span><span>Galerie</span>
                </button>
                <button type="button" class="attach-item" data-pick="camera">
                    <span class="attach-icon a-pink"><svg class="ic"><use href="#i-camera"/></svg></span><span>Caméra</span>
                </button>
                <button type="button" class="attach-item" data-pick="doc">
                    <span class="attach-icon a-blue"><svg class="ic"><use href="#i-file"/></svg></span><span>Document</span>
                </button>
                <button type="button" class="attach-item" data-pick="audio">
                    <span class="attach-icon a-orange"><svg class="ic"><use href="#i-music"/></svg></span><span>Audio</span>
                </button>
            </div>

            <div class="reply-bar" id="replyBar" hidden>
                <svg class="ic ic-sm accent"><use href="#i-reply"/></svg>
                <div class="reply-bar-body">
                    <div class="reply-bar-name" id="replyBarName"></div>
                    <div class="reply-bar-text" id="replyBarText"></div>
                </div>
                <button type="button" class="icon-btn icon-btn-sm" id="btnCancelReply" aria-label="Annuler la réponse"><svg class="ic ic-sm"><use href="#i-x"/></svg></button>
            </div>

            <div class="composer-row" id="composerRow">
                <div class="composer-box" id="composerBox">
                    <button type="button" class="icon-btn composer-btn" id="btnEmoji" aria-label="Emojis et stickers" title="Emojis et stickers">
                        <svg class="ic"><use href="#i-smile"/></svg>
                    </button>
                    <textarea id="messageInput" rows="1" placeholder="Message" aria-label="Écrire un message" enterkeyhint="send" autocomplete="off"></textarea>
                    <button type="button" class="icon-btn composer-btn" id="btnAttach" aria-label="Joindre un fichier" title="Joindre (photos, vidéos, documents)">
                        <svg class="ic"><use href="#i-paperclip"/></svg>
                    </button>
                    <button type="button" class="icon-btn composer-btn" id="btnCamera" aria-label="Prendre une photo" title="Caméra">
                        <svg class="ic"><use href="#i-camera"/></svg>
                    </button>

                    <!-- Hold-to-record overlay (inside the pill) -->
                    <div class="rec-hold" id="recHold" aria-live="polite">
                        <span class="rec-dot"></span>
                        <span class="rec-time" id="recHoldTime">0:00</span>
                        <span class="rec-slide" id="recSlide"><svg class="ic ic-sm"><use href="#i-chevron-left"/></svg> Glisser pour annuler</span>
                    </div>
                </div>

                <button type="button" class="action-btn" id="btnAction" aria-label="Enregistrer un vocal" data-mode="mic">
                    <svg class="ic ic-mic"><use href="#i-mic"/></svg>
                    <svg class="ic ic-send"><use href="#i-send"/></svg>
                </button>

                <div class="rec-lock" id="recLock" aria-hidden="true">
                    <svg class="ic ic-sm"><use href="#i-lock"/></svg>
                    <svg class="ic ic-xs rec-lock-arrow"><use href="#i-chevron-up"/></svg>
                </div>
            </div>

            <!-- Locked (hands-free) recording bar -->
            <div class="rec-locked" id="recLocked" hidden>
                <button type="button" class="icon-btn rec-trash" id="btnRecDelete" aria-label="Supprimer l'enregistrement" title="Supprimer">
                    <svg class="ic"><use href="#i-trash"/></svg>
                </button>
                <div class="rec-live">
                    <span class="rec-dot"></span>
                    <span class="rec-time" id="recLockedTime">0:00</span>
                    <canvas class="rec-canvas" id="recCanvas"></canvas>
                </div>
                <button type="button" class="icon-btn rec-pause" id="btnRecPause" aria-label="Pause" title="Pause">
                    <svg class="ic"><use href="#i-pause"/></svg>
                </button>
                <button type="button" class="action-btn is-send" id="btnRecSend" aria-label="Envoyer le vocal">
                    <svg class="ic ic-send"><use href="#i-send"/></svg>
                </button>
            </div>

            <input type="file" id="inputMedia" accept="image/*,video/*" multiple hidden>
            <input type="file" id="inputCamera" accept="image/*" capture="environment" hidden>
            <input type="file" id="inputDoc" multiple hidden>
            <input type="file" id="inputAudio" accept="audio/*" multiple hidden>
        </footer>
    </main>
</div>

<!-- ============================ MEDIA PREVIEW SHEET ============================ -->
<div class="sheet media-sheet" id="mediaSheet" role="dialog" aria-modal="true" aria-label="Envoyer des fichiers" hidden>
    <div class="media-sheet-top">
        <button type="button" class="icon-btn" id="btnMediaClose" aria-label="Annuler"><svg class="ic"><use href="#i-x"/></svg></button>
        <div class="media-sheet-title" id="mediaSheetTitle">Envoyer</div>
        <button type="button" class="hd-toggle" id="btnHdToggle" aria-pressed="false" title="Envoyer les photos en qualité originale">
            <svg class="ic"><use href="#i-hd"/></svg>
        </button>
        <button type="button" class="icon-btn" id="btnMediaRemove" aria-label="Retirer cet élément" title="Retirer"><svg class="ic"><use href="#i-trash"/></svg></button>
    </div>
    <div class="media-stage" id="mediaStage"></div>
    <div class="media-sheet-bottom">
        <div class="media-thumbs" id="mediaThumbs"></div>
        <div class="media-caption-row">
            <div class="media-caption-box">
                <input type="text" id="mediaCaption" placeholder="Ajouter une légende…" maxlength="2000" enterkeyhint="send" autocomplete="off">
            </div>
            <button type="button" class="action-btn is-send" id="btnMediaSend" aria-label="Envoyer">
                <svg class="ic ic-send"><use href="#i-send"/></svg>
                <span class="send-count" id="mediaSendCount">1</span>
            </button>
        </div>
    </div>
</div>

<!-- ============================ LIGHTBOX ============================ -->
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Visionneuse" hidden>
    <div class="lightbox-top">
        <button type="button" class="icon-btn" id="btnLbClose" aria-label="Fermer"><svg class="ic"><use href="#i-arrow-left"/></svg></button>
        <div class="lightbox-info">
            <div class="lightbox-title" id="lbTitle"></div>
            <div class="lightbox-sub" id="lbSub"></div>
        </div>
        <button type="button" class="icon-btn" id="btnLbShare" title="Partager" aria-label="Partager"><svg class="ic"><use href="#i-share"/></svg></button>
        <button type="button" class="icon-btn" id="btnLbDownload" title="Télécharger" aria-label="Télécharger"><svg class="ic"><use href="#i-download"/></svg></button>
    </div>
    <div class="lightbox-stage" id="lbStage"></div>
    <button type="button" class="lb-nav lb-prev" id="btnLbPrev" aria-label="Précédent"><svg class="ic"><use href="#i-chevron-left"/></svg></button>
    <button type="button" class="lb-nav lb-next" id="btnLbNext" aria-label="Suivant"><svg class="ic"><use href="#i-chevron-right"/></svg></button>
    <div class="lightbox-bottom">
        <div class="lightbox-caption" id="lbCaption"></div>
        <div class="lightbox-counter" id="lbCounter"></div>
    </div>
</div>

<!-- ============================ MESSAGE CONTEXT MENU ============================ -->
<div class="ctx-backdrop" id="ctxBackdrop" hidden>
    <div class="ctx-menu" id="ctxMenu" role="menu">
        <div class="ctx-reactions" id="ctxReactions">
            <button type="button" data-emoji="❤️">❤️</button>
            <button type="button" data-emoji="👍">👍</button>
            <button type="button" data-emoji="😂">😂</button>
            <button type="button" data-emoji="😮">😮</button>
            <button type="button" data-emoji="😢">😢</button>
            <button type="button" data-emoji="🙏">🙏</button>
            <button type="button" data-emoji="🔥">🔥</button>
        </div>
        <div class="ctx-actions">
            <button type="button" class="ctx-item" data-ctx="reply"><svg class="ic"><use href="#i-reply"/></svg> Répondre</button>
            <button type="button" class="ctx-item" data-ctx="copy"><svg class="ic"><use href="#i-copy"/></svg> <span id="ctxCopyLabel">Copier</span></button>
            <button type="button" class="ctx-item" data-ctx="share"><svg class="ic"><use href="#i-forward"/></svg> Partager…</button>
            <button type="button" class="ctx-item" data-ctx="download"><svg class="ic"><use href="#i-download"/></svg> Télécharger</button>
            <button type="button" class="ctx-item" data-ctx="open"><svg class="ic"><use href="#i-external"/></svg> Ouvrir</button>
        </div>
    </div>
</div>

<!-- ============================ MODALS ============================ -->

<!-- Create / join room -->
<div class="modal" id="roomModal" role="dialog" aria-modal="true" aria-labelledby="roomModalTitle" hidden>
    <div class="modal-card">
        <div class="modal-grabber"></div>
        <div class="modal-head">
            <h2 id="roomModalTitle">Salons privés</h2>
            <button type="button" class="icon-btn" data-close aria-label="Fermer"><svg class="ic"><use href="#i-x"/></svg></button>
        </div>
        <div class="segmented" role="tablist">
            <button type="button" class="segment active" data-tab-btn="create" role="tab">Créer</button>
            <button type="button" class="segment" data-tab-btn="join" role="tab">Rejoindre</button>
        </div>

        <div class="tab-pane" data-tab-pane="create">
            <p class="modal-text">Un salon privé est accessible uniquement via son lien ou son code. Idéal pour transférer entre vos appareils ou discuter à deux.</p>
            <button type="button" class="btn btn-primary btn-lg btn-block" id="btnInstantRoom">
                <svg class="ic"><use href="#i-sparkles"/></svg> Générer un salon instantané
            </button>
            <div class="divider-text"><span>ou choisir un nom</span></div>
            <form id="formCustomRoom" class="inline-form" autocomplete="off">
                <div class="field">
                    <span class="field-prefix">#</span>
                    <input type="text" id="customRoomInput" placeholder="mon-transfert-pc" maxlength="50" required pattern="[A-Za-z0-9_\-]+" title="Lettres, chiffres, - et _ uniquement">
                </div>
                <button type="submit" class="btn btn-soft">Créer</button>
            </form>
        </div>

        <div class="tab-pane" data-tab-pane="join" hidden>
            <p class="modal-text">Entrez le code du salon qui vous a été partagé (ex : <code>swift-drop-42</code>).</p>
            <form id="formJoinRoom" class="inline-form" autocomplete="off">
                <div class="field">
                    <span class="field-prefix">#</span>
                    <input type="text" id="joinRoomInput" placeholder="swift-drop-42" maxlength="50" required>
                </div>
                <button type="submit" class="btn btn-primary">Rejoindre</button>
            </form>
        </div>
    </div>
</div>

<!-- Invite / connect device -->
<div class="modal" id="inviteModal" role="dialog" aria-modal="true" aria-labelledby="inviteModalTitle" hidden>
    <div class="modal-card">
        <div class="modal-grabber"></div>
        <div class="modal-head">
            <h2 id="inviteModalTitle">Inviter dans ce salon</h2>
            <button type="button" class="icon-btn" data-close aria-label="Fermer"><svg class="ic"><use href="#i-x"/></svg></button>
        </div>

        <div class="invite-qr">
            <div class="qr-frame"><div id="qrCode"></div></div>
            <div class="qr-text">
                <strong>Scannez avec votre téléphone</strong>
                <span>Ouvrez l'appareil photo et visez le code : vous rejoignez ce salon instantanément.</span>
                <span class="qr-status" id="qrStatus"><span class="online-dot"></span> En attente du scan…</span>
            </div>
        </div>

        <div class="link-box">
            <svg class="ic ic-sm muted"><use href="#i-link"/></svg>
            <input type="text" id="inviteLink" readonly value="<?= $e($shareUrl) ?>" aria-label="Lien du salon">
            <button type="button" class="btn btn-soft btn-sm" id="btnCopyInvite">Copier</button>
        </div>

        <div class="share-grid">
            <button type="button" class="share-target" id="btnNativeShare" hidden>
                <span class="share-icon s-primary"><svg class="ic"><use href="#i-share"/></svg></span><span>Partager…</span>
            </button>
            <a class="share-target" id="shareWhatsapp" target="_blank" rel="noopener">
                <span class="share-icon s-whatsapp"><svg class="ic"><use href="#i-message"/></svg></span><span>WhatsApp</span>
            </a>
            <a class="share-target" id="shareTelegram" target="_blank" rel="noopener">
                <span class="share-icon s-telegram"><svg class="ic"><use href="#i-plane"/></svg></span><span>Telegram</span>
            </a>
            <a class="share-target" id="shareSms">
                <span class="share-icon s-sms"><svg class="ic"><use href="#i-sms"/></svg></span><span>SMS</span>
            </a>
            <a class="share-target" id="shareEmail">
                <span class="share-icon s-mail"><svg class="ic"><use href="#i-mail"/></svg></span><span>E-mail</span>
            </a>
        </div>
    </div>
</div>

<!-- Settings -->
<div class="modal" id="settingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle" hidden>
    <div class="modal-card modal-wide">
        <div class="modal-grabber"></div>
        <div class="modal-head">
            <h2 id="settingsModalTitle">Personnalisation</h2>
            <button type="button" class="icon-btn" data-close aria-label="Fermer"><svg class="ic"><use href="#i-x"/></svg></button>
        </div>

        <div class="modal-scroll">
            <section class="settings-section">
                <h3>Profil</h3>
                <div class="profile-edit">
                    <span class="avatar avatar-lg" id="settingsAvatar">?</span>
                    <div class="profile-edit-fields">
                        <label class="field">
                            <input type="text" id="settingsName" maxlength="24" placeholder="Votre pseudo" autocomplete="nickname">
                        </label>
                        <div class="swatches" id="avatarSwatches">
                            <button type="button" class="swatch" data-color="#10b981" style="--c:#10b981" aria-label="Émeraude"></button>
                            <button type="button" class="swatch" data-color="#3b82f6" style="--c:#3b82f6" aria-label="Bleu"></button>
                            <button type="button" class="swatch" data-color="#8b5cf6" style="--c:#8b5cf6" aria-label="Violet"></button>
                            <button type="button" class="swatch" data-color="#ec4899" style="--c:#ec4899" aria-label="Rose"></button>
                            <button type="button" class="swatch" data-color="#f59e0b" style="--c:#f59e0b" aria-label="Ambre"></button>
                            <button type="button" class="swatch" data-color="#06b6d4" style="--c:#06b6d4" aria-label="Cyan"></button>
                            <button type="button" class="swatch" data-color="#ef4444" style="--c:#ef4444" aria-label="Rouge"></button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="settings-section">
                <h3>Thème</h3>
                <div class="segmented segmented-icons" id="themeSegment">
                    <button type="button" class="segment" data-theme-opt="auto"><svg class="ic ic-sm"><use href="#i-monitor"/></svg> Auto</button>
                    <button type="button" class="segment" data-theme-opt="light"><svg class="ic ic-sm"><use href="#i-sun"/></svg> Clair</button>
                    <button type="button" class="segment" data-theme-opt="dark"><svg class="ic ic-sm"><use href="#i-moon"/></svg> Sombre</button>
                </div>
            </section>

            <section class="settings-section">
                <h3>Fond d'écran</h3>
                <div class="wallpapers" id="wallpaperGrid">
                    <button type="button" class="wallpaper" data-wp="default"><span class="wp wp-default"></span><span>Classique</span></button>
                    <button type="button" class="wallpaper" data-wp="doodle"><span class="wp wp-doodle"></span><span>Doodle</span></button>
                    <button type="button" class="wallpaper" data-wp="aurora"><span class="wp wp-aurora"></span><span>Aurore</span></button>
                    <button type="button" class="wallpaper" data-wp="sunset"><span class="wp wp-sunset"></span><span>Crépuscule</span></button>
                    <button type="button" class="wallpaper" data-wp="midnight"><span class="wp wp-midnight"></span><span>Océan</span></button>
                    <button type="button" class="wallpaper" data-wp="oled"><span class="wp wp-oled"></span><span>Uni</span></button>
                </div>
            </section>

            <section class="settings-section">
                <h3>Couleur de vos bulles</h3>
                <div class="swatches swatches-lg" id="bubbleSwatches">
                    <button type="button" class="swatch" data-bubble="#059669" style="--c:#059669" aria-label="Émeraude"></button>
                    <button type="button" class="swatch" data-bubble="#2563eb" style="--c:#2563eb" aria-label="Saphir"></button>
                    <button type="button" class="swatch" data-bubble="#7c3aed" style="--c:#7c3aed" aria-label="Violet"></button>
                    <button type="button" class="swatch" data-bubble="#db2777" style="--c:#db2777" aria-label="Fuchsia"></button>
                    <button type="button" class="swatch" data-bubble="#0891b2" style="--c:#0891b2" aria-label="Cyan"></button>
                    <button type="button" class="swatch" data-bubble="#ea580c" style="--c:#ea580c" aria-label="Orange"></button>
                    <button type="button" class="swatch" data-bubble="#334155" style="--c:#334155" aria-label="Ardoise"></button>
                </div>
            </section>

            <section class="settings-section">
                <h3>Notifications</h3>
                <label class="switch-row">
                    <span><svg class="ic ic-sm"><use href="#i-volume"/></svg> Sons des messages</span>
                    <input type="checkbox" class="switch" id="settingsSound">
                </label>
                <label class="switch-row">
                    <span><svg class="ic ic-sm"><use href="#i-reply"/></svg> Entrée pour envoyer</span>
                    <input type="checkbox" class="switch" id="settingsEnterSend">
                </label>
                <button type="button" class="btn btn-soft btn-sm" id="btnSettingsNotif" hidden><svg class="ic ic-sm"><use href="#i-bell"/></svg> Activer les notifications</button>
            </section>
        </div>

        <div class="modal-foot">
            <button type="button" class="btn btn-primary btn-block" id="btnSaveSettings">Enregistrer</button>
        </div>
    </div>
</div>

<!-- Members -->
<div class="modal" id="membersModal" role="dialog" aria-modal="true" aria-labelledby="membersModalTitle" hidden>
    <div class="modal-card">
        <div class="modal-grabber"></div>
        <div class="modal-head">
            <h2 id="membersModalTitle">Membres du salon</h2>
            <button type="button" class="icon-btn" data-close aria-label="Fermer"><svg class="ic"><use href="#i-x"/></svg></button>
        </div>
        <div class="room-card">
            <span class="room-avatar room-avatar-lg <?= $isPublicRoom ? 'room-avatar-public' : '' ?>" id="membersRoomAvatar">
                <?php if ($isPublicRoom): ?><svg class="ic"><use href="#i-globe"/></svg><?php else: ?><?= $e(strtoupper(mb_substr($roomCode, 0, 2))) ?><?php endif; ?>
            </span>
            <div>
                <div class="room-card-title"><?= $isPublicRoom ? 'Salon public' : $e($roomCode) ?></div>
                <div class="room-card-sub" id="membersCountText">—</div>
            </div>
        </div>
        <div class="members-list" id="membersList"></div>
        <div class="modal-actions">
            <button type="button" class="btn btn-danger-soft" id="btnLeaveRoom"><svg class="ic ic-sm"><use href="#i-logout"/></svg> Quitter</button>
            <button type="button" class="btn btn-primary" data-open="inviteModal"><svg class="ic ic-sm"><use href="#i-share"/></svg> Inviter</button>
        </div>
    </div>
</div>

<!-- Share target: content received from another app -->
<div class="modal" id="shareModal" role="dialog" aria-modal="true" aria-labelledby="shareModalTitle" hidden>
    <div class="modal-card">
        <div class="modal-grabber"></div>
        <div class="modal-head">
            <h2 id="shareModalTitle">Partager dans OpenChat</h2>
            <button type="button" class="icon-btn" data-close aria-label="Fermer"><svg class="ic"><use href="#i-x"/></svg></button>
        </div>
        <div class="share-preview" id="sharePreview"></div>
        <div class="room-list-label">Envoyer dans…</div>
        <div class="share-rooms" id="shareRooms"></div>
        <button type="button" class="btn btn-soft btn-block" id="btnShareNewRoom"><svg class="ic ic-sm"><use href="#i-sparkles"/></svg> Nouveau salon privé</button>
    </div>
</div>

<div class="toasts" id="toasts" aria-live="polite"></div>

<script>
    window.OPENCHAT = {
        room: <?= json_encode($roomCode) ?>,
        isPublic: <?= $isPublicRoom ? 'true' : 'false' ?>,
        shareUrl: <?= json_encode($shareUrl, JSON_UNESCAPED_SLASHES) ?>,
        maxFileMb: <?= (int)Config::MAX_FILE_SIZE_MB ?>,
        retentionHours: <?= (int)Config::MESSAGE_RETENTION_HOURS ?>
    };
</script>
<script src="<?= $asset('assets/js/qrcode.min.js') ?>" defer></script>
<script src="<?= $asset('assets/js/core.js') ?>" defer></script>
<script src="<?= $asset('assets/js/media.js') ?>" defer></script>
<script src="<?= $asset('assets/js/app.js') ?>" defer></script>
</body>
</html>
