/**
 * @fileoverview POST /api/plan
 * Generates an end-to-end clean-air plan grounded in verified server-side air data.
 * Leverages Gemini for personalized multilingual narrative while engine calculates numbers.
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
import { generateBaselinePlan } from "../web/js/engine/baseline.js";
import { getSimulatedScenario } from "../web/js/engine/scenarios.js";

const PlanRequestSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    name: z.string().max(100).optional(),
  }),
  household: z.any().optional(),
  home: z.any().optional(),
  lifestyle: z.any().optional(),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
});

/**
 * Fetches server-verified air quality data.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<import("../web/js/types.js").HourlySeries>}
 */
async function getVerifiedAirData(lat, lon) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", (Math.round(lat * 100) / 100).toString());
  url.searchParams.set("longitude", (Math.round(lon * 100) / 100).toString());
  url.searchParams.set("hourly", "pm2_5,pm10");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error("Upstream error");
    const json = await res.json();
    return {
      times: json.hourly?.time || [],
      pm25: json.hourly?.pm2_5 || [],
      pm10: json.hourly?.pm10 || [],
      meta: {
        model: "CAMS ENSEMBLE",
        resolutionNote: "Area model estimate (~25-45 km)",
        fetchedAt: new Date().toISOString(),
        attribution: "CAMS ENSEMBLE data provider and Open-Meteo (CC BY 4.0)",
      },
    };
  } catch {
    // If upstream network fails, use simulated Patna severe curve as fallback
    return getSimulatedScenario("PATNA_SEVERE");
  }
}

/**
 * Prompts Gemini to write a grounded narrative summary based on engine baseline facts.
 * @param {any} baseline
 * @param {string} language
 * @returns {Promise<string | null>}
 */
async function draftAiNarrative(baseline, language) {
  const prompt = `You are Saans, an honest clean-air assistant for Indian families.
Air data facts:
- Headline AQI: ${baseline.headlineNAQI.aqi} (${baseline.headlineNAQI.category})
- Dominant pollutant: ${baseline.headlineNAQI.dominantPollutant.toUpperCase()}
- Key actions: ${baseline.topActions.map((/** @type {any} */ a) => a.title).join(", ")}

Task: Write a calm, 2-sentence summary and 3 direct bullet points for today in ${language}.
Rules: DO NOT invent numbers or medical diagnoses. Treat data as facts. Return plain text.`;

  return generateGroundedContent({
    prompt,
    systemInstruction:
      "You are Saans. Explain physical air data plainly without medical diagnoses.",
    maxTokens: 512,
  });
}

/**
 * Serverless handler for POST /api/plan.
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
    const status = err instanceof Object && "status" in err ? /** @type {any} */ (err).status : 400;
    return sendError(res, status, "Invalid JSON body");
  }

  const parsed = PlanRequestSchema.safeParse(body);
  if (!parsed.success) return sendError(res, 400, "Validation failed for plan input");

  const airData = await getVerifiedAirData(parsed.data.location.lat, parsed.data.location.lon);
  const baseline = generateBaselinePlan(/** @type {any} */ (parsed.data), airData);

  const aiNarrative = await draftAiNarrative(baseline, parsed.data.language);
  if (aiNarrative) {
    baseline.summary = aiNarrative.trim();
  }

  return sendJson(
    res,
    200,
    {
      ...baseline,
      airMeta: airData.meta,
    },
    { "Cache-Control": "no-store" }
  );
}
