<?php
// get_scores.php — Devuelve el ranking (Top 10) como JSON.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$scoresFile = __DIR__ . '/scores.json';

$scores = [];
if (file_exists($scoresFile)) {
    $decoded = json_decode(file_get_contents($scoresFile), true);
    if (is_array($decoded)) {
        $scores = $decoded;
    }
}

echo json_encode($scores, JSON_UNESCAPED_UNICODE);
