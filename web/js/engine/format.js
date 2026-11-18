/**
 * @fileoverview Formatting utilities for ranges, metrics, and timestamps.
 * Enforces consistent range presentation (Low – High) without false precision.
 */

// Numerical display constants
const DEFAULT_DECIMALS = 1; // Standard decimal precision for physical rates

/**
 * Formats a physical or emission range honestly: "Low – High Unit".
 *
 * @param {number} low - Lower bound
 * @param {number} high - Upper bound
 * @param {string} [unit=""] - Metric unit
 * @returns {string}
 */
export function formatRange(low, high, unit = "") {
  const roundLow = Math.round(low * 10) / 10;
  const roundHigh = Math.round(high * 10) / 10;

  if (roundLow === roundHigh) {
    return unit ? `${roundLow} ${unit}` : `${roundLow}`;
  }
  return unit ? `${roundLow}–${roundHigh} ${unit}` : `${roundLow}–${roundHigh}`;
}

/**
 * Formats a 24-hour integer (0-23) into clean time notation.
 *
 * @param {number} hour - Hour of the day (0-23)
 * @param {"24h" | "12h"} [style="24h"]
 * @returns {string}
 */
export function formatHour(hour, style = "24h") {
  const safeHour = Math.min(23, Math.max(0, Math.floor(hour)));
  if (style === "12h") {
    const period = safeHour >= 12 ? "PM" : "AM";
    const h12 = safeHour % 12 === 0 ? 12 : safeHour % 12;
    return `${h12}:00 ${period}`;
  }
  const padded = safeHour.toString().padStart(2, "0");
  return `${padded}:00`;
}

/**
 * Formats a start and end hour into a readable block range: "12:00 – 14:00".
 *
 * @param {number} startHour
 * @param {number} endHour
 * @returns {string}
 */
export function formatTimeRange(startHour, endHour) {
  return `${formatHour(startHour)} – ${formatHour(endHour)}`;
}

/**
 * Safely formats a decimal float to 1 decimal place.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (isNaN(value)) return "0";
  return (Math.round(value * 10) / 10).toFixed(DEFAULT_DECIMALS).replace(/\.0$/, "");
}
