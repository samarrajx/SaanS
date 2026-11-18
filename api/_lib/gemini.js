/**
 * @fileoverview Gemini Client and Grounded Model Execution.
 * Strictly encapsulates the Google GenAI SDK, providing timeout control,
 * structured JSON output enforcement, and deterministic engine fallback.
 */

import { GoogleGenAI } from "@google/genai";

// Default model configuration
const DEFAULT_MODEL = "gemini-3.8-flash"; // Fast Flash-class model
const REQUEST_TIMEOUT_MS = 9000; // Hard timeout for serverless lifecycle

/**
 * @typedef {Object} GeminiClientLike
 * @property {{ generateContent: (args: { model: string, contents: string, config?: Record<string, unknown> }) => Promise<{ text?: string | (() => string) }> }} models
 * @property {boolean} [mock]
 */

/** @type {GoogleGenAI | GeminiClientLike | Record<string, unknown> | null} */
let injectedClient = null;

/**
 * Injects a custom GenAI client for testing.
 * Pass null to restore default behavior.
 * @param {GoogleGenAI | GeminiClientLike | Record<string, unknown> | null} client
 */
export function setGeminiClient(client) {
  injectedClient = client;
}

/**
 * Returns an initialized Gemini SDK instance if API key is present,
 * or the injected mock client if set.
 * @returns {GoogleGenAI | GeminiClientLike | Record<string, unknown> | null}
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
 * @param {GoogleGenAI | GeminiClientLike} ai
 * @param {string} model
 * @param {string} contents
 * @param {Record<string, unknown>} config
 * @param {number} [timeoutMs=REQUEST_TIMEOUT_MS]
 * @returns {Promise<{ text?: string | (() => string) } | null>}
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
    return /** @type {{ text?: string | (() => string) }} */ (response);
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
 * @param {GoogleGenAI | GeminiClientLike | null} [options.customClient=null]
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
  const ai = /** @type {GoogleGenAI | GeminiClientLike | null} */ (
    customClient || getGeminiClient()
  );
  if (!ai) return Promise.resolve(null);

  const model = getModelName();
  /** @type {Record<string, unknown>} */
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
    .then((res) => {
      if (!res) return null;
      const text = typeof res.text === "function" ? res.text() : res.text;
      return text || null;
    })
    .catch((err) => {
      // Intentionally do not log prompt or user details
      console.warn("Gemini call failed or timed out:", err?.message || "error");
      return null;
    });
}
