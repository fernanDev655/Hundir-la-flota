// ============== HUNDIR LA FLOTA — FRONTEND ==============
"use strict";

// La página se sirve desde /frontend/ y los endpoints viven en /backend/.
const API_BASE = "../backend/";

const $ = (id) => document.getElementById(id);
const elements = {
    mainMenu: $("main-menu"),
    gameScreen: $("game-screen"),
    startBtn: $("start-btn"),
    instructionsBtn: $("instructions-btn"),
    instructionsPanel: $("instructions-panel"),
    soundBtn: $("sound-btn"),
    gameBoard: $("game-board"),
    messageArea: $("message-area"),
    fleetStatus: $("fleet-status"),
    shotCounter: $("shot-counter"),
    sunkCounter: $("sunk-counter"),
    accuracy: $("accuracy"),
    scoreList: $("score-list"),
    scoresEmpty: $("scores-empty"),
    menuBestValue: $("menu-best-value"),
    pauseBtn: $("pause-btn"),
    restartBtn: $("restart-btn"),
    menuBtn: $("menu-btn"),
    pauseModal: $("pause-modal"),
    resumeBtn: $("resume-btn"),
    pauseMenuBtn: $("pause-menu-btn"),
    gameOverModal: $("game-over-modal"),
    modalText: $("modal-text"),
    saveScoreForm: $("save-score-form"),
    playerName: $("player-name"),
    saveScoreBtn: $("save-score-btn"),
    saveError: $("save-error"),
    postVictoryActions: $("post-victory-actions"),
    playAgainBtn: $("play-again-btn"),
    victoryMenuBtn: $("victory-menu-btn"),
};

const initialState = () => ({
    boardSize: 10,
    fleet: [],
    shotsFired: 0,
    successfulHits: 0,
    shipsSunk: 0,
    isGameOver: false,
    isPaused: false,
    isPlaying: false,
    requestId: 0,
});
let gameState = initialState();
let soundEnabled = readSoundPreference();
let audioContext = null;

function readSoundPreference() {
    try { return localStorage.getItem("hundirLaFlota.sound") !== "off"; }
    catch { return true; }
}

function saveSoundPreference() {
    try { localStorage.setItem("hundirLaFlota.sound", soundEnabled ? "on" : "off"); }
    catch { /* El juego funciona igual si el navegador bloquea el almacenamiento. */ }
}

function updateSoundButton() {
    elements.soundBtn.textContent = `SONIDO: ${soundEnabled ? "ON" : "OFF"}`;
    elements.soundBtn.setAttribute("aria-pressed", String(soundEnabled));
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const settings = {
            start: [180, 420, .16],
            water: [180, 90, .12],
            hit: [280, 650, .15],
            sunk: [180, 55, .4],
            victory: [330, 880, .55],
            click: [360, 440, .06],
        }[type] || [250, 300, .08];
        const now = audioContext.currentTime;
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(settings[0], now);
        oscillator.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
        gain.gain.setValueAtTime(.035, now);
        gain.gain.exponentialRampToValueAtTime(.0001, now + settings[2]);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + settings[2]);
    } catch { /* Audio no disponible: se mantiene el feedback visual. */ }
}

async function fetchJson(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        cache: "no-store",
        ...options,
        headers: { Accept: "application/json", ...(options.headers || {}) },
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error(`Respuesta no válida de ${endpoint}.`); }
    if (!response.ok || data.status === "error") {
        throw new Error(data.message || `Error HTTP ${response.status} en ${endpoint}.`);
    }
    return data;
}

function setMessage(text, type = "") {
    elements.messageArea.textContent = text;
    elements.messageArea.className = type;
}

function updateStats() {
    elements.shotCounter.textContent = String(gameState.shotsFired).padStart(3, "0");
    elements.sunkCounter.textContent = gameState.shipsSunk;
    elements.accuracy.textContent = gameState.shotsFired
        ? `${Math.round((gameState.successfulHits / gameState.shotsFired) * 100)}%`
        : "—";
}

function renderBoard() {
    elements.gameBoard.replaceChildren();
    elements.gameBoard.style.gridTemplateColumns = `repeat(${gameState.boardSize}, var(--cell-size))`;
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute("role", "gridcell");
            cell.setAttribute("aria-label", `Disparar a fila ${row + 1}, columna ${col + 1}`);
            cell.addEventListener("click", handleCellClick);
            fragment.appendChild(cell);
        }
    }
    elements.gameBoard.appendChild(fragment);
}

