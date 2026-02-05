const game = new Chess();
let userPlayingForAI = false;

// Pre-move and planning variables
let premoves = [];
let isPlanningMode = false;
let planningArrows = [];
let planningHighlights = [];
let planningCaptures = [];
let isDrawingArrow = false;
let arrowStart = null;
let arrowEnd = null;

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
const premoveSound = new Audio("sound/premove.mp3");

// Sound playing functions
function playSound(audio) {
  audio.currentTime = 0; // Reset to beginning
  audio.play().catch(() => {});
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

function playPremoveSound() {
  playSound(premoveSound);
}

// Pre-move and planning functions
function addPremove(from, to) {
  // Only allow pre-moves when it's not the player's turn
  if (game.turn() === "w" && !userPlayingForAI) {
    return false;
  }

  // Check if the move is valid
  const tempGame = new Chess(game.fen());
  const move = tempGame.move({ from, to, promotion: "q" });

  if (!move) {
    playIllegalSound();
    return false;
  }

  // Add to pre-moves array
  premoves.push({ from, to, promotion: "q" });
  playPremoveSound();

  // Highlight the pre-move squares
  highlightPremoveSquares(from, to);

  return true;
}

function executePremove() {
  if (premoves.length === 0) return false;

  // Try to execute the first pre-move
  const premove = premoves[0];
  const move = game.move(premove);

  if (move) {
    // Remove the executed pre-move
    premoves.shift();
    clearPremoveHighlights();

    // Play sound based on move type
    if (move.captured) {
      playCaptureSound();
    } else if (move.flags && move.flags.includes("k")) {
      playCastleSound();
    } else if (move.promotion) {
      playPromoteSound();
    } else {
      playMoveSound(true);
    }

    board.position(game.fen());
    updateStatus();

    // If there are more pre-moves and it's still the player's turn, execute them
    if (premoves.length > 0 && game.turn() === "w" && !userPlayingForAI) {
      setTimeout(executePremove, 100);
    } else {
      // Clear all pre-moves if any failed or it's AI's turn
      if (premoves.length > 0) {
        premoves = [];
        clearPremoveHighlights();
      }

      // Make AI move if it's AI's turn
      if (game.turn() === "b" && !userPlayingForAI) {
        window.setTimeout(makeAIMove, 250);
      }
    }

    return true;
  } else {
    // Pre-move is no longer valid, clear all pre-moves
    premoves = [];
    clearPremoveHighlights();
    playIllegalSound();
    return false;
  }
}

function clearPremoveHighlights() {
  // Remove pre-move highlight elements
  const highlights = document.querySelectorAll(".premove-highlight");
  highlights.forEach((el) => el.remove());
}

function highlightPremoveSquares(from, to) {
  clearPremoveHighlights();

  const boardElement = document.getElementById("board");
  const squares = boardElement.querySelectorAll(".square-55d63");

  // Find the squares and add highlights
  squares.forEach((square) => {
    if (square.dataset.square === from || square.dataset.square === to) {
      const highlight = document.createElement("div");
      highlight.className = "premove-highlight";
      highlight.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 0, 0, 0.3);
        pointer-events: none;
        z-index: 10;
      `;
      square.style.position = "relative";
      square.appendChild(highlight);
    }
  });
}

function clearPlanning() {
  // Remove all planning elements
  const planningElements = document.querySelectorAll(
    ".planning-arrow, .planning-highlight, .planning-capture"
  );
  planningElements.forEach((el) => el.remove());
  planningArrows = [];
  planningHighlights = [];
  planningCaptures = [];
}

function addPlanningArrow(from, to) {
  const boardElement = document.getElementById("board");
  const fromSquare = boardElement.querySelector(`[data-square="${from}"]`);
  const toSquare = boardElement.querySelector(`[data-square="${to}"]`);

  if (!fromSquare || !toSquare) return;

  const arrow = document.createElement("div");
  arrow.className = "planning-arrow";
  arrow.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 20;
  `;

  // Calculate arrow position and rotation
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const boardRect = boardElement.getBoundingClientRect();

  const fromCenter = {
    x: fromRect.left + fromRect.width / 2 - boardRect.left,
    y: fromRect.top + fromRect.height / 2 - boardRect.top,
  };

  const toCenter = {
    x: toRect.left + toRect.width / 2 - boardRect.left,
    y: toRect.top + toRect.height / 2 - boardRect.top,
  };

  const angle = Math.atan2(
    toCenter.y - fromCenter.y,
    toCenter.x - fromCenter.x
  );
  const distance = Math.sqrt(
    Math.pow(toCenter.x - fromCenter.x, 2) +
      Math.pow(toCenter.y - fromCenter.y, 2)
  );

  arrow.style.left = `${fromCenter.x}px`;
  arrow.style.top = `${fromCenter.y}px`;
  arrow.style.width = `${distance}px`;
  arrow.style.height = "3px";
  arrow.style.background =
    "linear-gradient(to right, rgba(255, 255, 0, 0.8), rgba(255, 255, 0, 0.4))";
  arrow.style.transform = `rotate(${angle}rad)`;
  arrow.style.transformOrigin = "0 50%";

  boardElement.appendChild(arrow);
  planningArrows.push({ from, to, element: arrow });
}

function addPlanningHighlight(square) {
  const boardElement = document.getElementById("board");
  const squareElement = boardElement.querySelector(`[data-square="${square}"]`);

  if (!squareElement) return;

  const highlight = document.createElement("div");
  highlight.className = "planning-highlight";
  highlight.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 0, 0.3);
    pointer-events: none;
    z-index: 15;
  `;

  squareElement.style.position = "relative";
  squareElement.appendChild(highlight);
  planningHighlights.push({ square, element: highlight });
}

function addPlanningCapture(square) {
  const boardElement = document.getElementById("board");
  const squareElement = boardElement.querySelector(`[data-square="${square}"]`);

  if (!squareElement) return;

  const capture = document.createElement("div");
  capture.className = "planning-capture";
  capture.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80%;
    height: 80%;
    border: 3px solid rgba(255, 0, 0, 0.8);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 15;
  `;

  squareElement.style.position = "relative";
  squareElement.appendChild(capture);
  planningCaptures.push({ square, element: capture });
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
  const savedModel = localStorage.getItem("openai_model") || "gpt-5-nano";
  const usePersistentStorage =
    localStorage.getItem("use_persistent_storage") === "true";
  modelSelect.value = savedModel;
  // If the saved model isn't in the dropdown, fall back to default
  if (!modelSelect.value || modelSelect.selectedIndex === -1) {
    modelSelect.value = "gpt-5-nano";
    localStorage.setItem("openai_model", "gpt-5-nano");
  }
  persistentStorageCheckbox.checked = usePersistentStorage;

  // Load illegal move behavior preference
  const savedIllegalBehavior = localStorage.getItem("illegal_move_behavior") || "user_play";
  const illegalRadio = document.querySelector(`input[name="illegalMoveBehavior"][value="${savedIllegalBehavior}"]`);
  if (illegalRadio) illegalRadio.checked = true;

  // Save illegal move behavior when changed
  document.querySelectorAll('input[name="illegalMoveBehavior"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      localStorage.setItem("illegal_move_behavior", e.target.value);
    });
  });

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
    modelSelect.value = "gpt-5-nano";
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

  // Check if it's a pre-move (not player's turn)
  if (game.turn() === "b" && !userPlayingForAI) {
    return addPremove(source, target) ? "snapback" : "snapback";
  }

  const move = game.move({ from: source, to: target, promotion: "q" });

  if (!move) {
    playIllegalSound();
    return "snapback";
  }

  // Clear any existing pre-moves since we made a real move
  if (premoves.length > 0) {
    premoves = [];
    clearPremoveHighlights();
  }

  // Clear planning when a move is made
  clearPlanningOnGameChange();

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
      const winModel = localStorage.getItem("openai_model") || "gpt-5-nano";
      const winDisplayName = getModelDisplayName(winModel);
      statusEl.textContent = game.turn() === "w" ? `${winDisplayName} Wins!` : "You Win!";
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

