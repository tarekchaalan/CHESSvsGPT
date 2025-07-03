const game = new Chess();
let userPlayingForAI = false;

// Sound effects
const captureSound = new Audio("sound/capture.mp3");
const moveSelfSound = new Audio("sound/move-self.mp3");
const moveOpponentSound = new Audio("sound/move-opponent.mp3");
const moveCheckSound = new Audio("sound/move-check.mp3");
const castleSound = new Audio("sound/castle.mp3");
const promoteSound = new Audio("sound/promote.mp3");
const gameEndSound = new Audio("sound/game-end.mp3");
const gameStartSound = new Audio("sound/game-start.mp3");
const illegalSound = new Audio("sound/illegal.mp3");
const notifySound = new Audio("sound/notify.mp3");

// Sound playing functions
function playSound(audio) {
  audio.currentTime = 0; // Reset to beginning
  audio.play().catch((e) => console.log("Sound play failed:", e));
}

function playMoveSound(isPlayerMove = true) {
  playSound(isPlayerMove ? moveSelfSound : moveOpponentSound);
}

function playCaptureSound() {
  playSound(captureSound);
}

function playCheckSound() {
  playSound(moveCheckSound);
}

function playCastleSound() {
  playSound(castleSound);
}

function playPromoteSound() {
  playSound(promoteSound);
}

function playGameEndSound() {
  playSound(gameEndSound);
}

function playGameStartSound() {
  playSound(gameStartSound);
}

function playIllegalSound() {
  playSound(illegalSound);
}

function playNotifySound() {
  playSound(notifySound);
}

// API Key Modal Management
document.addEventListener("DOMContentLoaded", () => {
  // Don't play game start sound automatically - wait for user interaction
  // playGameStartSound();

  const modal = document.getElementById("apiKeyModal");
  const btn = document.getElementById("apiKeyBtn");
  const span = document.getElementsByClassName("close")[0];
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKey");
  const removeApiKeyBtn = document.getElementById("removeApiKey");
  const apiKeyStatus = document.getElementById("apiKeyStatus");
  const modelSelect = document.getElementById("modelSelect");
  const persistentStorageCheckbox =
    document.getElementById("persistentStorage");

  // Load saved preferences
  const savedModel = localStorage.getItem("openai_model") || "gpt-4";
  const usePersistentStorage =
    localStorage.getItem("use_persistent_storage") === "true";
  modelSelect.value = savedModel;
  persistentStorageCheckbox.checked = usePersistentStorage;

  // Load saved API key asynchronously with performance optimization
  const loadSavedApiKey = async () => {
    try {
      // Show loading state
      apiKeyStatus.textContent = "Loading saved API key...";
      apiKeyStatus.className = "status-text";

      const savedKey = await getStoredApiKey();
      if (savedKey) {
        apiKeyInput.value = savedKey;
        apiKeyStatus.textContent = "API key is saved";
        apiKeyStatus.className = "status-text success";
      } else {
        apiKeyStatus.textContent = "";
        apiKeyStatus.className = "status-text";
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
      apiKeyStatus.textContent = "Failed to load saved API key";
      apiKeyStatus.className = "status-text error";
    }
  };

  // Defer API key loading to avoid blocking the main thread
  setTimeout(loadSavedApiKey, 100);

  // Modal open/close handlers
  btn.addEventListener("click", () => {
    // Play game start sound on first user interaction
    if (!window.userHasInteracted) {
      playGameStartSound();
      window.userHasInteracted = true;
    }
    modal.style.display = "block";
  });

  span.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });

  // Save API key and model
  saveApiKeyBtn.addEventListener("click", async () => {
    const rawKey = apiKeyInput.value;
    const sanitizedKey = sanitizeApiKey(rawKey);
    const model = modelSelect.value;
    const usePersistentStorage = persistentStorageCheckbox.checked;

    try {
      if (sanitizedKey && isValidApiKey(sanitizedKey)) {
        // Save storage preference first
        localStorage.setItem(
          "use_persistent_storage",
          usePersistentStorage.toString()
        );

        await setStoredApiKey(sanitizedKey);
        localStorage.setItem("openai_model", model);
        apiKeyStatus.textContent = "API key and model saved successfully";
        apiKeyStatus.className = "status-text success";
        modal.style.display = "none";
      } else {
        apiKeyStatus.textContent =
          "Please enter a valid OpenAI API key (starts with 'sk-', 'sk-proj-', or 'sk-org-')";
        apiKeyStatus.className = "status-text error";
      }
    } catch (error) {
      apiKeyStatus.textContent = "Error saving API key: " + error.message;
      apiKeyStatus.className = "status-text error";
    }
  });

  // Remove API key and model
  removeApiKeyBtn.addEventListener("click", () => {
    removeStoredApiKey();
    localStorage.removeItem("openai_model");
    apiKeyInput.value = "";
    modelSelect.value = "gpt-4";
    apiKeyStatus.textContent = "API key and model removed";
  });
});

