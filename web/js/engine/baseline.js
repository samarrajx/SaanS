/**
 * @fileoverview Deterministic baseline plan generator.
 * Produces a complete, actionable day plan and ranked impact recommendations
 * without calling Gemini AI. Used in demo mode and as instant fallback.
 */

import { calculateNAQI } from "./naqi.js";
import { hasSensitiveMembers } from "./exposure.js";
import { buildDaySchedule } from "./schedule.js";
import { rankActions } from "./rank.js";

/**
 * Crafts a concise, grounded plain-language summary for the day.
 * @param {import("../types.js").NAQIResult} naqi
 * @param {boolean} sensitive
 * @returns {string}
 */
function createPlainSummary(naqi, sensitive) {
  const sensitiveNote = sensitive ? " Vulnerable family members should stay indoors." : "";
  switch (naqi.category) {
    case "Severe":
      return `Air quality is Severe (NAQI ~${naqi.aqi}) driven by ${naqi.dominantPollutant.toUpperCase()}. Keep home tightly sealed and run filtration.${sensitiveNote}`;
    case "Very Poor":
      return `Air quality is Very Poor (NAQI ~${naqi.aqi}). Inversion traps vehicle smog in morning and evening. Avoid vigorous outdoor exertion.${sensitiveNote}`;
    case "Poor":
      return `Air quality is Poor (NAQI ~${naqi.aqi}). Best outdoor window is in early afternoon. Ventilate briefly around 13:00.`;
    case "Moderate":
      return `Air quality is Moderate (NAQI ~${naqi.aqi}). Generally acceptable for healthy individuals; sensitive groups should limit prolonged workouts.`;
    default:
      return `Air quality is ${naqi.category} (NAQI ~${naqi.aqi}). Good opportunity for outdoor activities and home airing.`;
  }
}

/**
 * Generates a complete rule-based plan for a household profile and air data.
 *
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {import("../types.js").HourlySeries} airData
 * @returns {{
 *   summary: string,
 *   headlineNAQI: import("../types.js").NAQIResult,
 *   dayPlan: import("../types.js").DayBlock[],
 *   rankedActions: Array<{ action: import("../types.js").ActionDefinition, impact: import("../types.js").ImpactEstimate, score: number }>,
 *   topActions: import("../types.js").ActionDefinition[],
 *   caveat: string
 * }}
 */
export function generateBaselinePlan(profile, airData) {
  const pm25Mean = airData.pm25.reduce((a, b) => a + b, 0) / (airData.pm25.length || 24);
  const pm10Mean = airData.pm10.reduce((a, b) => a + b, 0) / (airData.pm10.length || 24);
  const headlineNAQI = calculateNAQI(pm25Mean, pm10Mean);

  const sensitive = hasSensitiveMembers(profile);
  const dayPlan = buildDaySchedule(profile, airData.pm25, sensitive);
  const rankedActions = rankActions(profile, airData.pm25);
  const topActions = rankedActions.slice(0, 3).map((item) => item.action);
  const summary = createPlainSummary(headlineNAQI, sensitive);

  return {
    summary,
    headlineNAQI,
    dayPlan,
    rankedActions,
    topActions,
    caveat: "Estimates for planning, not medical advice.",
  };
}