// Handle AI illegal move based on user preference
function handleIllegalMoveFallback(aiMove, statusEl) {
  const behavior = localStorage.getItem("illegal_move_behavior") || "user_play";

  if (behavior === "force_move") {
    statusEl.textContent = "AI made an illegal move. Forcing it on the board...";
    const forced = forceIllegalMove(aiMove);
    if (forced) {
      playMoveSound(false);
      board.position(game.fen());
      updateStatus();
      return true;
    }
    // Could not parse the move — fall through to user_play
  }

  if (behavior === "random_legal") {
    const legalMoves = game.moves();
    if (legalMoves.length > 0) {
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      const result = game.move(randomMove);
      if (result) {
        statusEl.textContent = `AI failed. Playing random legal move: ${randomMove}`;
        if (result.captured) {
          playCaptureSound();
        } else {
          playMoveSound(false);
        }
        board.position(game.fen());
        updateStatus();
        return true;
      }
    }
  }

  // Default: "user_play"
  userPlayingForAI = true;
  statusEl.textContent = "AI made an illegal move. Please make a move for Black.";
  return false;
}

// Attempt to force an illegal move onto the board by manipulating pieces directly
function forceIllegalMove(moveStr) {
  try {
    // Try coordinate notation first (e.g., "e7e5", "a2a4")
    const coordMatch = moveStr.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
    let from, to;

    if (coordMatch) {
      from = coordMatch[1];
      to = coordMatch[2];
    } else {
      // Try to extract squares from the string
      const squares = moveStr.match(/[a-h][1-8]/g);
      if (squares && squares.length >= 2) {
        from = squares[0];
        to = squares[1];
      } else {
        // Single-square SAN (e.g., "Nf6") — can't determine source without chess.js
        return false;
      }
    }

    // Get the piece at the source square
    const piece = game.get(from);
    if (!piece) return false;

    // Move the piece: remove from source, clear target, place at target
    game.remove(to);
    game.remove(from);
    game.put(piece, to);

    // Toggle the side to move via FEN manipulation
    const fen = game.fen();
    const fenParts = fen.split(' ');
    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
    fenParts[4] = String(parseInt(fenParts[4]) + 1); // half-move clock
    if (fenParts[1] === 'w') {
      fenParts[5] = String(parseInt(fenParts[5]) + 1); // full-move number
    }
    fenParts[3] = '-'; // clear en passant
    game.load(fenParts.join(' '));

    return true;
  } catch (e) {
    console.error("Failed to force illegal move:", e);
    return false;
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
        handleIllegalMoveFallback(aiMove, statusEl);
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
        // AI failed twice — use the configured fallback behavior
        handleIllegalMoveFallback(retryMove, statusEl);
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

    // Clear planning when AI moves
    clearPlanningOnGameChange();

    // Execute pre-moves if any exist
    if (premoves.length > 0 && game.turn() === "w" && !userPlayingForAI) {
      setTimeout(executePremove, 100);
    }
  } catch (error) {
    const statusEl = document.getElementById("status");
    if (error.message.includes("API key")) {
      statusEl.textContent = error.message;
      const apiKeyModal = document.getElementById("apiKeyModal");
      if (apiKeyModal) apiKeyModal.style.display = "block";
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

// Prevent default context menu on the entire board and all children
const boardElement = document.getElementById("board");
boardElement.addEventListener(
  "contextmenu",
  function (e) {
    e.preventDefault();
    return false;
  },
  true
); // Use capture phase to catch all

// Add right-click planning functionality
boardElement.addEventListener("mousedown", function (e) {
  if (e.button === 2) {
    e.preventDefault();

    const square = e.target.closest(".square-55d63");
    if (!square) return;
    const squareName = square.dataset.square;
    if (!squareName) return;
    const piece = square.querySelector("img");

    if (piece) {
      // Right-click on a piece - start drawing arrow
      if (!isDrawingArrow) {
        isDrawingArrow = true;
        arrowStart = squareName;
        square.classList.add("drawing-arrow");
      } else {
        // Complete the arrow
        if (arrowStart !== squareName) {
          togglePlanningArrow(arrowStart, squareName);
        }
        isDrawingArrow = false;
        arrowStart = null;
        // Remove drawing feedback from all squares
        document
          .querySelectorAll(".square-55d63.drawing-arrow")
          .forEach((sq) => {
            sq.classList.remove("drawing-arrow");
          });
      }
    } else {
      // Right-click on empty square - toggle highlight
      togglePlanningHighlight(squareName);
    }
    // Also toggle capture circle if clicking on an occupied square
    if (piece) {
      togglePlanningCapture(squareName);
    }
  }
});

// Handle mouse move for arrow drawing
document.getElementById("board").addEventListener("mousemove", function (e) {
  if (isDrawingArrow && arrowStart) {
    // Update arrow preview (optional - could add visual feedback)
  }
});

// Clear planning on left click (except for dragging)
document.getElementById("board").addEventListener("click", function (e) {
  if (e.button === 0 && !e.target.closest(".square-55d63 img")) {
    // Left click on board (not on a piece) - clear planning
    clearPlanning();
    isDrawingArrow = false;
    arrowStart = null;
  }
});

// Clear planning when game state changes
function clearPlanningOnGameChange() {
  clearPlanning();
  isDrawingArrow = false;
  arrowStart = null;
  // Remove drawing feedback from all squares
  document.querySelectorAll(".square-55d63.drawing-arrow").forEach((sq) => {
    sq.classList.remove("drawing-arrow");
  });
}

// Add keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    // Clear planning and cancel arrow drawing
    clearPlanning();
    isDrawingArrow = false;
    arrowStart = null;
    // Remove drawing feedback from all squares
    document.querySelectorAll(".square-55d63.drawing-arrow").forEach((sq) => {
      sq.classList.remove("drawing-arrow");
    });
  }
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

  // Clear pre-moves and planning
  premoves = [];
  clearPremoveHighlights();
  clearPlanning();
  isDrawingArrow = false;
  arrowStart = null;

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

// Add event listeners for the new buttons
document.getElementById("restartBtn").addEventListener("click", restartGame);
document.getElementById("undoBtn").addEventListener("click", undoLastMove);
document.getElementById("flipBtn").addEventListener("click", flipBoard);
document.getElementById("exportBtn").addEventListener("click", exportGame);

// Add these functions after the existing code
function generatePGN() {
  const model = localStorage.getItem("openai_model") || "gpt-5-nano";
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
    "gpt-5": "GPT-5",
    "gpt-5-mini": "GPT-5 Mini",
    "gpt-5-nano": "GPT-5 Nano",
    "gpt-4.1": "GPT-4.1",
    "gpt-4.1-mini": "GPT-4.1 Mini",
    "gpt-4.1-nano": "GPT-4.1 Nano",
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "o4-mini": "o4-mini",
    "o3-2025-04-16": "O3",
    "gpt-4-0125-preview": "GPT-4.5",
    "gpt-4-1106-preview": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "o4-mini-2025-04-16": "O4-Mini",
    "o3-mini-2025-01-31": "O3-Mini",
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

// --- Planning Overlay Setup ---
function ensurePlanningOverlay() {
  let overlay = document.getElementById("planning-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "planning-overlay";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "30";
    document.getElementById("board").appendChild(overlay);
  }
  return overlay;
}

function getBoardRect() {
  return document.getElementById("board").getBoundingClientRect();
}

function redrawPlanning() {
  // Remove all overlays
  const overlay = ensurePlanningOverlay();
  overlay.innerHTML = "";

  // Draw arrows
  planningArrows.forEach(({ from, to }) => {
    drawArrow(from, to, overlay);
  });

  // Draw highlights
  planningHighlights.forEach((square) => {
    drawHighlight(square);
  });

  // Draw captures
  planningCaptures.forEach((square) => {
    drawCapture(square);
  });
}

function drawArrow(from, to, overlay) {
  const board = document.getElementById("board");
  const fromSquare = board.querySelector(`[data-square="${from}"]`);
  const toSquare = board.querySelector(`[data-square="${to}"]`);
  if (!fromSquare || !toSquare) return;
  const boardRect = getBoardRect();
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const fromCenter = {
    x: fromRect.left + fromRect.width / 2 - boardRect.left,
    y: fromRect.top + fromRect.height / 2 - boardRect.top,
  };
  const toCenter = {
    x: toRect.left + toRect.width / 2 - boardRect.left,
    y: toRect.top + toRect.height / 2 - boardRect.top,
  };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 10) return; // Don't draw tiny arrows

  // Arrow style
  const color = "#FFA500"; // bright orange
  const thickness = 10;
  const headLength = 28;
  const headWidth = 22;

  // Shorten the line so the arrowhead doesn't overlap the target square
  const shorten = headLength * 0.7;
  const tx = toCenter.x - (dx / length) * shorten;
  const ty = toCenter.y - (dy / length) * shorten;

  // SVG container
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "planning-arrow");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.overflow = "visible";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "30";

  // Draw the line
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", fromCenter.x);
  line.setAttribute("y1", fromCenter.y);
  line.setAttribute("x2", tx);
  line.setAttribute("y2", ty);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", thickness);
  line.setAttribute("stroke-linecap", "round");
  svg.appendChild(line);

  // Draw the arrowhead
  const angle = Math.atan2(dy, dx);
  const arrowTip = { x: toCenter.x, y: toCenter.y };
  const left = {
    x:
      arrowTip.x -
      headLength * Math.cos(angle) +
      (headWidth / 2) * Math.sin(angle),
    y:
      arrowTip.y -
      headLength * Math.sin(angle) -
      (headWidth / 2) * Math.cos(angle),
  };
  const right = {
    x:
      arrowTip.x -
      headLength * Math.cos(angle) -
      (headWidth / 2) * Math.sin(angle),
    y:
      arrowTip.y -
      headLength * Math.sin(angle) +
      (headWidth / 2) * Math.cos(angle),
  };
  const arrowHead = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  arrowHead.setAttribute(
    "points",
    `
    ${arrowTip.x},${arrowTip.y}
    ${left.x},${left.y}
    ${right.x},${right.y}
  `
  );
  arrowHead.setAttribute("fill", color);
  svg.appendChild(arrowHead);

  overlay.appendChild(svg);
}

function drawHighlight(square) {
  const board = document.getElementById("board");
  const squareElement = board.querySelector(`[data-square="${square}"]`);
  if (!squareElement) return;
  // Remove existing highlight
  const old = squareElement.querySelector(".planning-highlight");
  if (old) old.remove();
  const highlight = document.createElement("div");
  highlight.className = "planning-highlight";
  highlight.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 0, 0.3);
    pointer-events: none;
    z-index: 15;
  `;
  squareElement.style.position = "relative";
  squareElement.appendChild(highlight);
}

function drawCapture(square) {
  const board = document.getElementById("board");
  const squareElement = board.querySelector(`[data-square="${square}"]`);
  if (!squareElement) return;
  // Remove existing capture
  const old = squareElement.querySelector(".planning-capture");
  if (old) old.remove();
  const capture = document.createElement("div");
  capture.className = "planning-capture";
  capture.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80%;
    height: 80%;
    border: 3px solid rgba(255, 0, 0, 0.8);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 15;
  `;
  squareElement.style.position = "relative";
  squareElement.appendChild(capture);
}