function onDragStart(source, piece) {
  if (game.game_over() || (!userPlayingForAI && piece.search(/^b/) !== -1))
    return false;
}

function onDrop(source, target) {
  // Play game start sound on first user interaction
  if (!window.userHasInteracted) {
    playGameStartSound();
    window.userHasInteracted = true;
  }

  const move = game.move({ from: source, to: target, promotion: "q" });

  if (!move) {
    playIllegalSound();
    return "snapback";
  }

  // Play sound based on move type
  if (move.captured) {
    playCaptureSound();
  } else if (move.flags && move.flags.includes("k")) {
    playCastleSound();
  } else if (move.promotion) {
    playPromoteSound();
  } else {
    playMoveSound(true); // Player move
  }

  if (userPlayingForAI) {
    userPlayingForAI = false;
    updateStatus();
    return;
  }

  updateStatus();
  window.setTimeout(makeAIMove, 250);
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  const statusEl = document.getElementById("status");
  if (game.game_over()) {
    if (game.in_checkmate()) {
      statusEl.textContent = game.turn() === "w" ? "GPT4 Wins!" : "You Win!";
      playGameEndSound(); // Play game end sound for checkmate
    } else if (game.in_draw()) {
      statusEl.textContent = "Draw!";
      playGameEndSound(); // Play game end sound for draw
    } else {
      statusEl.textContent = "Game over.";
      playGameEndSound(); // Play game end sound for other game over conditions
    }

    // Show export button when game ends
    showExportButton();
  } else {
    if (game.in_check()) {
      statusEl.textContent =
        (game.turn() === "w" ? "White" : "Black") + " to move. Check!";
      playNotifySound(); // Play notify sound for check
    } else {
      statusEl.textContent =
        (game.turn() === "w" ? "White" : "Black") + " to move.";
    }

    // Hide export button during game
    hideExportButton();
  }
}

async function makeAIMove() {
  try {
    const fen = game.fen();

    // Check if the game is over before making AI move
    if (game.game_over()) {
      updateStatus();
      return;
    }

    const aiMove = await getAIMove(fen);

    console.log("OpenAI's move:", aiMove);

    if (!aiMove) return;

    const move = game.move(aiMove, { sloppy: true });

    if (!move) {
      // Illegal move detected
      const statusEl = document.getElementById("status");
      statusEl.textContent = "AI made an illegal move. Retrying...";

      // Retry with a more specific prompt that includes the previous illegal move
      const retryMove = await getAIMove(fen, getRetryPrompt(fen, aiMove));
      console.log(`AI Made an Illegal Move (${aiMove}), trying again...`);
      console.log("OpenAI's retry move:", retryMove);

      if (!retryMove) return;

      // Check if the retry move is the same as the original illegal move
      if (retryMove === aiMove) {
        userPlayingForAI = true;
        statusEl.textContent =
          "AI repeated the same illegal move. Please make a move for Black.";
        return;
      }

      const retryResult = game.move(retryMove, { sloppy: true });
      if (retryResult) {
        // Play sound for AI retry move
        if (retryResult.captured) {
          playCaptureSound();
        } else if (retryResult.flags && retryResult.flags.includes("k")) {
          playCastleSound();
        } else if (retryResult.promotion) {
          playPromoteSound();
        } else {
          playMoveSound(false); // AI move
        }
        board.position(game.fen());
        updateStatus();
      } else {
        // AI failed twice, let user play for AI
        userPlayingForAI = true;
        statusEl.textContent =
          "AI made another illegal move. Please make a move for Black.";
      }
      return;
    }

    // Play sound for AI move
    if (move.captured) {
      playCaptureSound();
    } else if (move.flags && move.flags.includes("k")) {
      playCastleSound();
    } else if (move.promotion) {
      playPromoteSound();
    } else {
      playMoveSound(false); // AI move
    }

    board.position(game.fen());
    updateStatus();
  } catch (error) {
    const statusEl = document.getElementById("status");
    if (error.message.includes("API key")) {
      statusEl.textContent = error.message;
      modal.style.display = "block";
    } else {
      statusEl.textContent = "Error: " + error.message;
    }
  }
}

