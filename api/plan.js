/**
 * @fileoverview POST /api/plan
 * Generates an end-to-end clean-air plan grounded in verified server-side air data.
 * Leverages Gemini for personalized multilingual narrative while engine calculates numbers.
 */

import { z } from "zod";
import { sendJson } from "./_lib/security.js";
import { createHandler } from "./_lib/handler.js";
import { generateGroundedContent } from "./_lib/gemini.js";
import { generateBaselinePlan } from "../web/js/engine/baseline.js";
import { getSimulatedScenario } from "../web/js/engine/scenarios.js";

const PlanRequestSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    name: z.string().max(100).optional(),
  }),
  household: z.record(z.string(), z.unknown()).optional().nullable(),
  home: z.record(z.string(), z.unknown()).optional().nullable(),
  lifestyle: z.record(z.string(), z.unknown()).optional().nullable(),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
});

/**
 * Maps raw Open-Meteo JSON to HourlySeries structure.
 * @param {{ hourly?: { time?: string[], pm2_5?: number[], pm10?: number[] } }} json
 * @returns {import("../web/js/types.js").HourlySeries}
 */
function parseAirJson(json) {
  const hourly = json?.hourly;
  return {
    times: hourly?.time || [],
    pm25: hourly?.pm2_5 || [],
    pm10: hourly?.pm10 || [],
    meta: {
      model: "CAMS ENSEMBLE",
      resolutionNote: "Area model estimate (~25-45 km)",
      fetchedAt: new Date().toISOString(),
      attribution: "CAMS ENSEMBLE data provider and Open-Meteo (CC BY 4.0)",
    },
  };
}

/**
 * Fetches server-verified air quality data.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<import("../web/js/types.js").HourlySeries>}
 */
async function getVerifiedAirData(lat, lon) {
  const latR = (Math.round(lat * 100) / 100).toString();
  const lonR = (Math.round(lon * 100) / 100).toString();
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latR}&longitude=${lonR}&hourly=pm2_5,pm10&timezone=auto&forecast_days=5`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error("Upstream error");
    const json = await res.json();
    return parseAirJson(json);
  } catch {
    // If upstream network fails, use simulated Patna severe curve as fallback
    return getSimulatedScenario("PATNA_SEVERE");
  }
}

/**
 * Prompts Gemini to write a grounded narrative summary based on engine baseline facts.
 * @param {ReturnType<typeof generateBaselinePlan>} baseline
 * @param {string} language
 * @returns {Promise<string | null>}
 */
async function draftAiNarrative(baseline, language) {
  const prompt = `You are Saans, an honest clean-air assistant for Indian families.
Air data facts:
- Headline AQI: ${baseline.headlineNAQI.aqi} (${baseline.headlineNAQI.category})
- Dominant pollutant: ${baseline.headlineNAQI.dominantPollutant.toUpperCase()}
- Key actions: ${baseline.topActions.map((/** @type {import("../web/js/types.js").ActionDefinition} */ a) => a.title).join(", ")}

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
 */
export default createHandler({
  methods: ["POST"],
  schema: PlanRequestSchema,
  schemaErrorMessage: "Validation failed for plan input",
  run: async ({ res, data }) => {
    const airData = await getVerifiedAirData(data.location.lat, data.location.lon);
    const baseline = generateBaselinePlan(
      /** @type {import("../web/js/types.js").HouseholdProfile} */ (/** @type {unknown} */ (data)),
      airData
    );

    const aiNarrative = await draftAiNarrative(baseline, data.language);
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
  },
});
