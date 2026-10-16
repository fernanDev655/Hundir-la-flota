<?php
// save_score.php — Recibe {"name": "...", "shots": N} por POST (JSON) y actualiza el Top 10.
header('Content-Type: application/json; charset=utf-8');

$scoresFile = __DIR__ . '/scores.json';
const MAX_SCORES = 10;

function fail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(["status" => "error", "message" => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    fail(405, 'Método no permitido. Usa POST.');
}

// --- Leer y validar la entrada ---
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    fail(400, 'El cuerpo debe ser un JSON válido.');
}

$playerName = trim((string)($input['name'] ?? ''));
$playerName = preg_replace('/[\x00-\x1F\x7F]/u', '', $playerName) ?? ''; // quita caracteres de control
$playerName = mb_substr($playerName, 0, 20);
if ($playerName === '') {
    $playerName = 'Jugador Anónimo';
}

$shots = $input['shots'] ?? null;
if (!is_int($shots) && !(is_string($shots) && ctype_digit($shots))) {
    fail(400, 'El campo "shots" debe ser un número entero.');
}
$shots = (int)$shots;
// Mínimo posible: 17 aciertos (5+4+3+3+2); máximo: las 100 casillas
if ($shots < 17 || $shots > 100) {
    fail(400, 'Número de disparos fuera de rango (17-100).');
}

// --- Leer, modificar y escribir con bloqueo para evitar condiciones de carrera ---
$fp = fopen($scoresFile, 'c+'); // 'c+' crea el archivo si no existe
if ($fp === false) {
    fail(500, 'No se pudo abrir el archivo de puntuaciones.');
}

flock($fp, LOCK_EX);

$scores = json_decode(stream_get_contents($fp), true);
if (!is_array($scores)) {
    $scores = []; // archivo vacío o corrupto
}

$scores[] = [
    'name'  => $playerName,
    'shots' => $shots,
    'date'  => date('Y-m-d H:i:s'),
];

// Menos disparos = mejor. En empate, gana quien lo logró antes.
usort($scores, function ($a, $b) {
    return [$a['shots'], $a['date'] ?? ''] <=> [$b['shots'], $b['date'] ?? ''];
});

$scores = array_slice($scores, 0, MAX_SCORES);

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($scores, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['status' => 'success', 'message' => 'Puntuación guardada.']);
