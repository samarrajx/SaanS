/**
 * @fileoverview CPCB National Air Quality Index (NAQI) Breakpoint Tables.
 * Source: Central Pollution Control Board (CPCB), Ministry of Environment,
 * Forest and Climate Change, Govt. of India: "National Air Quality Index" Report, 2014.
 */

/**
 * NAQI Category Labels
 * @type {Record<string, import("../types.js").AQICategory>}
 */
export const AQI_CATEGORIES = {
  GOOD: "Good",
  SATISFACTORY: "Satisfactory",
  MODERATE: "Moderate",
  POOR: "Poor",
  VERY_POOR: "Very Poor",
  SEVERE: "Severe",
};

/**
 * Breakpoints for PM2.5 (24-hour average in µg/m³).
 * Source: CPCB NAQI Report (2014), Table 1, Row: PM2.5.
 * Verified: Good 0-30, Satisfactory 31-60, Moderate 61-90,
 * Poor 91-120, Very Poor 121-250, Severe 250+.
 * @type {Array<import("../types.js").BreakpointRow>}
 */
export const PM25_BREAKPOINTS = [
  {
    cLow: 0, // Lower concentration limit (µg/m³)
    cHigh: 30, // Upper concentration limit (µg/m³)
    iLow: 0, // Lower index limit
    iHigh: 50, // Upper index limit
    category: "Good", // CPCB category
  },
  {
    cLow: 31, // Lower concentration limit (µg/m³)
    cHigh: 60, // Upper concentration limit (µg/m³)
    iLow: 51, // Lower index limit
    iHigh: 100, // Upper index limit
    category: "Satisfactory", // CPCB category
  },
  {
    cLow: 61, // Lower concentration limit (µg/m³)
    cHigh: 90, // Upper concentration limit (µg/m³)
    iLow: 101, // Lower index limit
    iHigh: 200, // Upper index limit
    category: "Moderate", // CPCB category
  },
  {
    cLow: 91, // Lower concentration limit (µg/m³)
    cHigh: 120, // Upper concentration limit (µg/m³)
    iLow: 201, // Lower index limit
    iHigh: 300, // Upper index limit
    category: "Poor", // CPCB category
  },
  {
    cLow: 121, // Lower concentration limit (µg/m³)
    cHigh: 250, // Upper concentration limit (µg/m³)
    iLow: 301, // Lower index limit
    iHigh: 400, // Upper index limit
    category: "Very Poor", // CPCB category
  },
  {
    cLow: 251, // Lower concentration limit (µg/m³)
    cHigh: 380, // Upper concentration limit for 500 AQI scale (µg/m³)
    iLow: 401, // Lower index limit
    iHigh: 500, // Upper index limit
    category: "Severe", // CPCB category
  },
];

/**
 * Breakpoints for PM10 (24-hour average in µg/m³).
 * Source: CPCB NAQI Report (2014), Table 1, Row: PM10.
 * Verified: Good 0-50, Satisfactory 51-100, Moderate 101-250,
 * Poor 251-350, Very Poor 351-430, Severe 430+.
 * @type {Array<import("../types.js").BreakpointRow>}
 */
export const PM10_BREAKPOINTS = [
  {
    cLow: 0, // Lower concentration limit (µg/m³)
    cHigh: 50, // Upper concentration limit (µg/m³)
    iLow: 0, // Lower index limit
    iHigh: 50, // Upper index limit
    category: "Good", // CPCB category
  },
  {
    cLow: 51, // Lower concentration limit (µg/m³)
    cHigh: 100, // Upper concentration limit (µg/m³)
    iLow: 51, // Lower index limit
    iHigh: 100, // Upper index limit
    category: "Satisfactory", // CPCB category
  },
  {
    cLow: 101, // Lower concentration limit (µg/m³)
    cHigh: 250, // Upper concentration limit (µg/m³)
    iLow: 101, // Lower index limit
    iHigh: 200, // Upper index limit
    category: "Moderate", // CPCB category
  },
  {
    cLow: 251, // Lower concentration limit (µg/m³)
    cHigh: 350, // Upper concentration limit (µg/m³)
    iLow: 201, // Lower index limit
    iHigh: 300, // Upper index limit
    category: "Poor", // CPCB category
  },
  {
    cLow: 351, // Lower concentration limit (µg/m³)
    cHigh: 430, // Upper concentration limit (µg/m³)
    iLow: 301, // Lower index limit
    iHigh: 400, // Upper index limit
    category: "Very Poor", // CPCB category
  },
  {
    cLow: 431, // Lower concentration limit (µg/m³)
    cHigh: 500, // Upper concentration limit for 500 AQI scale (µg/m³)
    iLow: 401, // Lower index limit
    iHigh: 500, // Upper index limit
    category: "Severe", // CPCB category
  },
];
