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
      const hash = await crypto.subtle.digest("SHA-256", data);

      // Use the first 32 bytes of the hash as the key
      encryptionKey = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(hash),
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
    } catch (error) {
      console.warn("Failed to initialize encryption. Falling back to plaintext storage.", error);
      encryptionKey = null;
    }
  }
}

async function encryptKey(key) {
  await initializeEncryption();
  if (!encryptionKey) return btoa(key); // fallback

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    encoder.encode(key)
  );

  // Store IV + ciphertext (base64)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptKey(encoded) {
  await initializeEncryption();
  if (!encryptionKey) return atob(encoded); // fallback

  try {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  } catch (e) {
    console.warn("Failed to decrypt key; returning as-is.", e);
    try { return atob(encoded); } catch { return ""; }
  }
}

async function storeApiKey(key, persistent = false) {
  const encrypted = await encryptKey(key);
  if (persistent) {
    localStorage.setItem("openai_api_key", encrypted);
    localStorage.setItem("use_persistent_storage", "true");
  } else {
    sessionStorage.setItem("openai_api_key", encrypted);
    localStorage.setItem("use_persistent_storage", "false");
  }
}

async function getStoredApiKey() {
  const persistent = localStorage.getItem("use_persistent_storage") === "true";
  const cipher = persistent
    ? localStorage.getItem("openai_api_key")
    : sessionStorage.getItem("openai_api_key");
  if (!cipher) return null;
  return await decryptKey(cipher);
}

function removeStoredApiKey() {
  localStorage.removeItem("openai_api_key");
  sessionStorage.removeItem("openai_api_key");
}

// === Helper: Build ASCII board of current position ===
function getASCIIBoard(fen) {
  const game = new Chess(fen);
  const board = game.board();

  let ascii = "  a b c d e f g h\n";
  for (let i = 0; i < 8; i++) {
    ascii += `${8 - i} `;
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece) {
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

// === Model Pricing (USD per 1M tokens) ===
// Sources: Official OpenAI pricing pages.
// GPT-5 family: https://openai.com/api/pricing/ and https://openai.com/gpt-5
// GPT-4o: https://platform.openai.com/docs/models/gpt-4o
// GPT-4o mini (text): https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/
const MODEL_PRICING = {
  "gpt-5":        { inputPerM: 1.25, outputPerM: 10.0, source: "https://openai.com/api/pricing/" },
  "gpt-5-mini":   { inputPerM: 0.25, outputPerM: 2.0,  source: "https://openai.com/api/pricing/" },
  "gpt-5-nano":   { inputPerM: 0.05, outputPerM: 0.4,  source: "https://openai.com/api/pricing/" },
  "gpt-4o":       { inputPerM: 2.50, outputPerM: 10.0, source: "https://platform.openai.com/docs/models/gpt-4o" },
  "gpt-4o-mini":  { inputPerM: 0.15, outputPerM: 0.60, source: "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/" },
};

function getPricingForModel(model) {
  return MODEL_PRICING[model] || null;
}

function prettyUSD(n) {
  return `$${(n).toFixed(6)}`;
}

function estimateTokensFromText(t) {
  // Heuristic fallback if API doesn't return usage: ~4 chars per token
  if (!t) return 0;
  return Math.max(1, Math.ceil(t.length / 4));
}

window.chessCostTracker = window.chessCostTracker || {
  totalUSD: 0,
  last: { in: 0, out: 0, cost: 0 }
};

function computeMoveCostUSD(model, promptTokens, completionTokens) {
  const p = getPricingForModel(model);
  if (!p) return 0;
  const inUSD  = (promptTokens     / 1_000_000) * p.inputPerM;
  const outUSD = (completionTokens / 1_000_000) * p.outputPerM;
  return inUSD + outUSD;
}

function updatePricingUIForModel(model) {
  const p = getPricingForModel(model);
  const el = document.getElementById("pricingInfo");
  const srcEl = document.getElementById("pricingSource");
  if (el && p) {
    el.textContent = `Input ${p.inputPerM}/1M • Output ${p.outputPerM}/1M`;
    if (srcEl) srcEl.textContent = p.source;
  } else if (el) {
    el.textContent = "Pricing unknown for this model";
    if (srcEl) srcEl.textContent = "";
  }
}

function updateHud() {
  const hud = document.getElementById("costHud");
  const moveInfo = document.getElementById("moveCostInfo");
  if (!hud && !moveInfo) return;
  const last = window.chessCostTracker.last;
  const total = window.chessCostTracker.totalUSD;
  const lastStr = `Last move: ${last.in} in / ${last.out} out → ${prettyUSD(last.cost)}`;
  const totalStr = ` | Total: ${prettyUSD(total)}`;
  if (hud) hud.textContent = lastStr + totalStr;
  if (moveInfo) moveInfo.textContent = `${lastStr} | Game total: ${prettyUSD(total)}`;
}

function recordMoveUsage(model, promptTokens, completionTokens) {
  const cost = computeMoveCostUSD(model, promptTokens, completionTokens);
  window.chessCostTracker.last = { in: promptTokens, out: completionTokens, cost };
  window.chessCostTracker.totalUSD += cost;
  updateHud();
}

// Initialize UI bindings once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Model select -> pricing display
  const modelSel = document.getElementById("modelSelect");
  if (modelSel) {
    // Initialize from existing value or localStorage
    const current = (localStorage.getItem("openai_model") || modelSel.value || "gpt-5");
    updatePricingUIForModel(current);
    modelSel.addEventListener("change", () => {
      const m = modelSel.value;
      updatePricingUIForModel(m);
      // Save immediately so PGN and next call use it
      try { localStorage.setItem("openai_model", m); } catch {}
    });
  }
  // HUD toggle
  const hudToggle = document.getElementById("showHudToggle");
  const hud = document.getElementById("costHud");
  if (hudToggle && hud) {
    const saved = localStorage.getItem("show_cost_hud") === "true";
    hudToggle.checked = saved;
    hud.classList.toggle("hidden", !saved);
    hudToggle.addEventListener("change", () => {
      const on = hudToggle.checked;
      try { localStorage.setItem("show_cost_hud", on ? "true" : "false"); } catch {}
      hud.classList.toggle("hidden", !on);
    });
  }
});

