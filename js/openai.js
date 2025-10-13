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

// === Compatibility helpers for modal ===
function sanitizeApiKey(k) {
  if (!k) return "";
  return String(k).trim().replace(/^["']+|["']+$/g, "");
}

function isValidApiKey(k) {
  if (!k) return false;
  const cleaned = sanitizeApiKey(k);
  // Accept sk-, sk-proj-, sk-org- and allow base64url-safe chars (A–Z a–z 0–9 _ -), len >= 16 after prefix
  const prefixRe = /^(sk|sk-proj|sk-org)-/;
  if (!prefixRe.test(cleaned)) return false;
  const rest = cleaned.replace(prefixRe, "");
  if (rest.length < 16) return false;
  return /^[A-Za-z0-9_-]+$/.test(rest);
}

async function setStoredApiKey(key) {
  const cleaned = sanitizeApiKey(key);
  if (!isValidApiKey(cleaned)) throw new Error("Invalid API key format");
  const persistent = localStorage.getItem("use_persistent_storage") === "true";
  await storeApiKey(cleaned, persistent);
  return true;
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
  // Try preferred location based on the "use_persistent_storage" flag
  const preferPersistent = localStorage.getItem("use_persistent_storage") === "true";

  const tryRead = async (storage, key) => {
    const val = storage.getItem(key);
    if (!val) return null;
    // Try decrypting; if decryption fails and it already looks like an API key, return as-is
    try {
      const dec = await decryptKey(val);
      if (dec && isValidApiKey(dec)) return dec;
      if (isValidApiKey(val)) return val;
      return dec;
    } catch (_) {
      if (isValidApiKey(val)) return val;
      return null;
    }
  };

  // 1) Preferred storage
  const primary = preferPersistent
    ? await tryRead(localStorage, "openai_api_key")
    : await tryRead(sessionStorage, "openai_api_key");
  if (primary) return primary;

  // 2) Fallback to the other storage
  const secondary = preferPersistent
    ? await tryRead(sessionStorage, "openai_api_key")
    : await tryRead(localStorage, "openai_api_key");
  if (secondary) return secondary;

  // 3) Legacy keys or plain storage fallbacks
  const legacyCandidates = [
    ["local", "apiKey"],
    ["local", "openai_api_key_plain"],
    ["session", "apiKey"],
    ["session", "openai_api_key_plain"]
  ];

  for (const [where, key] of legacyCandidates) {
    const storage = where === "local" ? localStorage : sessionStorage;
    const val = storage.getItem(key);
    if (val && isValidApiKey(val)) {
      await storeApiKey(val, preferPersistent);
      try { storage.removeItem(key); } catch {}
      return val;
    }
  }

  return null;
}

function removeStoredApiKey() {
  try { localStorage.removeItem("openai_api_key"); } catch {}
  try { sessionStorage.removeItem("openai_api_key"); } catch {}
  try { localStorage.removeItem("use_persistent_storage"); } catch {}
  // Legacy cleanups
  try { localStorage.removeItem("apiKey"); } catch {}
  try { sessionStorage.removeItem("apiKey"); } catch {}
  try { localStorage.removeItem("openai_api_key_plain"); } catch {}
  try { sessionStorage.removeItem("openai_api_key_plain"); } catch {}
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

  ascii += "  a b c d e f g h\n";
  return ascii;
}

// === Model Pricing (USD per 1M tokens) ===
// GPT-5 family & 4o family (values shown in modal)
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
  const modelSel = document.getElementById("modelSelect");
  if (modelSel) {
    const current = (localStorage.getItem("openai_model") || modelSel.value || "gpt-5");
    updatePricingUIForModel(current);
    modelSel.addEventListener("change", () => {
      const m = modelSel.value;
      updatePricingUIForModel(m);
      try { localStorage.setItem("openai_model", m); } catch {}
    });
  }
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

function buildPrompts(fen) {
  const game = new Chess(fen);
  const asciiBoard = getASCIIBoard(fen);
  const toPlay = game.turn() === "w" ? "White" : "Black";
  const material = getMaterialBalance(game);

  const systemPrompt = "Return the single best move for Black in SAN format (e.g., \"Nf6\", \"Qxd4+\"). Do not include any commentary or extra text.";

  let userPrompt = "";
  userPrompt += `Position (FEN): ${fen}\n\n`;
  userPrompt += `Board:\n${asciiBoard}\n`;
  userPrompt += `Side to move: ${toPlay}\n`;
  userPrompt += `Material balance: ${material}\n\n`;
  userPrompt += `Rules:\n`;
  userPrompt += `1. Return only one legal move for Black in SAN.\n`;
  userPrompt += `2. Do not add commentary or any extra text.\n`;
  userPrompt += `3. Prefer solid, engine-like moves.\n\n`;
  userPrompt += `Make your move as Black.`;

  return { systemPrompt, userPrompt };
}

// Extract plain text from a chat message, supporting both string and array content formats
function extractMessageText(message) {
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const grab = (p) => {
      if (!p) return "";
      if (typeof p === "string") return p;
      if (typeof p.text === "string") return p.text;
      if (Array.isArray(p.text)) return p.text.map(grab).join("");
      if (typeof p.content === "string") return p.content;
      if (Array.isArray(p.content)) return p.content.map(grab).join("");
      return "";
    };
    return content.map(grab).join("");
  }
  return "";
}

async function getAIMove(fen, customPrompt = null) {
  const apiKey = await getStoredApiKey();
  if (!apiKey) {
    throw new Error(
      "No API key found. Please add your OpenAI API key to play."
    );
  }

  const model = localStorage.getItem("openai_model") || "gpt-5";
  const prompts = buildPrompts(fen);
  const systemPrompt = prompts.systemPrompt;
  const userPrompt = prompts.userPrompt;

  console.log("=== AI Move Prompt ===");
  console.log("System Prompt:", systemPrompt);
  console.log("User Prompt:", userPrompt);
  console.log("Model:", model);
  console.log("====================");

  try {
    let response;
    let data;

    // GPT-5 models are always chat models, so use chat completions for them
    const isGPT5Model = model.startsWith('gpt-5');

    if (isGPT5Model) {
      // For GPT-5 models, only use chat completions
      const chatRequestBody = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 30,
        temperature: 0,
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
        const pt = usage.prompt_tokens ?? estimateTokensFromText(systemPrompt + "\n\n" + userPrompt);
        const raw = data.choices?.[0]?.message;
        let text = extractMessageText(raw).trim();
        const ct = usage.completion_tokens ?? estimateTokensFromText(text);
        recordMoveUsage(model, pt, ct);
        if (!text) {
          // Retry once with a simplified single-message prompt
          const simplifiedPrompt = `You are playing chess as Black. The current position is: ${fen}. Return ONLY the best move in SAN notation (like "Nf6" or "Qxd4+"). No other text.`;
          const retryBody = {
            model,
            messages: [ { role: "user", content: simplifiedPrompt } ],
            max_completion_tokens: 30,
            temperature: 0,
          };
          const retryResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(retryBody),
          });
          const retryData = await retryResp.json();
          if (retryData && !retryData.error) {
            const retryText = extractMessageText(retryData.choices?.[0]?.message).trim();
            if (retryText) return retryText;
          }
        }
        return text;
      } catch (e) { /* no-op */ }
      return extractMessageText(data.choices?.[0]?.message).trim();
    } else {
      // For other models, try chat completions first, then fall back to completions
      const chatRequestBody = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_completion_tokens: 30,
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
      if (
        data.error &&
        (data.error.type === "invalid_request_error" ||
          /not supported in the v1\/chat\/completions endpoint/i.test(
            data.error.message || ""
          ))
      ) {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const completionRequestBody = {
          model: model,
          prompt: fullPrompt,
          max_completion_tokens: 50,
        };

        // Models that ignore temperature—leave unset
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

      // If we get here, there was an error with chat completions that we can't handle
      if (data.error) {
        if (data.error.code === "invalid_api_key") {
          throw new Error(
            "Invalid API key. Please check your key and try again."
          );
        }
        throw new Error(data.error.message || "OpenAI API error");
      }
    }
  } catch (err) {
    console.error("OpenAI API error:", err);
    throw err;
  }
}
