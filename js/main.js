// js/main.js

console.log("Chess is a", typeof Chess); // should be "function"

const game = new Chess();
let userPlayingForAI = false;

// API Key Modal Management
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("apiKeyModal");
  const btn = document.getElementById("apiKeyBtn");
  const span = document.getElementsByClassName("close")[0];
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKey");
  const removeApiKeyBtn = document.getElementById("removeApiKey");
  const apiKeyStatus = document.getElementById("apiKeyStatus");
  const modelSelect = document.getElementById("modelSelect");

  // Load saved API key and model if they exist
  const savedKey = getStoredApiKey();
  const savedModel = localStorage.getItem("openai_model") || "gpt-4";
  if (savedKey) {
    apiKeyInput.value = savedKey;
    apiKeyStatus.textContent = "API key is saved";
  }
  modelSelect.value = savedModel;

  // Modal open/close handlers
  btn.addEventListener("click", () => {
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
  saveApiKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    if (key) {
      setStoredApiKey(key);
      localStorage.setItem("openai_model", model);
      apiKeyStatus.textContent = "API key and model saved successfully";
      modal.style.display = "none";
    } else {
      apiKeyStatus.textContent = "Please enter a valid API key";
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
  const move = game.move({ from: source, to: target, promotion: "q" });

  if (!move) return "snapback";

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
    } else if (game.in_draw()) {
      statusEl.textContent = "Draw!";
    } else {
      statusEl.textContent = "Game over.";
    }
  } else {
    statusEl.textContent =
      (game.turn() === "w" ? "White" : "Black") + " to move.";
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
});

updateStatus();

// Add these functions after the existing code
function restartGame() {
  game.reset();
  board.position("start");
  userPlayingForAI = false;
  updateStatus();
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
  </div>`
);

// Update the API Key button text
document.getElementById("apiKeyBtn").textContent = "Manage API Key";

// Add event listeners for the new buttons
document.getElementById("restartBtn").addEventListener("click", restartGame);
document.getElementById("undoBtn").addEventListener("click", undoLastMove);
document.getElementById("flipBtn").addEventListener("click", flipBoard);