board = Chessboard("board", {
  draggable: true,
  position: "start",
  onDragStart,
  onDrop,
  onSnapEnd,
  pieceTheme: "img/chesspieces/{piece}.png",
});

// Force board to resize after initialization
window.addEventListener("resize", () => {
  const boardElement = document.getElementById("board");
  const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 600);
  boardElement.style.width = `${size}px`;
  boardElement.style.height = `${size}px`;
  board.resize();
});

// Initial resize
window.dispatchEvent(new Event("resize"));

updateStatus();

// Add these functions after the existing code
function restartGame() {
  game.reset();
  board.position("start");
  userPlayingForAI = false;
  playGameStartSound(); // Play game start sound
  updateStatus();
  hideExportButton(); // Hide export button when starting new game
}

function undoLastMove() {
  game.undo(); // Undo AI's move
  game.undo(); // Undo player's move
  board.position(game.fen());
  updateStatus();
}

function flipBoard() {
  board.flip();
}

// Add buttons after the board initialization
document.getElementById("apiKeyBtn").insertAdjacentHTML(
  "afterend",
  `<div class="button-group" style="margin-top: 10px;">
    <button id="restartBtn" class="btn">
      <img src="img/restart.svg" alt="Restart" />
      Restart Game
    </button>
    <button id="undoBtn" class="btn">
      <img src="img/undo.svg" alt="Undo" />
      Undo Move
    </button>
    <button id="flipBtn" class="btn">
      <img src="img/flip.svg" alt="Flip" />
      Flip Board
    </button>
    <button id="exportBtn" class="btn" style="display: none;">
      <img src="img/download.svg" alt="Export" />
      Export Game
    </button>
  </div>`
);

// Update the API Key button text
document.getElementById("apiKeyBtn").textContent = "Manage API Key";

// Add event listeners for the new buttons
document.getElementById("restartBtn").addEventListener("click", restartGame);
document.getElementById("undoBtn").addEventListener("click", undoLastMove);
document.getElementById("flipBtn").addEventListener("click", flipBoard);
document.getElementById("exportBtn").addEventListener("click", exportGame);

// Add these functions after the existing code
function generatePGN() {
  const model = localStorage.getItem("openai_model") || "gpt-4";
  const modelDisplayName = getModelDisplayName(model);
  const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  // Create a temporary game object to generate PGN with custom headers
  const tempGame = new Chess();

  // Copy the move history from the original game
  const history = game.history();
  for (const move of history) {
    tempGame.move(move);
  }

  // Set custom headers
  tempGame.header("Event", "Chess vs GPT Game");
  tempGame.header("Site", "https://chess-vs-gpt.vercel.app/");
  tempGame.header("Date", currentDate);
  tempGame.header("Round", "1");
  tempGame.header("White", "You");
  tempGame.header("Black", modelDisplayName);
  tempGame.header("WhiteElo", "?");
  tempGame.header("BlackElo", "?");
  tempGame.header("ECO", "?");

  // Determine result
  let result = "*"; // Ongoing game
  if (game.game_over()) {
    if (game.in_checkmate()) {
      result = game.turn() === "w" ? "0-1" : "1-0"; // Black wins if white's turn (white was checkmated)
    } else if (game.in_draw()) {
      result = "1/2-1/2";
    } else if (game.in_stalemate()) {
      result = "1/2-1/2";
    } else if (game.in_threefold_repetition()) {
      result = "1/2-1/2";
    } else if (game.insufficient_material()) {
      result = "1/2-1/2";
    } else {
      result = "*";
    }
  }
  tempGame.header("Result", result);

  return tempGame.pgn();
}

