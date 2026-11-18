/**
 * @fileoverview Transparent parameter assumptions for physical and exposure models.
 * Every parameter includes low, central, and high estimates, units, and citation.
 * Unsourced values are strictly labeled "typical range (assumption)".
 */

/**
 * @typedef {Object} ModelParameter
 * @property {number} low - Lower bound
 * @property {number} central - Best central estimate
 * @property {number} high - Upper bound
 * @property {string} unit - Measurement unit
 * @property {string} source - Literature citation or "typical range (assumption)"
 * @property {string} description - Brief explanatory description
 */

/**
 * Envelope penetration factor P (fraction of ambient PM2.5 penetrating envelope).
 * @type {Record<import("../types.js").HomeTightness, ModelParameter>}
 */
export const PENETRATION_FACTOR = {
  leaky: {
    low: 0.7,
    central: 0.8,
    high: 0.9,
    unit: "dimensionless",
    source: "typical range (assumption)",
    description: "Fraction of outdoor PM2.5 entering through cracks in leaky envelopes",
  },
  average: {
    low: 0.5,
    central: 0.65,
    high: 0.75,
    unit: "dimensionless",
    source: "typical range (assumption)",
    description: "Fraction of outdoor PM2.5 entering average urban residential envelope",
  },
  tight: {
    low: 0.3,
    central: 0.45,
    high: 0.55,
    unit: "dimensionless",
    source: "typical range (assumption)",
    description: "Fraction of outdoor PM2.5 entering weather-sealed / tight building envelope",
  },
};

/**
 * Air exchange rate λ in air changes per hour (ACH, h⁻¹).
 * @type {Record<string, ModelParameter>}
 */
export const AIR_EXCHANGE_RATE = {
  closed_leaky: {
    low: 0.7,
    central: 0.9,
    high: 1.2,
    unit: "h⁻¹",
    source: "typical range (assumption)",
    description: "Air infiltration rate with windows closed in older or unsealed construction",
  },
  closed_average: {
    low: 0.35,
    central: 0.5,
    high: 0.7,
    unit: "h⁻¹",
    source: "typical range (assumption)",
    description: "Air infiltration rate with windows closed in standard apartment/house",
  },
  closed_tight: {
    low: 0.15,
    central: 0.25,
    high: 0.35,
    unit: "h⁻¹",
    source: "typical range (assumption)",
    description: "Infiltration rate in weather-stripped or modern well-sealed building",
  },
  windows_open: {
    low: 2.0,
    central: 3.5,
    high: 5.0,
    unit: "h⁻¹",
    source: "typical range (assumption)",
    description: "Natural ventilation rate with windows open across cross-breeze",
  },
  windows_mixed: {
    low: 1.0,
    central: 1.5,
    high: 2.2,
    unit: "h⁻¹",
    source: "typical range (assumption)",
    description: "Partial ventilation with select windows cracked open intermittently",
  },
};

/**
 * PM2.5 surface deposition loss rate k (h⁻¹).
 * @type {ModelParameter}
 */
export const PM25_DEPOSITION_RATE = {
  low: 0.15,
  central: 0.25,
  high: 0.4,
  unit: "h⁻¹",
  source: "typical range (assumption)",
  description: "Natural gravitational settling and surface deposition rate for fine particulate",
};

/**
 * Default indoor room volumes in cubic meters (m³).
 * @type {Record<import("../types.js").HomeType, ModelParameter>}
 */
export const DEFAULT_ROOM_VOLUME = {
  flat: {
    low: 28,
    central: 35,
    high: 45,
    unit: "m³",
    source: "typical range (assumption)",
    description: "Average Indian apartment primary bedroom / living room space (12m² × 2.9m)",
  },
  house: {
    low: 50,
    central: 65,
    high: 85,
    unit: "m³",
    source: "typical range (assumption)",
    description: "Average independent house living/hall area",
  },
};

/**
 * Indoor source PM2.5 emission rates S (µg/h).
 * @type {Record<string, ModelParameter>}
 */
export const INDOOR_SOURCE_EMISSIONS = {
  cooking_lpg: {
    low: 1500,
    central: 3000,
    high: 5000,
    unit: "µg/h",
    source: "typical range (assumption)",
    description: "PM2.5 generation during high-heat frying or tadka on LPG without strong exhaust",
  },
  cooking_biomass: {
    low: 25000,
    central: 45000,
    high: 80000,
    unit: "µg/h",
    source: "typical range (assumption)",
    description: "PM2.5 generation during indoor solid fuel / biomass chulha combustion",
  },
  incense_stick: {
    low: 1200,
    central: 2000,
    high: 3500,
    unit: "µg/h",
    source: "typical range (assumption)",
    description: "Hourly average fine particulate release from burning agarbatti / incense",
  },
  mosquito_coil: {
    low: 1800,
    central: 3000,
    high: 4500,
    unit: "µg/h",
    source: "typical range (assumption)",
    description: "Combustion particulate release from standard insecticide mosquito coil",
  },
};
