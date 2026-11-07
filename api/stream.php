<?php
/**
 * OpenChat - Server-Sent Events (SSE) Stream
 * Real-time event push for instant chat updates
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';
require_once __DIR__ . '/../includes/Database.php';

// Disable execution time limit for long-polling loop
set_time_limit(60);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // For Nginx / FastCGI proxies

$roomCode = trim($_GET['code'] ?? '');
$lastId = (int)($_GET['since_id'] ?? 0);

if (empty($roomCode)) {
    echo "event: error\n";
    echo "data: " . json_encode(['error' => 'Room code required']) . "\n\n";
    flush();
    exit;
}

// Ensure session/output buffering is closed so output streams immediately
if (ob_get_level() > 0) {
    ob_end_flush();
}

$startTime = time();
$maxDuration = 25; // seconds before gentle reconnect

while (time() - $startTime < $maxDuration) {
    if (connection_aborted()) {
        break;
    }

    $messages = Database::getMessages($roomCode, $lastId, 50);

    if (!empty($messages)) {
        foreach ($messages as $msg) {
            $lastId = max($lastId, (int)$msg['id']);
        }
        echo "id: {$lastId}\n";
        echo "event: messages\n";
        echo "data: " . json_encode(['messages' => $messages]) . "\n\n";
        flush();
    } else {
        // Send heartbeat ping to keep connection alive
        echo ": ping\n\n";
        flush();
    }

    usleep(800000); // 800ms poll interval on server side
}

// Tell client to reconnect
echo "event: reconnect\n";
echo "data: {\"lastId\": {$lastId}}\n\n";
flush();