function getGameStatePrompt(fen) {
  const game = new Chess(fen);
  const asciiBoard = getASCIIBoard(fen);

  const toPlay = game.turn() === "w" ? "White" : "Black";
  const material = getMaterialBalance(game);

  let prompt = `You are a strong chess engine. Return ONLY the best move for Black in SAN format (like "Nf6" or "Qxd4+").\n\n`;
  prompt += `Position (FEN): ${fen}\n\n`;
  prompt += `Board:\n${asciiBoard}\n`;
  prompt += `Side to move: ${toPlay}\n`;
  prompt += `Material balance: ${material}\n\n`;
  prompt += `Rules:\n`;
  prompt += `1. Return only one legal move for Black in SAN.\n`;
  prompt += `2. Do not add commentary or any extra text.\n`;
  prompt += `3. Prefer solid, engine-like play.\n`;

  return prompt;
}

function getMaterialBalance(game) {
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let whiteScore = 0;
  let blackScore = 0;

  const board = game.board();
  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        const val = pieceValues[piece.type] || 0;
        if (piece.color === "w") whiteScore += val;
        else blackScore += val;
      }
    }
  }
  const diff = whiteScore - blackScore;
  if (diff === 0) return "Equal";
  if (diff > 0) return `White up ${diff}`;
  return `Black up ${Math.abs(diff)}`;
}

function getRetryPrompt(fen, previousIllegalMove) {
  const game = new Chess(fen);
  const asciiBoard = getASCIIBoard(fen);

  let prompt = `Your previous move "${previousIllegalMove}" was illegal.\n`;
  prompt += `Position (FEN): ${fen}\n\n`;
  prompt += `Board:\n${asciiBoard}\n`;
  prompt += `Please return ONLY a new legal move in SAN.\n`;
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

  const model = localStorage.getItem("openai_model") || "gpt-5";
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
    const chatRequestBody = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 30,
    };

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
      try {
        const usage = data.usage || {};
        const pt = usage.prompt_tokens ?? estimateTokensFromText(systemPrompt + "\n\n" + userPrompt);
        const ct = usage.completion_tokens ?? estimateTokensFromText(data.choices?.[0]?.message?.content || "");
        recordMoveUsage(model, pt, ct);
      } catch (e) { /* no-op */ }
      return data.choices[0].message.content.trim();
    }

    // If model isn't a chat model, fall back to text completions
    // Detect based on specific error message or code
    if (
      data.error &&
      (data.error.type === "invalid_request_error" ||
        /not supported in the v1\/chat\/completions endpoint/i.test(
          data.error.message || ""
        ))
    ) {
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

      if (data.error) {
        if (data.error.code === "invalid_api_key") {
          throw new Error(
            "Invalid API key. Please check your key and try again."
          );
        }
        throw new Error(data.error.message || "OpenAI API error");
      }

      try {
        const usage = data.usage || {};
        const pt = usage.prompt_tokens ?? estimateTokensFromText(fullPrompt);
        const ct = usage.completion_tokens ?? estimateTokensFromText(data.choices?.[0]?.text || "");
        recordMoveUsage(model, pt, ct);
      } catch (e) { /* no-op */ }
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
