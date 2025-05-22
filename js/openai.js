// API Key Management
function getStoredApiKey() {
  return localStorage.getItem("openai_api_key");
}

function setStoredApiKey(key) {
  localStorage.setItem("openai_api_key", key);
}

function removeStoredApiKey() {
  localStorage.removeItem("openai_api_key");
}

function getAsciiBoard(fen) {
  const game = new Chess(fen);
  const board = game.board();
  let ascii = "\n";

  // Add column labels
  ascii += "  a b c d e f g h\n";

  // Add board with row numbers (8 to 1)
  for (let i = 0; i < 8; i++) {
    ascii += `${8 - i} `;
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece === null) {
        ascii += ". ";
      } else {
        ascii +=
          piece.color === "w"
            ? piece.type.toUpperCase() + " "
            : piece.type + " ";
      }
    }
    ascii += `${8 - i}\n`;
  }

  // Add column labels again
  ascii += "  a b c d e f g h\n";
  return ascii;
}

function getGameStatePrompt(fen) {
  const game = new Chess(fen);
  const isCheck = game.in_check();
  const isCheckmate = game.in_checkmate();
  const isDraw = game.in_draw();
  const turn = game.turn() === "w" ? "White" : "Black";

  let prompt = `You are playing as Black in a chess game. The current FEN is: ${fen}\n\n`;
  prompt += `Current board position:\n${getAsciiBoard(fen)}\n`;

  if (isCheckmate) {
    prompt += `You are in checkmate. The game is over.\n`;
  } else if (isDraw) {
    prompt += `The game is a draw.\n`;
  } else if (isCheck) {
    prompt += `IMPORTANT: You are in check! You must make a move that gets you out of check.\n`;
  }

  prompt += `\nRules:\n`;
  prompt += `1. You are playing as Black (lowercase pieces)\n`;
  prompt += `2. You must make a legal move that follows chess rules\n`;
  prompt += `3. If you are in check, you must move to get out of check\n`;
  prompt += `4. You cannot move a piece that has been captured\n`;
  prompt += `5. Respond with ONLY the move in SAN format, nothing else\n`;
  prompt += `\nLegend: Uppercase = White pieces, lowercase = Black pieces\n`;
  prompt += `K=king, Q=queen, R=rook, B=bishop, N=knight, P=pawn, .=empty square\n`;

  return prompt;
}

function getRetryPrompt(fen, previousIllegalMove) {
  const game = new Chess(fen);
  const isCheck = game.in_check();

  let prompt = `You are playing as Black in a chess game. The current FEN is: ${fen}\n\n`;
  prompt += `Current board position:\n${getAsciiBoard(fen)}\n`;
  prompt += `IMPORTANT: Your previous move "${previousIllegalMove}" was illegal and must NOT be repeated.\n\n`;

  if (isCheck) {
    prompt += `CRITICAL: You are in check! You must make a legal move that gets you out of check.\n`;
  }

  prompt += `\nRules for retry:\n`;
  prompt += `1. You must choose a completely different move from "${previousIllegalMove}"\n`;
  prompt += `2. The move must be legal according to chess rules\n`;
  prompt += `3. If you are in check, the move must get you out of check\n`;
  prompt += `4. You cannot move a piece that has been captured\n`;
  prompt += `5. Respond with ONLY the new move in SAN format, nothing else\n`;
  prompt += `\nLegend: Uppercase = White pieces, lowercase = Black pieces\n`;
  prompt += `K=king, Q=queen, R=rook, B=bishop, N=knight, P=pawn, .=empty square\n`;

  return prompt;
}

async function getAIMove(fen, customPrompt = null) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error(
      "No API key found. Please add your OpenAI API key to play."
    );
  }

  const model = localStorage.getItem("openai_model") || "gpt-4";
  const systemPrompt = customPrompt || getGameStatePrompt(fen);
  const userPrompt = `Make your move as Black.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();

    // Check for API key errors
    if (data.error) {
      if (data.error.code === "invalid_api_key") {
        throw new Error(
          "Invalid API key. Please check your key and try again."
        );
      }
      throw new Error(data.error.message || "OpenAI API error");
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI API error:", err);
    throw err;
  }
}
