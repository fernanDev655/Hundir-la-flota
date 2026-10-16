// ============== HUNDIR LA FLOTA - FRONT-END ==============

// --- PASO 1: SELECCIÓN DE ELEMENTOS DEL DOM ---
const gameBoard = document.getElementById("game-board");
const messageArea = document.getElementById("message-area");
const fleetStatusEl = document.getElementById("fleet-status");
const shotCounterEl = document.getElementById("shot-counter");
const scoreListEl = document.getElementById("score-list");
const modal = document.getElementById("game-over-modal");
const modalText = document.getElementById("modal-text");
const playerNameInput = document.getElementById("player-name");
const saveScoreBtn = document.getElementById("save-score-btn");

// --- PASO 2: ESTADO DEL JUEGO ---
let gameState = {
  boardSize: 0,
  fleet: [],
  shotsFired: 0,
  shipsSunk: 0,
  isGameOver: false,
};

// --- PASO 3: INICIO DEL JUEGO ---
async function startGame() {
  try {
    // Para probar sin Back-End, cambia temporalmente a: 'ejemplo_tablero.json'
    const response = await fetch("ejemploTablero.json");
    const data = await response.json();
    gameState.boardSize = data.boardSize;
    gameState.fleet = data.fleet;
    gameState.shotsFired = 0;
    gameState.shipsSunk = 0;
    gameState.isGameOver = false;

    shotCounterEl.textContent = 0;

    renderBoard();
    renderFleetStatus();
    messageArea.textContent = "¡Dispara para empezar!";
  } catch (error) {
    messageArea.textContent = "Error al conectar con el servidor.";
    console.error(error);
  }
}

// --- PASO 4: RENDERIZADO DE LA INTERFAZ ---
function renderBoard() {
  gameBoard.innerHTML = "";
  gameBoard.style.gridTemplateColumns = `repeat(${gameState.boardSize}, 40px)`;

  for (let row = 0; row < gameState.boardSize; row++) {
    for (let col = 0; col < gameState.boardSize; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener("click", handleCellClick);
      gameBoard.appendChild(cell);
    }
  }
}

function renderFleetStatus() {
  fleetStatusEl.innerHTML = "";

  gameState.fleet.forEach((ship, index) => {
    const li = document.createElement("li");
    li.id = `ship-${index}`;
    li.textContent = `${ship.name} (${ship.size} casillas)`;
    fleetStatusEl.appendChild(li);
  });
}

// --- PASO 5: LÓGICA DE DISPARO ---
function handleCellClick(event) {
  const cell = event.target;

  // Si el juego terminó o ya se disparó a esta celda, no hacemos nada
  if (gameState.isGameOver || cell.dataset.fired === "true") return;

  cell.dataset.fired = "true";
  gameState.shotsFired++;
  shotCounterEl.textContent = gameState.shotsFired;

  // Las coordenadas del dataset son texto: hay que convertirlas a número
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  // Buscar qué barco (si alguno) ocupa esta casilla
  const shipIndex = gameState.fleet.findIndex((ship) =>
    ship.positions.some((p) => p.row === row && p.col === col),
  );

  if (shipIndex !== -1) {
    // ----- TOCADO -----
    const ship = gameState.fleet[shipIndex];
    cell.classList.add("tocado");
    ship.hits++;
    messageArea.textContent = "¡Tocado!";

    if (ship.hits === ship.size) {
      // ----- HUNDIDO -----
      ship.isSunk = true;
      gameState.shipsSunk++;
      messageArea.textContent = `¡Hundido! ${ship.name}`;

      // Pintar todas las casillas del barco como hundidas
      ship.positions.forEach((p) => {
        const shipCell = document.querySelector(
          `.cell[data-row="${p.row}"][data-col="${p.col}"]`,
        );
        shipCell.classList.remove("tocado");
        shipCell.classList.add("hundido");
      });

      // Actualizar la lista de la flota
      document.getElementById(`ship-${shipIndex}`).classList.add("sunk");

      // ¿Quedan barcos?
      if (gameState.shipsSunk === gameState.fleet.length) {
        endGame();
      }
    }
  } else {
    // ----- AGUA -----
    cell.classList.add("agua");
    messageArea.textContent = "¡Agua!";
  }
}

// --- PASO 6: FIN DEL JUEGO Y PUNTUACIONES ---
function endGame() {
  gameState.isGameOver = true;
  modalText.textContent = `Has hundido toda la flota en ${gameState.shotsFired} disparos.`;
  modal.style.display = "flex";
  playerNameInput.focus();
}

saveScoreBtn.addEventListener("click", async () => {
  const name = playerNameInput.value.trim() || "Jugador Anónimo";
  const puntuacion = { name: name, shots: gameState.shotsFired };

  // Evita doble clic mientras se guarda
  saveScoreBtn.disabled = true;

  try {
    const response = await fetch("save_score.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(puntuacion),
    });
    await response.json();

    modal.style.display = "none";
    messageArea.textContent = "¡Puntuación guardada! Gracias por jugar.";
    await loadScores();
  } catch (error) {
    messageArea.textContent = "Error al guardar la puntuación.";
    console.error(error);
  } finally {
    saveScoreBtn.disabled = false;
  }
});

async function loadScores() {
  try {
    const response = await fetch("get_scores.php");
    const scores = await response.json();

    scoreListEl.innerHTML = "";
    scores.forEach((score) => {
      const li = document.createElement("li");
      li.textContent = `${score.name} - ${score.shots} disparos`;
      scoreListEl.appendChild(li);
    });
  } catch (error) {
    console.error("No se pudo cargar el ranking:", error);
  }
}

// --- INVOCACIÓN INICIAL ---
startGame();
loadScores();