function renderFleetStatus() {
    elements.fleetStatus.replaceChildren();
    gameState.fleet.forEach((ship, index) => {
        const li = document.createElement("li");
        li.id = `ship-${index}`;
        if (ship.isSunk) li.classList.add("sunk");
        const icon = document.createElement("span");
        icon.className = "ship-icon";
        icon.setAttribute("aria-hidden", "true");
        const meta = document.createElement("span");
        meta.className = "ship-meta";
        const name = document.createElement("span");
        name.className = "ship-name";
        name.textContent = ship.name;
        const size = document.createElement("span");
        size.className = "ship-size";
        size.textContent = `${ship.size} cas.`;
        meta.append(name, size);
        li.append(icon, meta);
        elements.fleetStatus.appendChild(li);
    });
}

async function startGame() {
    const requestId = ++gameState.requestId;
    gameState = { ...initialState(), requestId };
    elements.mainMenu.hidden = true;
    elements.gameScreen.hidden = false;
    elements.pauseModal.hidden = true;
    elements.gameOverModal.hidden = true;
    elements.saveScoreForm.hidden = false;
    elements.postVictoryActions.hidden = true;
    elements.saveError.textContent = "";
    elements.playerName.value = "";
    elements.gameBoard.replaceChildren();
    elements.fleetStatus.replaceChildren();
    updateStats();
    setMessage("Estableciendo enlace con el radar…");
    elements.restartBtn.disabled = true;

    try {
        const data = await fetchJson("start_game.php");
        if (requestId !== gameState.requestId) return;
        if (!Number.isInteger(data.boardSize) || data.boardSize !== 10 || !Array.isArray(data.fleet)) {
            throw new Error("El servidor devolvió un tablero incompleto.");
        }
        gameState.boardSize = data.boardSize;
        gameState.fleet = data.fleet;
        gameState.isPlaying = true;
        renderBoard();
        renderFleetStatus();
        setMessage("Partida iniciada. Selecciona una coordenada para disparar.");
        playSound("start");
    } catch (error) {
        if (requestId !== gameState.requestId) return;
        setMessage(`Error de conexión: ${error.message} Pulsa REINICIAR para reintentar.`, "sunk");
    } finally {
        if (requestId === gameState.requestId) elements.restartBtn.disabled = false;
    }
}

function handleCellClick(event) {
    const cell = event.currentTarget;
    if (!gameState.isPlaying || gameState.isGameOver || gameState.isPaused || cell.disabled) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    cell.disabled = true;
    cell.setAttribute("aria-label", `Fila ${row + 1}, columna ${col + 1}: disparo realizado`);
    gameState.shotsFired++;

    const shipIndex = gameState.fleet.findIndex((ship) =>
        ship.positions.some((position) => position.row === row && position.col === col)
    );

    if (shipIndex === -1) {
        cell.classList.add("agua");
        setMessage(`AGUA — coordenada ${String.fromCharCode(65 + row)}${col + 1}.`);
        playSound("water");
    } else {
        const ship = gameState.fleet[shipIndex];
        gameState.successfulHits++;
        ship.hits++;
        cell.classList.add("tocado");
        setMessage(`TOCADO — impacto en ${ship.name}.`, "hit");
        playSound("hit");

        if (ship.hits === ship.size) {
            ship.isSunk = true;
            gameState.shipsSunk++;
            ship.positions.forEach((position) => {
                const shipCell = elements.gameBoard.querySelector(
                    `[data-row="${position.row}"][data-col="${position.col}"]`
                );
                shipCell.classList.remove("tocado");
                shipCell.classList.add("hundido");
            });
            $(`ship-${shipIndex}`).classList.add("sunk");
            setMessage(`HUNDIDO — ${ship.name} fuera de combate.`, "sunk");
            playSound("sunk");
        }
    }
    updateStats();
    if (gameState.shipsSunk === gameState.fleet.length) endGame();
}

function endGame() {
    gameState.isGameOver = true;
    gameState.isPlaying = false;
    elements.modalText.textContent = `Has hundido los cinco barcos en ${gameState.shotsFired} disparos, con una precisión del ${Math.round((gameState.successfulHits / gameState.shotsFired) * 100)}%. Registra tu resultado en el terminal.`;
    elements.saveScoreForm.hidden = false;
    elements.postVictoryActions.hidden = true;
    elements.gameOverModal.hidden = false;
    playSound("victory");
    setTimeout(() => elements.playerName.focus(), 50);
}

