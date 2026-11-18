/**
 * @fileoverview Deterministic action ranking engine.
 * Ranks applicable actions by estimated exposure reduction per rupee within budget band.
 */

import { ACTIONS_CATALOG } from "./actions.js";
import { estimateImpact } from "./impact.js";

// Budget band order mapping
const BUDGET_RANKS = {
  zero: 0,
  low: 1,
  medium: 2,
  high: 3,
};

/** @type {Record<string, number>} */
const COST_BAND_MAP = {
  "₹0": 0,
  "₹": 1,
  "₹₹": 2,
  "₹₹₹": 3,
};

/**
 * Checks whether an action fits within the user's budget band.
 * @param {string} costBand
 * @param {import("../types.js").BudgetBand} userBudget
 * @returns {boolean}
 */
export function isWithinBudget(costBand, userBudget = "low") {
  const maxAllowed = BUDGET_RANKS[userBudget] ?? 1;
  const actionBand = COST_BAND_MAP[costBand] ?? 0;
  return actionBand <= maxAllowed;
}

/**
 * Calculates a deterministic efficiency score for an action.
 * @param {any} action
 * @param {import("../types.js").ImpactEstimate} impact
 * @returns {number}
 */
function calculateEfficiencyScore(action, impact) {
  const reduction = impact.exposureChange.central || 10;
  if (action.costNumeric === 0) {
    // Free actions scored highly to prioritize zero-cost behavioral hacks
    return 10000 + reduction;
  }
  return Math.round((reduction * 10000) / action.costNumeric);
}

/**
 * Ranks all applicable actions for a household profile and outdoor air conditions.
 * Stable and deterministic sorting.
 *
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm25Series
 * @returns {Array<{ action: any, impact: import("../types.js").ImpactEstimate, score: number }>}
 */
export function rankActions(profile, outdoorPm25Series) {
  const budget = profile?.lifestyle?.budgetBand || "low";

  // Filter applicable actions
  const applicable = ACTIONS_CATALOG.filter((action) => {
    return action.isApplicable(profile) && isWithinBudget(action.costBand, budget);
  });

  // Calculate impacts and efficiency scores
  const scored = applicable.map((action) => {
    const impact = estimateImpact(action, profile, outdoorPm25Series);
    const score = calculateEfficiencyScore(action, impact);
    return { action, impact, score };
  });

  // Deterministic sort: score descending, tie-break by action.id ascending
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.action.id.localeCompare(b.action.id);
  });

  return scored;
}
