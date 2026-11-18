/**
 * @fileoverview Ask Assistant View.
 * Interactive clean-air chat assistant with grounded answers,
 * 4 prompt pills, and allowlisted profile patch diffing with Apply & Undo.
 */

import { loadProfile } from "../storage.js";
import { createCard } from "../ui/card.js";
import { announce } from "../ui/announcer.js";
import { createPatchDiffBox } from "../ui/patch-diff.js";

const SUGGESTED_PROMPTS = [
  "Is it safe for my child to play outdoors today?",
  "How can I reduce PM2.5 in my bedroom under ₹500?",
  "What air purifier CADR do I need for my room?",
  "How should our RWA respond to Severe AQI?",
];

/**
 * Builds the prompt suggestion pill buttons.
 * @param {(promptText: string) => void} onSelect
 * @returns {HTMLDivElement}
 */
function buildPromptPills(onSelect) {
  const container = document.createElement("div");
  container.className = "prompt-pills-container";

  SUGGESTED_PROMPTS.forEach((promptText) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "prompt-pill";
    pill.textContent = promptText;
    pill.addEventListener("click", () => onSelect(promptText));
    container.appendChild(pill);
  });
  return container;
}

/**
 * Renders a single chat bubble.
 * @param {{ sender: string, text: string, patch?: { op: string, value?: unknown } | null }} msg
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLDivElement}
 */
function buildMessageBubble(msg, profile) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${msg.sender}`;

  const textP = document.createElement("p");
  textP.textContent = msg.text;
  bubble.appendChild(textP);

  if (msg.patch) {
    bubble.appendChild(createPatchDiffBox({ patch: msg.patch, profile }));
  }
  return bubble;
}

/**
 * Generates offline fallback reply when API is unreachable.
 * @param {string} query
 * @returns {{ reply: string, patch: { op: string, value?: unknown } | null }}
 */
function getOfflineFallbackReply(query) {
  const lower = query.toLowerCase();
  if (lower.includes("child") || lower.includes("outdoor")) {
    return {
      reply:
        "During severe winter smog, keep children indoors during morning and late evening inversion peaks. The cleanest window is typically between 1 PM and 3 PM when solar mixing dilutes surface PM2.5.",
      patch: null,
    };
  }
  if (lower.includes("purifier") || lower.includes("cadr")) {
    return {
      reply:
        "For a standard 150 sq ft room with 9 ft ceiling (~38 m³), aim for a clean air delivery rate (CADR) of at least 190 to 250 m³/h to achieve 5 air changes per hour.",
      patch: { op: "set_purifier", value: { has: true, cadrM3h: 250 } },
    };
  }
  return {
    reply:
      "Keep windows tightly closed during morning and evening inversions, wipe surfaces with a damp cloth instead of dry sweeping, and wear a well-fitted N95 mask when outdoors.",
    patch: null,
  };
}

/**
 * Sends chat query to /api/assist with fallback.
 * @param {string} message
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {Promise<{ reply: string, patch: { op: string, value?: unknown } | null }>}
 */
async function sendAssistMessage(message, profile) {
  try {
    const res = await fetch("/api/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, profile, language: profile.language }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.reply) return { reply: data.reply, patch: data.patch };
    }
  } catch {
    // Offline or serverless timeout
  }
  return getOfflineFallbackReply(message);
}

/**
 * Builds the chat input form.
 * @param {(query: string) => void} onSubmit
 * @returns {HTMLFormElement}
 */
function buildChatForm(onSubmit) {
  const form = document.createElement("form");
  form.className = "chat-input-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ui-input";
  input.placeholder = "Ask about air quality, purifiers, masks...";
  input.required = true;
  input.setAttribute("aria-label", "Clean-air question input");

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "ui-button primary";
  submitBtn.textContent = "Send 🚀";

  form.appendChild(input);
  form.appendChild(submitBtn);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) {
      input.value = "";
      onSubmit(val);
    }
  });
  return form;
}

/**
 * Sets up chat messages, query handling, and log rendering.
 * @param {HTMLElement} cardContent
 * @param {import("../types.js").HouseholdProfile} profile
 */
function setupChatConversation(cardContent, profile) {
  /** @type {Array<{ sender: string, text: string, patch?: { op: string, value?: unknown } | null }>} */
  const history = [
    {
      sender: "assistant",
      text: "Namaste! I am Saans, your clean-air companion. Ask me any practical question about winter smog or indoor air management.",
    },
  ];

  const logContainer = document.createElement("div");
  logContainer.className = "chat-log";
  logContainer.setAttribute("role", "log");
  logContainer.setAttribute("aria-live", "polite");

  const renderLog = () => {
    logContainer.replaceChildren(...history.map((m) => buildMessageBubble(m, profile)));
  };

  const handleQuery = async (/** @type {string} */ queryText) => {
    history.push({ sender: "user", text: queryText });
    renderLog();
    announce("Thinking...");
    const response = await sendAssistMessage(queryText, profile);
    history.push({ sender: "assistant", text: response.reply, patch: response.patch });
    renderLog();
    announce(`Assistant replied: ${response.reply.slice(0, 50)}...`);
  };

  renderLog();
  cardContent.appendChild(buildPromptPills(handleQuery));
  cardContent.appendChild(logContainer);
  cardContent.appendChild(buildChatForm(handleQuery));
}

/**
 * Renders the Ask Clean-Air Assistant View.
 * @returns {HTMLElement}
 */
export function render() {
  const profile = loadProfile();
  const view = document.createElement("div");
  view.className = "view-ask";

  const h1 = document.createElement("h1");
  h1.className = "view-title";
  h1.textContent = "Clean-Air Assistant 💬";
  view.appendChild(h1);

  const cardContent = document.createElement("div");
  setupChatConversation(cardContent, profile);

  view.appendChild(
    createCard({
      title: "Grounded Conversation",
      content: cardContent,
    })
  );

  return view;
}
