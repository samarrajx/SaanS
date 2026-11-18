/**
 * @fileoverview Exposure analysis and window selection algorithms.
 * Identifies peak pollution hours, optimal outdoor activity windows,
 * and ventilation opportunities based on diurnal patterns and profile sensitivity.
 */

// Exposure threshold constants in µg/m³
const STANDARD_OUTDOOR_MAX_PM25 = 60; // Max acceptable for general outdoor exercise
const SENSITIVE_OUTDOOR_MAX_PM25 = 30; // Stricter outdoor threshold for sensitive groups
const VENTILATION_ABSOLUTE_CEILING = 150; // Above this, natural ventilation is hazardous
const DAYLIGHT_START_HOUR = 6; // Earliest outdoor window hour (06:00)
const DAYLIGHT_END_HOUR = 20; // Latest outdoor window hour (20:00)
const TOP_PEAK_COUNT = 4; // Number of peak hours to flag
const BEST_WINDOW_HOURS = 2; // Optimal duration in hours for best outdoor block

/**
 * Checks if the household profile contains vulnerable members.
 *
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {boolean}
 */
export function hasSensitiveMembers(profile) {
  if (!profile?.household?.members) return false;
  return profile.household.members.some(
    (m) => m.sensitive || m.ageGroup === "infant" || m.ageGroup === "senior"
  );
}

/**
 * Finds the top peak pollution hours of the day.
 *
 * @param {number[]} hourlyPm25 - 24 hourly PM2.5 values
 * @returns {number[]} Array of hour indices (0-23) sorted by concentration descending
 */
export function findPeakPollutionHours(hourlyPm25) {
  const indexed = hourlyPm25.slice(0, 24).map((pm, hour) => ({ hour, pm }));
  indexed.sort((a, b) => b.pm - a.pm);
  return indexed.slice(0, TOP_PEAK_COUNT).map((item) => item.hour);
}

/**
 * Finds the best contiguous outdoor window during waking daylight hours.
 *
 * @param {number[]} hourlyPm25 - 24 hourly PM2.5 values
 * @param {boolean} isSensitive - Stricter threshold applied if true
 * @returns {{ startHour: number, endHour: number, averagePm: number, acceptable: boolean }}
 */
export function findBestOutdoorWindow(hourlyPm25, isSensitive) {
  const threshold = isSensitive ? SENSITIVE_OUTDOOR_MAX_PM25 : STANDARD_OUTDOOR_MAX_PM25;
  let bestStart = DAYLIGHT_START_HOUR;
  let minSum = Infinity;

  for (let h = DAYLIGHT_START_HOUR; h <= DAYLIGHT_END_HOUR - BEST_WINDOW_HOURS; h++) {
    const sum = hourlyPm25[h] + hourlyPm25[h + 1];
    if (sum < minSum) {
      minSum = sum;
      bestStart = h;
    }
  }

  const averagePm = Math.round((minSum / BEST_WINDOW_HOURS) * 10) / 10;
  return {
    startHour: bestStart,
    endHour: bestStart + BEST_WINDOW_HOURS,
    averagePm,
    acceptable: averagePm <= threshold,
  };
}

/**
 * Identifies the cleanest hour(s) for a brief air flush (ventilation).
 *
 * @param {number[]} hourlyPm25 - 24 hourly PM2.5 values
 * @returns {{ hour: number, pm: number, safeToVentilate: boolean }}
 */
export function findVentilationWindow(hourlyPm25) {
  let minHour = 12; // Default to solar noon dip
  let minPm = Infinity;

  // Search between 11:00 and 16:00 when boundary layer is deepest
  for (let h = 11; h <= 16; h++) {
    if (hourlyPm25[h] < minPm) {
      minPm = hourlyPm25[h];
      minHour = h;
    }
  }

  return {
    hour: minHour,
    pm: minPm,
    safeToVentilate: minPm < VENTILATION_ABSOLUTE_CEILING,
  };
}
