/**
 * @fileoverview CPCB National Air Quality Index (NAQI) calculation engine.
 * Pure mathematical functions for sub-index interpolation, category classification,
 * rolling 24-hour means, and dominant pollutant determination.
 */

import { PM25_BREAKPOINTS, PM10_BREAKPOINTS, AQI_CATEGORIES } from "./breakpoints.js";

// Numerical constants
const MIN_AQI = 0; // Minimum index value
const MAX_AQI = 500; // Maximum CPCB index scale
const DEFAULT_WINDOW_HOURS = 24; // Standard rolling window length for official NAQI

/**
 * Calculates sub-index for a single pollutant concentration using linear interpolation.
 * Formula: I = I_low + ((I_high - I_low) / (C_high - C_low)) * (C - C_low)
 *
 * @param {number} concentration - Pollutant concentration in µg/m³
 * @param {"pm25" | "pm10"} pollutant - Pollutant type identifier
 * @returns {import("../types.js").SubIndexResult}
 */
export function calculateSubIndex(concentration, pollutant) {
  const safeConc = Math.max(MIN_AQI, concentration);
  const breakpoints = pollutant === "pm25" ? PM25_BREAKPOINTS : PM10_BREAKPOINTS;

  for (const bp of breakpoints) {
    if (safeConc <= bp.cHigh) {
      const fraction = (safeConc - bp.cLow) / (bp.cHigh - bp.cLow);
      const subIndex = Math.round(bp.iLow + fraction * (bp.iHigh - bp.iLow));
      return {
        subIndex: Math.min(MAX_AQI, Math.max(MIN_AQI, subIndex)),
        category: bp.category,
        pollutant,
      };
    }
  }

  // Concentration exceeds the highest breakpoint: severe category clamped to MAX_AQI
  return {
    subIndex: MAX_AQI,
    category: AQI_CATEGORIES.SEVERE,
    pollutant,
  };
}

/**
 * Maps an AQI value to its official CPCB category.
 *
 * @param {number} aqi - Calculated AQI integer
 * @returns {import("../types.js").AQICategory}
 */
export function getAQICategory(aqi) {
  if (aqi <= 50) return AQI_CATEGORIES.GOOD;
  if (aqi <= 100) return AQI_CATEGORIES.SATISFACTORY;
  if (aqi <= 200) return AQI_CATEGORIES.MODERATE;
  if (aqi <= 300) return AQI_CATEGORIES.POOR;
  if (aqi <= 400) return AQI_CATEGORIES.VERY_POOR;
  return AQI_CATEGORIES.SEVERE;
}

/**
 * Computes a rolling mean for an array of hourly numbers over a given window.
 * For hours with fewer preceding data points than windowSize, averages available points.
 *
 * @param {number[]} values - Array of hourly numeric values
 * @param {number} [windowSize=24] - Rolling window length
 * @returns {number[]}
 */
export function calculateRollingMean(values, windowSize = DEFAULT_WINDOW_HOURS) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const windowSlice = values.slice(start, index + 1);
    const sum = windowSlice.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / windowSlice.length) * 10) / 10;
  });
}

/**
 * Calculates the overall PM-based NAQI estimate from 24-hour mean concentrations.
 *
 * @param {number} pm25Mean - 24-hour average PM2.5 in µg/m³
 * @param {number} [pm10Mean=0] - 24-hour average PM10 in µg/m³
 * @returns {import("../types.js").NAQIResult}
 */
export function calculateNAQI(pm25Mean, pm10Mean = 0) {
  const pm25Res = calculateSubIndex(pm25Mean, "pm25");
  const pm10Res = calculateSubIndex(pm10Mean, "pm10");

  const dominantPollutant = pm25Res.subIndex >= pm10Res.subIndex ? "pm25" : "pm10";
  const headlineAQI = Math.max(pm25Res.subIndex, pm10Res.subIndex);

  return {
    aqi: headlineAQI,
    category: getAQICategory(headlineAQI),
    dominantPollutant,
    pm25SubIndex: pm25Res.subIndex,
    pm10SubIndex: pm10Res.subIndex,
  };
}
