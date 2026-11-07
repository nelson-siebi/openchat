<?php
require_once __DIR__ . '/includes/Database.php';

try {
    $db = Database::getConnection();
    $db->exec("DELETE FROM messages;");
    $db->exec("DELETE FROM room_presence;");
    $db->exec("DELETE FROM rooms;");
    $db->exec("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'room_presence', 'rooms');");
    $db->exec("VACUUM;");
    echo "DATABASE RESET COMPLETED SUCCESSFULLY.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
