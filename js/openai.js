// API Key Management with Encryption
let encryptionKey = null;

// Initialize encryption key with performance optimization
async function initializeEncryption() {
  if (!encryptionKey) {
    try {
      // Generate a unique encryption key based on user's browser fingerprint
      const userAgent = navigator.userAgent;
      const screenRes = `${screen.width}x${screen.height}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fingerprint = `${userAgent}-${screenRes}-${timezone}`;

      // Create a deterministic key from the fingerprint
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprint);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      encryptionKey = hashArray.slice(0, 32); // Use first 32 bytes for AES-256
    } catch (error) {
      console.error("Failed to initialize encryption:", error);
      throw error;
    }
  }
  return encryptionKey;
}

// Encrypt API key
async function encryptApiKey(apiKey) {
  const key = await initializeEncryption();
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import key for encryption
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(key),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Encrypt the API key
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

// Decrypt API key
async function decryptApiKey(encryptedApiKey) {
  try {
    const key = await initializeEncryption();
    const combined = new Uint8Array(
      atob(encryptedApiKey)
        .split("")
        .map((char) => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Import key for decryption
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(key),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Decrypt the API key
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    return null;
  }
}

// Session-based storage for additional security
function getSessionStorage() {
  return window.sessionStorage;
}

function getLocalStorage() {
  return window.localStorage;
}

// Check if user wants persistent storage
function shouldUsePersistentStorage() {
  return getLocalStorage().getItem("use_persistent_storage") === "true";
}

function getStoredApiKey() {
  const storage = shouldUsePersistentStorage()
    ? getLocalStorage()
    : getSessionStorage();
  const encryptedKey = storage.getItem("openai_api_key_encrypted");
  if (!encryptedKey) return null;

  // Return a promise that resolves to the decrypted key
  return decryptApiKey(encryptedKey);
}

async function setStoredApiKey(key) {
  // Validate API key format before storing
  if (!isValidApiKey(key)) {
    throw new Error("Invalid API key format");
  }

  // Encrypt the API key before storing
  const encryptedKey = await encryptApiKey(key);
  const storage = shouldUsePersistentStorage()
    ? getLocalStorage()
    : getSessionStorage();
  storage.setItem("openai_api_key_encrypted", encryptedKey);
}

function removeStoredApiKey() {
  getLocalStorage().removeItem("openai_api_key_encrypted");
  getSessionStorage().removeItem("openai_api_key_encrypted");
}

// API Key validation
function isValidApiKey(key) {
  if (!key || typeof key !== "string") return false;

  const trimmedKey = key.trim();

  // Support multiple OpenAI API key formats:
  // 1. Legacy format: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  // 2. New format: sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  // 3. Organization format: sk-org-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  const openaiKeyPatterns = [
    /^sk-[a-zA-Z0-9]{48}$/, // Legacy format (51 chars total)
    /^sk-proj-[a-zA-Z0-9_-]{48,}$/, // New project format (longer, includes underscores)
    /^sk-org-[a-zA-Z0-9_-]{48,}$/, // Organization format (longer, includes underscores)
  ];

  return openaiKeyPatterns.some((pattern) => pattern.test(trimmedKey));
}

// Sanitize API key input - only remove whitespace and invalid characters
function sanitizeApiKey(key) {
  if (!key) return "";
  // Only remove whitespace and truly invalid characters, keep all valid API key characters
  return key.trim().replace(/[^a-zA-Z0-9\-_]/g, "");
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
  const apiKey = await getStoredApiKey();
  if (!apiKey) {
    throw new Error(
      "No API key found. Please add your OpenAI API key to play."
    );
  }

  const model = localStorage.getItem("openai_model") || "gpt-4";
  const systemPrompt = customPrompt || getGameStatePrompt(fen);
  const userPrompt = `Make your move as Black.`;

  // Log the prompts
  console.log("=== AI Move Prompt ===");
  console.log("System Prompt:", systemPrompt);
  console.log("User Prompt:", userPrompt);
  console.log("Model:", model);
  console.log("====================");

  try {
    let response;
    let data;

    // Try chat completions first for all models
    console.log("Trying chat completions endpoint first...");

    // Prepare request body based on model-specific requirements
    const chatRequestBody = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    // Handle temperature based on model requirements
    if (model === "o3") {
      // O3 only supports default temperature (1), so don't specify it
    } else if (model === "o4-mini") {
      // O4-mini only supports default temperature (1), so don't specify it
    } else if (model === "o3-mini") {
      // O3-mini doesn't support temperature at all
    } else {
      // For other chat models, use temperature 0.2
      chatRequestBody.temperature = 0.2;
    }

    console.log("Chat completions request body:", chatRequestBody);

    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(chatRequestBody),
    });

    data = await response.json();

    // If chat completions works, return the result
    if (!data.error) {
      return data.choices[0].message.content.trim();
    }

    // If we get a "not a chat model" error, try completions endpoint
    if (
      data.error &&
      data.error.message &&
      data.error.message.includes("not a chat model")
    ) {
      console.log("Chat model failed, trying completions endpoint...");

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Prepare request body based on model-specific requirements
      const completionRequestBody = {
        model: model,
        prompt: fullPrompt,
        max_tokens: 50,
      };

      // Handle temperature based on model requirements
      if (model === "o3") {
        // O3 only supports default temperature (1), so don't specify it
      } else if (model === "o4-mini") {
        // O4-mini only supports default temperature (1), so don't specify it
      } else if (model === "o3-mini") {
        // O3-mini doesn't support temperature at all
      } else {
        // For other completion models (like o3-pro), use temperature 0.2
        completionRequestBody.temperature = 0.2;
      }

      console.log("Completions request body:", completionRequestBody);

      response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(completionRequestBody),
      });

      data = await response.json();

      // Check for API key errors
      if (data.error) {
        if (data.error.code === "invalid_api_key") {
          throw new Error(
            "Invalid API key. Please check your key and try again."
          );
        }
        throw new Error(data.error.message || "OpenAI API error");
      }

      return data.choices[0].text.trim();
    }

    // If we get here, there was an error with chat completions that wasn't about model type
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
