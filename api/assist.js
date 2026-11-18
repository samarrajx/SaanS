/**
 * @fileoverview POST /api/assist
 * Conversational clean-air assistant with grounded facts and allowlisted profile patching.
 */

import { z } from "zod";
import {
  verifyOrigin,
  checkRateLimit,
  readJsonBody,
  sendJson,
  sendError,
} from "./_lib/security.js";
import { generateGroundedContent } from "./_lib/gemini.js";
import { ALLOWLISTED_OPERATIONS } from "../web/js/engine/patch.js";

const AssistSchema = z.object({
  message: z.string().trim().min(1).max(500),
  profile: z.record(z.string(), z.unknown()).optional().nullable(),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
});

/**
 * Validates that an AI proposed patch strictly adheres to the allowlist.
 * @param {{ op?: string, value?: unknown } | null | undefined} patch
 * @returns {{ op: string, value: unknown } | null}
 */
function sanitizeProposedPatch(patch) {
  if (!patch || typeof patch !== "object" || typeof patch.op !== "string") return null;
  if (!ALLOWLISTED_OPERATIONS.includes(/** @type {string} */ (patch.op))) return null;
  return { op: patch.op, value: patch.value };
}

/**
 * Builds user context prompt with XML escaping for data boundary.
 * @param {string} userMessage
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {string}
 */
function buildAssistPrompt(userMessage, profile) {
  const home = /** @type {Record<string, unknown> | undefined} */ (profile?.home);
  const fuel = typeof home?.cookingFuel === "string" ? home.cookingFuel : "unknown";
  const purifierObj = /** @type {{ has?: boolean } | undefined} */ (home?.purifier);
  const hasPurifier = Boolean(purifierObj?.has);
  const purifier = hasPurifier ? "Yes" : "No";
  const lifestyle = /** @type {Record<string, unknown> | undefined} */ (profile?.lifestyle);
  const budget = typeof lifestyle?.budgetBand === "string" ? lifestyle.budgetBand : "standard";
  const cleanMsg = userMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `User profile context:\nCooking fuel: ${fuel}, Purifier: ${purifier}, Budget: ${budget}\n\n<user_message>\n${cleanMsg}\n</user_message>`;
}

/**
 * Parses and validates raw model response JSON.
 * @param {string | null} rawJson
 * @returns {{ reply: string, patch: { op: string, value: unknown } | null } | null}
 */
function parseAssistResponse(rawJson) {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    return {
      reply: parsed.reply || "I am here to help you navigate winter air pollution safely.",
      patch: sanitizeProposedPatch(parsed.patch),
    };
  } catch {
    return null;
  }
}

/**
 * Prompts Gemini with user message as tagged data and requests JSON reply + optional patch.
 * @param {string} userMessage
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {string} language
 * @returns {Promise<{ reply: string, patch: { op: string, value: unknown } | null }>}
 */
async function generateAssistReply(userMessage, profile, language) {
  const systemInstruction = `You are Saans, an empathetic clean-air assistant for Indian families.
Rules:
- Speak in ${language}.
- Give practical, science-backed guidance on air pollution.
- Never diagnose medical symptoms; recommend consulting a doctor for breathing issues.
- You may propose a profile update ONLY if the user explicitly asks to update a setting.
Allowed patch ops: set_commute_mode, set_cooking_fuel, set_purifier, set_window_habit, adopt_action, drop_action, set_budget_band.
Output JSON schema: { "reply": "string", "patch": { "op": "string", "value": "string | number | boolean | object" } or null }`;

  const prompt = buildAssistPrompt(userMessage, profile);
  const rawJson = await generateGroundedContent({
    prompt,
    systemInstruction,
    maxTokens: 512,
    jsonMode: true,
  });

  const parsed = parseAssistResponse(rawJson);
  if (parsed) return parsed;

  return {
    reply:
      "During severe winter smog, keep windows sealed during morning and evening inversions, run air purifiers, and wear an N95 mask outdoors.",
    patch: null,
  };
}

/**
 * Extracts numeric error status from unknown catch error.
 * @param {unknown} err
 * @returns {number}
 */
function getErrorStatus(err) {
  if (err && typeof err === "object" && "status" in err && typeof err.status === "number") {
    return err.status;
  }
  return 400;
}

/**
 * Serverless handler for POST /api/assist.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Method Not Allowed");
  if (!verifyOrigin(req)) return sendError(res, 403, "Forbidden Origin");
  if (!checkRateLimit(req)) return sendError(res, 429, "Too Many Requests");

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(res, getErrorStatus(err), "Invalid JSON body");
  }

  const parsed = AssistSchema.safeParse(body);
  if (!parsed.success) return sendError(res, 400, "Validation failed for assist input");

  const result = await generateAssistReply(
    parsed.data.message,
    parsed.data.profile,
    parsed.data.language
  );
  return sendJson(res, 200, result, { "Cache-Control": "no-store" });
}