function togglePlanningArrow(from, to) {
  const idx = planningArrows.findIndex((a) => a.from === from && a.to === to);
  if (idx !== -1) {
    planningArrows.splice(idx, 1);
  } else {
    planningArrows.push({ from, to });
  }
  redrawPlanning();
}

function togglePlanningHighlight(square) {
  const idx = planningHighlights.indexOf(square);
  if (idx !== -1) {
    planningHighlights.splice(idx, 1);
  } else {
    planningHighlights.push(square);
  }
  redrawPlanning();
}

function togglePlanningCapture(square) {
  const idx = planningCaptures.indexOf(square);
  if (idx !== -1) {
    planningCaptures.splice(idx, 1);
  } else {
    planningCaptures.push(square);
  }
  redrawPlanning();
}

function clearPlanning() {
  planningArrows = [];
  planningHighlights = [];
  planningCaptures = [];
  redrawPlanning();
}

// Redraw planning overlays after every move, resize, and board update
function afterBoardUpdate() {
  redrawPlanning();
}

// Patch into board update points
const origOnSnapEnd = onSnapEnd;
onSnapEnd = function () {
  if (origOnSnapEnd) origOnSnapEnd();
  afterBoardUpdate();
};

const origUpdateStatus = updateStatus;
updateStatus = function () {
  if (origUpdateStatus) origUpdateStatus();
  afterBoardUpdate();
};

window.addEventListener("resize", afterBoardUpdate);

document.addEventListener("DOMContentLoaded", afterBoardUpdate);