async function saveScore() {
    if (!gameState.isGameOver) return;
    const name = elements.playerName.value.trim() || "Jugador Anónimo";
    elements.saveScoreBtn.disabled = true;
    elements.saveScoreBtn.textContent = "TRANSMITIENDO…";
    elements.saveError.textContent = "";
    try {
        await fetchJson("save_score.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, shots: gameState.shotsFired }),
        });
        elements.saveScoreForm.hidden = true;
        elements.postVictoryActions.hidden = false;
        await loadScores();
        elements.playAgainBtn.focus();
    } catch (error) {
        elements.saveError.textContent = `No se pudo guardar: ${error.message}`;
    } finally {
        elements.saveScoreBtn.disabled = false;
        elements.saveScoreBtn.textContent = "GUARDAR PUNTUACIÓN";
    }
}

function renderScores(scores) {
    elements.scoreList.replaceChildren();
    elements.scoresEmpty.hidden = scores.length > 0;
    scores.forEach((score) => {
        const li = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = score.name;
        li.append(name, document.createTextNode(` — ${score.shots} disparos`));
        elements.scoreList.appendChild(li);
    });
    if (scores.length) {
        elements.menuBestValue.textContent = `${scores[0].shots} DISPAROS — ${scores[0].name}`;
    } else {
        elements.menuBestValue.textContent = "— SIN REGISTROS —";
    }
}

async function loadScores() {
    try {
        const scores = await fetchJson("get_scores.php");
        if (!Array.isArray(scores)) throw new Error("Formato de ranking incorrecto.");
        renderScores(scores);
    } catch {
        elements.scoreList.replaceChildren();
        elements.scoresEmpty.hidden = false;
        elements.scoresEmpty.textContent = "Ranking temporalmente no disponible.";
        elements.menuBestValue.textContent = "— RANKING NO DISPONIBLE —";
    }
}

function setBoardDisabled(disabled) {
    elements.gameBoard.querySelectorAll(".cell").forEach((cell) => {
        if (!cell.classList.contains("agua") && !cell.classList.contains("tocado") && !cell.classList.contains("hundido")) {
            cell.disabled = disabled;
        }
    });
}

function togglePause(force) {
    if (!gameState.isPlaying || gameState.isGameOver) return;
    gameState.isPaused = typeof force === "boolean" ? force : !gameState.isPaused;
    elements.pauseModal.hidden = !gameState.isPaused;
    setBoardDisabled(gameState.isPaused);
    if (gameState.isPaused) elements.resumeBtn.focus();
    else elements.pauseBtn.focus();
}

function returnToMenu() {
    gameState.requestId++;
    gameState.isPlaying = false;
    gameState.isPaused = false;
    elements.pauseModal.hidden = true;
    elements.gameOverModal.hidden = true;
    elements.gameScreen.hidden = true;
    elements.mainMenu.hidden = false;
    elements.startBtn.focus();
    loadScores();
}

// Controles del menú
elements.startBtn.addEventListener("click", startGame);
elements.instructionsBtn.addEventListener("click", () => {
    const willOpen = elements.instructionsPanel.hidden;
    elements.instructionsPanel.hidden = !willOpen;
    elements.instructionsBtn.setAttribute("aria-expanded", String(willOpen));
    playSound("click");
});
elements.soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    saveSoundPreference();
    updateSoundButton();
    if (soundEnabled) playSound("click");
});

// Controles de partida y modales
elements.pauseBtn.addEventListener("click", () => togglePause());
elements.resumeBtn.addEventListener("click", () => togglePause(false));
elements.restartBtn.addEventListener("click", startGame);
elements.menuBtn.addEventListener("click", returnToMenu);
elements.pauseMenuBtn.addEventListener("click", returnToMenu);
elements.victoryMenuBtn.addEventListener("click", returnToMenu);
elements.playAgainBtn.addEventListener("click", startGame);
elements.saveScoreBtn.addEventListener("click", saveScore);
elements.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveScore();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.gameScreen.hidden) togglePause();
    if (event.key === "Enter" && !elements.mainMenu.hidden && event.target === document.body) startGame();
});

updateSoundButton();
loadScores();
