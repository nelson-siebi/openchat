<?php
/**
 * OpenChat - Server-Sent Events (SSE) Stream
 * Real-time push: new messages, reaction updates and typing indicators
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/Config.php';
require_once __DIR__ . '/../includes/Database.php';

set_time_limit(60);
ignore_user_abort(false);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // For Nginx / FastCGI proxies

$roomCode = trim($_GET['code'] ?? '');
$lastId = (int)($_GET['since_id'] ?? 0);
$me = trim((string)($_GET['user'] ?? ''));
$since = (string)($_GET['since_ts'] ?? '');
if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/', $since)) {
    $since = Database::nowMs();
}

// Make sure every echo reaches the client immediately
while (ob_get_level() > 0) {
    ob_end_flush();
}
ob_implicit_flush(true);

function sse(string $event, array $payload, ?int $id = null): void
{
    if ($id !== null) {
        echo "id: {$id}\n";
    }
    echo "event: {$event}\n";
    echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
    flush();
}

if ($roomCode === '') {
    sse('error', ['error' => 'Room code required']);
    exit;
}

$authUser = Database::getAuthUser();
$isDm = str_starts_with($roomCode, 'dm-');
if ($roomCode === 'public') {
    if (!Database::hasPublicAccess($authUser)) {
        sse('error', ['error' => 'Code d\'accès requis pour le salon public.', 'public_access_required' => true]);
        exit;
    }
} else if ($isDm) {
    if (!$authUser) {
        sse('error', ['error' => 'Compte requis pour cette discussion privée.', 'auth_required' => true]);
        exit;
    }
}

// Ask the browser to retry quickly if the connection drops
echo "retry: 1500\n\n";
flush();

$startTime = time();
$maxDuration = 25; // seconds before gentle reconnect
$lastTyping = null;
$lastMaxReadId = -1;
$lastPeerCount = -1;
$lastPing = time();

while (time() - $startTime < $maxDuration) {
    if (connection_aborted()) {
        break;
    }

    $sent = false;

    $messages = Database::getMessages($roomCode, $lastId, 50);
    if (!empty($messages)) {
        foreach ($messages as $msg) {
            $lastId = max($lastId, (int)$msg['id']);
        }
        sse('messages', ['messages' => $messages], $lastId);
        $sent = true;
    }

    $updates = Database::getMessageUpdates($roomCode, $since);
    if (!empty($updates)) {
        $rxOut = [];
        foreach ($updates as $u) {
            $since = max($since, (string)$u['updated_at']);
            $rxOut[] = ['id' => (int)$u['id'], 'reactions' => Database::normalizeReactions($u['reactions'])];
        }
        sse('reactions', ['updates' => $rxOut, 'since_ts' => $since]);
        sse('messages_updated', ['messages' => $updates, 'since_ts' => $since]);
        $sent = true;
    }

    $curMaxReadId = Database::getRoomMaxReadId($roomCode, $me);
    $curPeerCount = Database::getPeerCount($roomCode, $me);
    if ($curMaxReadId !== $lastMaxReadId || $curPeerCount !== $lastPeerCount) {
        $lastMaxReadId = $curMaxReadId;
        $lastPeerCount = $curPeerCount;
        sse('read_receipt', ['max_read_id' => $curMaxReadId, 'peer_count' => $curPeerCount]);
        $sent = true;
    }

    $typing = Database::getTyping($roomCode, $me);
    $typingKey = implode('|', $typing);
    if ($typingKey !== $lastTyping) {
        $lastTyping = $typingKey;
        sse('typing', ['users' => $typing]);
        $sent = true;
    }

    if (!$sent && time() - $lastPing >= 10) {
        echo ": ping\n\n";
        flush();
        $lastPing = time();
    }

    usleep(700000); // 700ms poll interval on server side
}

// Tell client to reconnect
sse('reconnect', ['lastId' => $lastId, 'since_ts' => $since]);
