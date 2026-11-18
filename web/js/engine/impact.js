/**
 * @fileoverview Honest, transparent impact estimation engine.
 * Computes exposure reductions and emissions deltas with low/central/high ranges.
 * Never presents false precision or cigarette-equivalent heuristics.
 */

import { simulateIndoorSeries } from "./indoor.js";

// Emission factors sourced from CPCB / ARAI (2018) and DMRC reports
const CAR_VS_METRO_CO2E_KG_PER_KM = 0.14; // Net avoided CO2e kg per passenger-km
const CAR_VS_METRO_PM_G_PER_KM = 0.03; // Net avoided exhaust PM g per passenger-km
const INDUCTION_VS_LPG_CO2E_PER_MEAL = 0.3; // Avoided kg CO2e per home-cooked meal
const N95_CENTRAL_EFFICIENCY = 0.9; // 90% effective reduction outdoors with typical fit

/**
 * Calculates commute emission savings for transit mode swaps.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {any}
 */
function calculateCommuteSavings(profile) {
  const commutes = profile?.lifestyle?.commute || [];
  const carCommute = commutes.find((c) => c.mode === "car" || c.mode === "two_wheeler");
  const weeklyKm = carCommute ? carCommute.distanceKm * 2 * carCommute.daysPerWeek : 50;

  const co2eMonthly = weeklyKm * 4 * CAR_VS_METRO_CO2E_KG_PER_KM;
  const pmMonthly = weeklyKm * 4 * CAR_VS_METRO_PM_G_PER_KM;

  return {
    co2e: {
      low: Math.round(co2eMonthly * 0.8),
      central: Math.round(co2eMonthly),
      high: Math.round(co2eMonthly * 1.2),
      unit: "kg CO₂e/month",
    },
    pm: {
      low: Math.round(pmMonthly * 0.7),
      central: Math.round(pmMonthly),
      high: Math.round(pmMonthly * 1.3),
      unit: "g PM/month",
    },
  };
}

/**
 * Calculates indoor model-based exposure reduction in µg/m³.
 * @param {import("../types.js").ActionDefinition} action
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm
 * @returns {import("../types.js").ImpactRange}
 */
function calculateIndoorExposureReduction(action, profile, outdoorPm) {
  const baseIndoor = simulateIndoorSeries(outdoorPm, profile);
  const baseAvg = baseIndoor.reduce((a, b) => a + b, 0) / 24;

  let postIndoor;
  if (action.id === "weatherstrip_windows") {
    postIndoor = simulateIndoorSeries(outdoorPm, profile, { tightness: "tight" });
  } else if (action.id === "diy_box_fan_filter") {
    postIndoor = simulateIndoorSeries(outdoorPm, profile, { cadr: 180 });
  } else if (action.id === "hepa_purifier_run") {
    postIndoor = simulateIndoorSeries(outdoorPm, profile, { cadr: 300 });
  } else if (action.id === "timed_ventilation") {
    postIndoor = simulateIndoorSeries(outdoorPm, profile, { windowsUsually: "closed" });
  } else {
    postIndoor = simulateIndoorSeries(outdoorPm, profile);
  }

  const postAvg = postIndoor.reduce((a, b) => a + b, 0) / 24;
  const reduction = Math.max(0, baseAvg - postAvg);

  return {
    low: Math.round(reduction * 0.75 * 10) / 10,
    central: Math.round(reduction * 10) / 10,
    high: Math.round(reduction * 1.25 * 10) / 10,
    unit: "µg/m³ indoor mean reduction",
  };
}

/**
 * Generates plain-language assumptions list for a given action.
 * @param {string} actionId
 * @returns {string[]}
 */
function getActionAssumptions(actionId) {
  switch (actionId) {
    case "switch_metro_bus":
      return [
        "Based on CPCB/ARAI emission factors (2018) comparing average private transport to electric metro",
        "Assumes 4 commuting weeks per month with round-trip distance from profile",
      ];
    case "wear_n95_mask":
      return [
        "Assumes certified N95 / FFP2 respirator with tight facial seal (NIOSH guidelines)",
        "Applies during outdoor transit and errands",
      ];
    case "switch_induction_stove":
      return [
        "Based on IPCC (2006) combustion factors and CEA Indian grid carbon intensity",
        "Assumes 2 primary home-cooked meals per day",
      ];
    default:
      return [
        "Simulated using single-zone mass balance model with typical residential infiltration rates",
        "Estimates are for planning, not medical advice",
      ];
  }
}

/**
 * Estimates impact for special actions with direct empirical or transit models.
 * @param {import("../types.js").ActionDefinition} action
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {any}
 */
function estimateSpecialAction(action, profile) {
  if (action.group === "commute") {
    return {
      exposureChange: { low: 30, central: 45, high: 60, unit: "% transit exposure reduction" },
      emissionsChange: calculateCommuteSavings(profile),
    };
  }
  if (action.id === "wear_n95_mask") {
    return {
      exposureChange: {
        low: 80,
        central: Math.round(N95_CENTRAL_EFFICIENCY * 100),
        high: 95,
        unit: "% inhaled outdoor particulate reduction",
      },
      emissionsChange: { direction: "neutral" },
    };
  }
  if (action.id === "switch_induction_stove") {
    const monthlyCo2 = Math.round(INDUCTION_VS_LPG_CO2E_PER_MEAL * 2 * 30);
    return {
      exposureChange: { low: 40, central: 65, high: 80, unit: "% kitchen PM2.5 reduction" },
      emissionsChange: {
        co2e: {
          low: monthlyCo2 - 4,
          central: monthlyCo2,
          high: monthlyCo2 + 6,
          unit: "kg CO₂e/month",
        },
      },
    };
  }
  return null;
}

/**
 * Estimates personal exposure and emission impact for an action.
 *
 * @param {import("../types.js").ActionDefinition} action
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm25Series - 24 hourly PM2.5 values
 * @returns {import("../types.js").ImpactEstimate}
 */
export function estimateImpact(action, profile, outdoorPm25Series) {
  const assumptions = getActionAssumptions(action.id);
  const confidence = action.evidenceTier === "established" ? "High" : "Medium";
  const special = estimateSpecialAction(action, profile);

  if (special) {
    return {
      ...special,
      assumptions,
      confidence,
    };
  }

  // Default indoor physical model computation
  const exposureChange = calculateIndoorExposureReduction(action, profile, outdoorPm25Series);
  return {
    exposureChange,
    emissionsChange: { direction: "lower" },
    assumptions,
    confidence,
  };
}
