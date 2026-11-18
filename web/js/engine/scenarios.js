/**
 * @fileoverview Synthetic diurnal air quality scenarios for testing, demonstrations,
 * and offline/fallback operation. Clearly labeled "Simulated".
 */

// Diurnal profile shaping factors representing Indo-Gangetic Plain winter inversion:
// High concentration overnight and early morning due to shallow nocturnal boundary layer;
// afternoon dip (12:00-16:00) due to solar convective mixing.
const DIURNAL_FACTORS = [
  1.25, 1.3, 1.35, 1.4, 1.45, 1.4, 1.35, 1.3, 1.15, 0.95, 0.8, 0.7, 0.65, 0.6, 0.65, 0.75, 0.9,
  1.05, 1.2, 1.3, 1.35, 1.35, 1.3, 1.25,
];

// Fixed reference base concentrations in µg/m³
const SEVERE_BASE_PM25 = 270; // Produces Severe headline AQI
const VERY_POOR_BASE_PM25 = 150; // Produces Very Poor headline AQI
const POOR_BASE_PM25 = 100; // Produces Poor headline AQI
const MODERATE_BASE_PM25 = 70; // Produces Moderate headline AQI
const GOOD_BASE_PM25 = 20; // Produces Good headline AQI
const PM10_RATIO = 1.65; // PM10 to PM2.5 ratio in winter dust/combustion mix

/**
 * Generates an ISO timestamps array for 24 hours starting today at 00:00 local time.
 * @returns {string[]}
 */
function generate24HourTimestamps() {
  const now = new Date();
  const times = [];
  for (let h = 0; h < 24; h++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0);
    times.push(d.toISOString());
  }
  return times;
}

/**
 * Builds a 24-hour diurnal series by scaling base concentration with inversion profile.
 * @param {number} basePm25
 * @returns {{ pm25: number[], pm10: number[] }}
 */
function buildDiurnalSeries(basePm25) {
  const pm25 = DIURNAL_FACTORS.map((factor) => Math.round(basePm25 * factor));
  const pm10 = pm25.map((val) => Math.round(val * PM10_RATIO));
  return { pm25, pm10 };
}

/**
 * Preset synthetic scenarios.
 */
export const PRESET_SCENARIOS = {
  PATNA_SEVERE: {
    id: "patna_severe",
    title: "Patna Winter Smog Inversion",
    category: "Severe",
    locationName: "Patna, Bihar",
    lat: 25.59,
    lon: 85.14,
    basePm25: SEVERE_BASE_PM25,
  },
  DELHI_VERY_POOR: {
    id: "delhi_very_poor",
    title: "Delhi Winter Very Poor",
    category: "Very Poor",
    locationName: "New Delhi, Delhi",
    lat: 28.61,
    lon: 77.21,
    basePm25: VERY_POOR_BASE_PM25,
  },
  POOR_DAY: {
    id: "poor_day",
    title: "Urban Poor Air Quality",
    category: "Poor",
    locationName: "Kanpur, Uttar Pradesh",
    lat: 26.45,
    lon: 80.33,
    basePm25: POOR_BASE_PM25,
  },
  MODERATE_DAY: {
    id: "moderate_day",
    title: "Moderate Air Day",
    category: "Moderate",
    locationName: "Bengaluru, Karnataka",
    lat: 12.97,
    lon: 77.59,
    basePm25: MODERATE_BASE_PM25,
  },
  CLEAN_GOOD: {
    id: "clean_good",
    title: "Clean Post-Rain Day",
    category: "Good",
    locationName: "Shillong, Meghalaya",
    lat: 25.58,
    lon: 91.89,
    basePm25: GOOD_BASE_PM25,
  },
};

/**
 * Returns a fully formed simulated air data object labeled "Simulated".
 *
 * @param {keyof typeof PRESET_SCENARIOS} scenarioKey
 * @returns {import("../types.js").HourlySeries & { label: string, location: { name: string, lat: number, lon: number, timezone: string } }}
 */
export function getSimulatedScenario(scenarioKey = "PATNA_SEVERE") {
  const config = PRESET_SCENARIOS[scenarioKey] || PRESET_SCENARIOS.PATNA_SEVERE;
  const { pm25, pm10 } = buildDiurnalSeries(config.basePm25);
  const times = generate24HourTimestamps();

  return {
    label: "Simulated",
    location: {
      name: config.locationName,
      lat: config.lat,
      lon: config.lon,
      timezone: "Asia/Kolkata",
    },
    times,
    pm25,
    pm10,
    meta: {
      model: "Synthetic Diurnal Inversion Model",
      resolutionNote: "Simulated scenario for demonstration and offline planning",
      fetchedAt: new Date().toISOString(),
      attribution: "Simulated data (Saans synthetic test harness)",
    },
  };
}
