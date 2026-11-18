/**
 * @fileoverview Indoor Air Quality Mass-Balance Simulation Model.
 * Implements the single-zone physical conservation equation:
 * dC/dt = P * λ * C_out + S/V - (λ + k + CADR/V) * C
 * Solved hourly via the exact analytical exponential step solution.
 */

import {
  PENETRATION_FACTOR,
  AIR_EXCHANGE_RATE,
  PM25_DEPOSITION_RATE,
  DEFAULT_ROOM_VOLUME,
  INDOOR_SOURCE_EMISSIONS,
} from "./assumptions.js";

// Time and numerical constants
const TIME_STEP_HOURS = 1.0; // Hourly interval
const ZERO_CONCENTRATION = 0; // Lower physical floor

/**
 * Resolves envelope infiltration air change rate based on window habit and home tightness.
 *
 * @param {import("../types.js").WindowHabit} windowHabit
 * @param {import("../types.js").HomeTightness} tightness
 * @param {"low" | "central" | "high"} tier
 * @returns {number} Air exchange rate in h⁻¹
 */
export function resolveACH(windowHabit, tightness, tier = "central") {
  if (windowHabit === "open") return AIR_EXCHANGE_RATE.windows_open[tier];
  if (windowHabit === "mixed") return AIR_EXCHANGE_RATE.windows_mixed[tier];
  const key = `closed_${tightness}`;
  const param = AIR_EXCHANGE_RATE[key] || AIR_EXCHANGE_RATE.closed_average;
  return param[tier];
}

/**
 * Resolves penetration coefficient based on building tightness.
 *
 * @param {import("../types.js").HomeTightness} tightness
 * @param {"low" | "central" | "high"} tier
 * @returns {number} Fraction entering indoor air
 */
export function resolvePenetration(tightness, tier = "central") {
  const param = PENETRATION_FACTOR[tightness] || PENETRATION_FACTOR.average;
  return param[tier];
}

/**
 * Resolves effective room volume in m³.
 *
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {"low" | "central" | "high"} tier
 * @returns {number}
 */
export function resolveRoomVolume(profile, tier = "central") {
  if (profile?.home?.roomVolumeM3 && profile.home.roomVolumeM3 > 0) {
    return profile.home.roomVolumeM3;
  }
  const type = profile?.home?.type || "flat";
  const param = DEFAULT_ROOM_VOLUME[type] || DEFAULT_ROOM_VOLUME.flat;
  return param[tier];
}

/**
 * Calculates steady-state indoor PM2.5 concentration in µg/m³.
 * C_ss = (P * λ * C_out + S/V) / (λ + k + CADR/V)
 *
 * @param {number} outdoorPm - Outdoor PM2.5 in µg/m³
 * @param {number} p - Penetration factor
 * @param {number} lambda - Air exchange rate (h⁻¹)
 * @param {number} k - Deposition rate (h⁻¹)
 * @param {number} cadr - Purifier Clean Air Delivery Rate (m³/h)
 * @param {number} volume - Room volume (m³)
 * @param {number} sourceEmission - Indoor source rate (µg/h)
 * @returns {number}
 */
export function calculateSteadyState(outdoorPm, p, lambda, k, cadr, volume, sourceEmission = 0) {
  const alpha = lambda + k + cadr / volume;
  if (alpha <= 0) return outdoorPm;
  const generation = p * lambda * outdoorPm + sourceEmission / volume;
  return Math.max(ZERO_CONCENTRATION, generation / alpha);
}

/**
 * Solves one hourly step analytically: C(t+1) = C_ss + (C(t) - C_ss) * exp(-alpha * dt)
 *
 * @param {number} currentIndoorPm
 * @param {number} outdoorPm
 * @param {number} p
 * @param {number} lambda
 * @param {number} k
 * @param {number} cadr
 * @param {number} volume
 * @param {number} sourceEmission
 * @returns {number}
 */