function getModelDisplayName(model) {
  const modelNames = {
    "gpt-4-0125-preview": "GPT-4.5",
    "gpt-4-1106-preview": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
  };
  return modelNames[model] || model;
}

function exportGame() {
  try {
    const pgn = generatePGN();

    if (!pgn || pgn.trim() === "") {
      throw new Error("Failed to generate PGN");
    }

    // Show export options modal
    showExportOptionsModal(pgn);
  } catch (error) {
    console.error("Export failed:", error);
    const statusEl = document.getElementById("status");
    const originalText = statusEl.textContent;
    statusEl.textContent = "Export failed. Please try again.";
    setTimeout(() => {
      statusEl.textContent = originalText;
    }, 3000);
  }
}

function showExportOptionsModal(pgn) {
  // Create modal HTML
  const modalHTML = `
    <div id="exportOptionsModal" class="modal">
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Export Game</h2>
        <div class="export-options">
          <div class="export-option">
            <button id="copyAndRedirectBtn" class="btn export-option-btn">
              <img src="img/download.svg" alt="Copy" />
              Copy PGN to clipboard & open ChessKit.org
            </button>
            <p class="export-description">When redirected, press "Load", paste the PGN, and press "ADD"</p>
          </div>
          <div class="export-option">
            <button id="downloadOnlyBtn" class="btn export-option-btn">
              <img src="img/download.svg" alt="Download" />
              Download PGN file only
            </button>
            <p class="export-description">Use this option to upload the PGN to a chess engine of your choice.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("exportOptionsModal");
  const closeBtn = modal.querySelector(".close");
  const copyBtn = document.getElementById("copyAndRedirectBtn");
  const downloadBtn = document.getElementById("downloadOnlyBtn");

  // Show modal
  modal.style.display = "block";

  // Close modal handlers
  closeBtn.addEventListener("click", () => {
    modal.remove();
  });

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });

  // Copy and redirect option
  copyBtn.addEventListener("click", () => {
    copyPGNToClipboard(pgn);
    modal.remove();
  });

  // Download only option
  downloadBtn.addEventListener("click", () => {
    downloadPGNFile(pgn);
    modal.remove();
  });
}

function copyPGNToClipboard(pgn) {
  navigator.clipboard
    .writeText(pgn)
    .then(() => {
      console.log("PGN copied to clipboard");
      // Show success message
      const statusEl = document.getElementById("status");
      const originalText = statusEl.textContent;
      statusEl.textContent = "PGN copied to clipboard! Opening ChessKit.org...";
      setTimeout(() => {
        statusEl.textContent = originalText;
      }, 3000);

      // Redirect to chesskit.org
      setTimeout(() => {
        window.open("https://chesskit.org/", "_blank");
      }, 500);
    })
    .catch((err) => {
      console.error("Failed to copy PGN to clipboard:", err);
      const statusEl = document.getElementById("status");
      const originalText = statusEl.textContent;
      statusEl.textContent = "Failed to copy to clipboard. Please try again.";
      setTimeout(() => {
        statusEl.textContent = originalText;
      }, 3000);
    });
}

function downloadPGNFile(pgn) {
  // Create and download PGN file
  const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chess-vs-gpt-${new Date().toISOString().split("T")[0]}.pgn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Show success message
  const statusEl = document.getElementById("status");
  const originalText = statusEl.textContent;
  statusEl.textContent = "PGN file downloaded successfully!";
  setTimeout(() => {
    statusEl.textContent = originalText;
  }, 3000);
}

function showExportButton() {
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn && game.history().length > 0) {
    exportBtn.style.display = "inline-flex";
  }
}

function hideExportButton() {
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.style.display = "none";
  }
}
