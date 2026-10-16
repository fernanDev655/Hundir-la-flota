<?php
// start_game.php — Genera una partida nueva con la flota colocada al azar.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store'); // cada recarga debe dar una partida distinta

$boardSize = 10;

$fleetDefinition = [
    ["name" => "Portaaviones", "size" => 5],
    ["name" => "Acorazado",    "size" => 4],
    ["name" => "Destructor",   "size" => 3],
    ["name" => "Submarino",    "size" => 3],
    ["name" => "Patrullero",   "size" => 2],
];

/**
 * Intenta colocar un barco en una posición aleatoria.
 * Devuelve el array de coordenadas, o null si no es válida (fuera del tablero o solapada).
 */
function tryPlaceShip(int $size, int $boardSize, array $occupied): ?array
{
    $horizontal = random_int(0, 1) === 1;
    $startRow = random_int(0, $boardSize - 1);
    $startCol = random_int(0, $boardSize - 1);

    $coords = [];
    for ($i = 0; $i < $size; $i++) {
        $row = $startRow + ($horizontal ? 0 : $i);
        $col = $startCol + ($horizontal ? $i : 0);

        if ($row >= $boardSize || $col >= $boardSize) {
            return null; // se sale del tablero
        }
        if (isset($occupied["$row,$col"])) {
            return null; // solapa con otro barco
        }
        $coords[] = ["row" => $row, "col" => $col];
    }
    return $coords;
}

$placedShips = [];
$occupied = []; // clave "fila,col" => true (búsqueda O(1))

foreach ($fleetDefinition as $shipInfo) {
    $coords = null;
    $attempts = 0;

    // Límite de intentos para no entrar nunca en un bucle infinito
    while ($coords === null && $attempts < 1000) {
        $coords = tryPlaceShip($shipInfo["size"], $boardSize, $occupied);
        $attempts++;
    }

    if ($coords === null) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "No se pudo generar el tablero."]);
        exit;
    }

    foreach ($coords as $c) {
        $occupied[$c["row"] . "," . $c["col"]] = true;
    }

    $placedShips[] = [
        "name"      => $shipInfo["name"],
        "size"      => $shipInfo["size"],
        "positions" => $coords,
        "hits"      => 0,
        "isSunk"    => false,
    ];
}

echo json_encode([
    "boardSize" => $boardSize,
    "fleet"     => $placedShips,
]);
