/**
 * @fileoverview Shared JSDoc type definitions for Saans.
 * Loaded by TypeScript via tsconfig.json checkJs mode.
 */

/**
 * @typedef {"Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe"} AQICategory
 */

/**
 * @typedef {"en" | "hi" | "hinglish"} LanguageCode
 */

/**
 * @typedef {"infant" | "child" | "adult" | "senior"} AgeGroup
 */

/**
 * @typedef {"flat" | "house"} HomeType
 */

/**
 * @typedef {"leaky" | "average" | "tight"} HomeTightness
 */

/**
 * @typedef {"open" | "mixed" | "closed"} WindowHabit
 */

/**
 * @typedef {"lpg" | "induction" | "biomass" | "other"} CookingFuel
 */

/**
 * @typedef {"none" | "electric" | "biomass" | "coal" | "other"} HeatingType
 */

/**
 * @typedef {"walk" | "cycle" | "metro" | "bus" | "auto" | "two_wheeler" | "car" | "wfh"} CommuteMode
 */

/**
 * @typedef {"zero" | "low" | "medium" | "high"} BudgetBand
 */

/**
 * @typedef {"routine" | "indoor" | "commute" | "cooking" | "heating" | "waste" | "community"} ActionGroup
 */

/**
 * @typedef {"High" | "Medium" | "Low"} ConfidenceLevel
 */

/**
 * @typedef {Object} BreakpointRow
 * @property {number} cLow - Concentration lower bound (inclusive)
 * @property {number} cHigh - Concentration upper bound (inclusive)
 * @property {number} iLow - Index lower bound
 * @property {number} iHigh - Index upper bound
 * @property {AQICategory} category - Category label
 */

/**
 * @typedef {Object} SubIndexResult
 * @property {number} subIndex - Calculated sub-index (0-500)
 * @property {AQICategory} category - Category name
 * @property {string} pollutant - Pollutant key ("pm25" | "pm10")
 */

/**
 * @typedef {Object} NAQIResult
 * @property {number} aqi - Final AQI value (rounded integer)
 * @property {AQICategory} category - Category name
 * @property {string} dominantPollutant - Dominant pollutant ("pm25" | "pm10")
 * @property {number} pm25SubIndex - Sub-index for PM2.5
 * @property {number} pm10SubIndex - Sub-index for PM10
 */

/**
 * @typedef {Object} HourlySeries
 * @property {string[]} times - ISO datetime strings
 * @property {number[]} pm25 - Hourly PM2.5 in µg/m³
 * @property {number[]} pm10 - Hourly PM10 in µg/m³
 * @property {Object} meta
 * @property {string} meta.model - Model name
 * @property {string} meta.resolutionNote - Spatial resolution note
 * @property {string} meta.fetchedAt - Fetch timestamp
 * @property {string} meta.attribution - Required attribution string
 */

/**
 * @typedef {Object} HouseholdMember
 * @property {string} id - Unique member identifier
 * @property {string} label - Display label (e.g. "Toddler", "Grandparent")
 * @property {AgeGroup} ageGroup - Age group
 * @property {boolean} sensitive - Generic sensitive flag (no medical diagnosis)
 */

/**
 * @typedef {Object} CommuteEntry
 * @property {string} memberId - Associated member ID
 * @property {CommuteMode} mode - Transport mode
 * @property {number} distanceKm - One-way distance in km
 * @property {number} daysPerWeek - Weekly frequency
 */

/**
 * @typedef {Object} HouseholdProfile
 * @property {number} schemaVersion - Profile schema version
 * @property {LanguageCode} language - UI language
 * @property {string} units - Measurement units ("metric")
 * @property {Object} location
 * @property {string} location.name - City/area name
 * @property {number} location.lat - Latitude (rounded)
 * @property {number} location.lon - Longitude (rounded)
 * @property {string} location.timezone - Timezone name
 * @property {Object} household
 * @property {HouseholdMember[]} household.members - Household members
 * @property {Object} home
 * @property {HomeType} home.type - Dwelling type
 * @property {HomeTightness} home.tightness - Air leakage level
 * @property {WindowHabit} home.windowsUsually - Typical window habit
 * @property {CookingFuel} home.cookingFuel - Primary cooking fuel
 * @property {HeatingType} home.heating - Space heating type
 * @property {{ has: boolean, cadrM3h?: number }} home.purifier - Purifier specs
 * @property {number} [home.roomVolumeM3] - Primary room volume in m³
 * @property {Object} lifestyle
 * @property {CommuteEntry[]} lifestyle.commute - Commute items
 * @property {string[]} lifestyle.vehicles - Vehicle types owned
 * @property {BudgetBand} lifestyle.budgetBand - Willingness to spend
 * @property {string} [lifestyle.schoolStart] - School morning time "HH:MM"
 * @property {string} [lifestyle.workStart] - Work start time "HH:MM"
 * @property {string} [lifestyle.exercisePreference] - "morning" | "evening" | "none"
 * @property {Array<{ actionId: string, since: string }>} adoptedActions
 * @property {string[]} reminders
 * @property {Array<{ id: string, text: string, date: string }>} loggedWins
 * @property {boolean} [isDemo] - Whether demo mode is active
 */

/**
 * @typedef {Object} ImpactRange
 * @property {number} low - Conservative estimate
 * @property {number} central - Central estimate
 * @property {number} high - Optimistic estimate
 * @property {string} unit - Unit string (e.g. "µg/m³", "%")
 */

/**
 * @typedef {Object} ImpactEstimate
 * @property {ImpactRange} exposureChange - Reduction in exposure (positive = reduction)
 * @property {Object} [emissionsChange] - Avoided emissions
 * @property {ImpactRange} [emissionsChange.co2e] - CO2e reduction in kg
 * @property {ImpactRange} [emissionsChange.pm] - PM reduction in g
 * @property {string} [emissionsChange.direction] - "lower" if unquantified
 * @property {string[]} assumptions - Plain-language list of assumptions
 * @property {ConfidenceLevel} confidence - Confidence grade
 */

/**
 * @typedef {Object} ActionDefinition
 * @property {string} id - Unique action key
 * @property {ActionGroup} group - Categorisation group
 * @property {string} title - English title key
 * @property {"₹0" | "₹" | "₹₹" | "₹₹₹"} costBand - Cost indicator
 * @property {"low" | "medium" | "high"} effort - Effort indicator
 * @property {(profile: HouseholdProfile) => boolean} isApplicable - Profile applicability
 * @property {string} evidenceTier - "established" | "model_estimate"
 * @property {string} sourceCitation - Citation or "typical range (assumption)"
 */

/**
 * @typedef {Object} DayBlock
 * @property {string} id - Block ID
 * @property {string} startHour - "HH:00"
 * @property {string} endHour - "HH:00"
 * @property {string} type - "outdoor" | "ventilate" | "commute" | "cook" | "exercise" | "close"
 * @property {string} titleKey - Localization key
 * @property {string} reasonKey - Localization key
 * @property {string} [actionId] - Linked catalog action
 * @property {number} outdoorPm - Forecast PM2.5 in block
 */

// Export dummy constant so this file is recognized as an ES module
export const TYPES_VERSION = 1;