export function stepIndoorPm(
  currentIndoorPm,
  outdoorPm,
  p,
  lambda,
  k,
  cadr,
  volume,
  sourceEmission = 0
) {
  const alpha = lambda + k + cadr / volume;
  const generation = p * lambda * outdoorPm + sourceEmission / volume;
  if (alpha <= 0) return currentIndoorPm + generation * TIME_STEP_HOURS;

  const cSteadyState = generation / alpha;
  const nextC =
    cSteadyState + (currentIndoorPm - cSteadyState) * Math.exp(-alpha * TIME_STEP_HOURS);
  return Math.max(ZERO_CONCENTRATION, Math.round(nextC * 10) / 10);
}

/**
 * @typedef {Object} SimulationOverrides
 * @property {number} [cadr]
 * @property {import("../types.js").WindowHabit} [windowsUsually]
 * @property {import("../types.js").HomeTightness} [tightness]
 * @property {number} [sourceEmission]
 */

/**
 * Resolves effective CADR from overrides or profile.
 * @param {SimulationOverrides} overrides
 * @param {import("../types.js").HouseholdProfile} [profile]
 * @returns {number}
 */
function resolvePurifierCadr(overrides, profile) {
  if (overrides.cadr !== undefined) return overrides.cadr;
  if (profile?.home?.purifier?.has) {
    return profile.home.purifier.cadrM3h || 250;
  }
  return 0;
}

/**
 * Resolves baseline indoor source emissions.
 * @param {SimulationOverrides} overrides
 * @param {import("../types.js").HouseholdProfile} [profile]
 * @param {"low" | "central" | "high"} [tier="central"]
 * @returns {number}
 */
function resolveSourceEmission(overrides, profile, tier = "central") {
  if (overrides.sourceEmission !== undefined) {
    return overrides.sourceEmission;
  }
  if (profile?.home?.cookingFuel === "biomass") {
    return INDOOR_SOURCE_EMISSIONS.cooking_biomass[tier];
  }
  return 0;
}

/**
 * Resolves tightness parameter.
 * @param {SimulationOverrides} overrides
 * @param {import("../types.js").HouseholdProfile} [profile]
 * @returns {import("../types.js").HomeTightness}
 */
function resolveTightness(overrides, profile) {
  if (overrides.tightness) return overrides.tightness;
  if (profile && profile.home && profile.home.tightness) return profile.home.tightness;
  return "average";
}

/**
 * Resolves window habit parameter.
 * @param {SimulationOverrides} overrides
 * @param {import("../types.js").HouseholdProfile} [profile]
 * @returns {import("../types.js").WindowHabit}
 */
function resolveWindowHabit(overrides, profile) {
  if (overrides.windowsUsually) return overrides.windowsUsually;
  if (profile && profile.home && profile.home.windowsUsually) return profile.home.windowsUsually;
  return "mixed";
}

/**
 * Simulates 24 hours of indoor PM2.5 based on outdoor diurnal series and household profile.
 *
 * @param {number[]} hourlyOutdoorPm - 24 hourly outdoor PM2.5 values
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {SimulationOverrides} [overrides={}]
 * @param {"low" | "central" | "high"} [tier="central"]
 * @returns {number[]} 24 hourly indoor PM2.5 values
 */
export function simulateIndoorSeries(hourlyOutdoorPm, profile, overrides = {}, tier = "central") {
  const tightness = resolveTightness(overrides, profile);
  const windowHabit = resolveWindowHabit(overrides, profile);
  const p = resolvePenetration(tightness, tier);
  const lambda = resolveACH(windowHabit, tightness, tier);
  const k = PM25_DEPOSITION_RATE[tier];
  const volume = resolveRoomVolume(profile, tier);
  const cadr = resolvePurifierCadr(overrides, profile);
  const source = resolveSourceEmission(overrides, profile, tier);

  let currentC = calculateSteadyState(hourlyOutdoorPm[0] || 100, p, lambda, k, cadr, volume, 0);
  const result = [];

  for (let hour = 0; hour < 24; hour++) {
    const outdoor = hourlyOutdoorPm[hour] || 0;
    const isMealHour = hour === 8 || hour === 13 || hour === 20;
    const hourlySource = isMealHour ? source : 0;
    currentC = stepIndoorPm(currentC, outdoor, p, lambda, k, cadr, volume, hourlySource);
    result.push(currentC);
  }

  return result;
}
