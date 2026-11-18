/**
 * @fileoverview Gemini Client and Grounded Model Execution.
 * Strictly encapsulates the Google GenAI SDK, providing timeout control,
 * structured JSON output enforcement, and deterministic engine fallback.
 */

import { GoogleGenAI } from "@google/genai";

// Default model configuration
const DEFAULT_MODEL = "gemini-3.8-flash"; // Fast Flash-class model
const REQUEST_TIMEOUT_MS = 9000; // Hard timeout for serverless lifecycle

/** @type {any} */
let injectedClient = null;

/**
 * Injects a custom GenAI client for testing.
 * Pass null to restore default behavior.
 * @param {any} client
 */
export function setGeminiClient(client) {
  injectedClient = client;
}

/**
 * Returns an initialized Gemini SDK instance if API key is present,
 * or the injected mock client if set.
 * @returns {any}
 */
export function getGeminiClient() {
  if (injectedClient) {
    return injectedClient;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Resolves the configured model name from environment or default.
 * @returns {string}
 */
export function getModelName() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/**
 * Executes a generation request with timeout protection.
 *
 * @param {any} ai
 * @param {string} model
 * @param {any} contents
 * @param {any} config
 * @param {number} [timeoutMs=REQUEST_TIMEOUT_MS]
 * @returns {Promise<any>}
 */
async function callWithTimeout(ai, model, contents, config, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const timeoutPromise = new Promise((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(new Error("Request timed out"));
      });
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents,
        config,
      }),
      timeoutPromise,
    ]);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes a Gemini model call with system instruction and JSON output.
 * Falls back safely to null if API key is missing or call fails.
 *
 * @param {Object} options
 * @param {string} options.prompt
 * @param {string} [options.systemInstruction]
 * @param {number} [options.maxTokens=1024]
 * @param {boolean} [options.jsonMode=false]
 * @param {any} [options.customClient=null]
 * @param {number} [options.timeoutMs=REQUEST_TIMEOUT_MS]
 * @returns {Promise<string | null>}
 */
export function generateGroundedContent({
  prompt,
  systemInstruction,
  maxTokens = 1024,
  jsonMode = false,
  customClient = null,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) {
  const ai = customClient || getGeminiClient();
  if (!ai) return Promise.resolve(null);

  const model = getModelName();
  /** @type {any} */
  const config = {
    maxOutputTokens: maxTokens,
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (jsonMode) {
    config.responseMimeType = "application/json";
  }

  return callWithTimeout(ai, model, prompt, config, timeoutMs)
    .then((res) => res.text || null)
    .catch((err) => {
      // Intentionally do not log prompt or user details
      console.warn("Gemini call failed or timed out:", err?.message || "error");
      return null;
    });
}
