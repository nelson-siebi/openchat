<?php
declare(strict_types=1);

$code = trim($_GET['code'] ?? '');
if (!empty($code)) {
    header('Location: index.php?code=' . urlencode($code));
} else {
    header('Location: index.php');
}
exit;
