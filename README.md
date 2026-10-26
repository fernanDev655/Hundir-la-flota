# Hundir la Flota — Terminal Naval

Juego clásico de 10 × 10 con interfaz CRT verde, menú interactivo, sonido sintetizado, pausa, estadísticas y ranking Top 10.

## Estructura

- `frontend/index.html`: menú, partida y modales.
- `frontend/style.css`: estética terminal naval responsive.
- `frontend/app.js`: lógica del juego y comunicación con el backend.
- `backend/start_game.php`: genera una flota aleatoria.
- `backend/get_scores.php`: devuelve las mejores puntuaciones.
- `backend/save_score.php`: valida y guarda una puntuación.
- `backend/scores.json`: almacenamiento del ranking.

## Ejecutar en local

Desde la raíz del proyecto, con PHP 8 y la extensión `mbstring`:

```bash
php -S localhost:8000
```

Abre `http://localhost:8000`. El archivo `index.php` redirige a `frontend/`, por lo que las rutas `../backend/*.php` funcionan correctamente. No abras `frontend/index.html` directamente como archivo local: los endpoints necesitan un servidor PHP.

Con Docker:

```bash
docker build -t hundir-la-flota .
docker run --rm -p 3000:3000 hundir-la-flota
```

Abre `http://localhost:3000`.

## Controles

- Ratón o pantalla táctil: disparar y usar los menús.
- Tab + Enter: navegar por el tablero y disparar.
- Escape: pausar o reanudar.

El ranking se guarda en `backend/scores.json`, que debe tener permisos de escritura para el servidor. La preferencia de sonido se guarda únicamente en el navegador.
