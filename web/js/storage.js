/**
 * @fileoverview Robust Local Storage Management for Household Profiles.
 * Versioned schema, corruption recovery, debounced writes (300ms),
 * and pagehide/visibilitychange flush handlers.
 */

// Storage constants
export const STORAGE_KEY = "saans_profile_v1"; // LocalStorage namespace
export const CURRENT_SCHEMA_VERSION = 1; // Current schema version
const WRITE_DEBOUNCE_MS = 300; // Debounce window for writes

/** @type {any} */
let debounceTimer = null;
/** @type {import("./types.js").HouseholdProfile | null} */
let pendingProfile = null;

/**
 * Returns a clean default profile structure.
 * @returns {import("./types.js").HouseholdProfile}
 */
export function getDefaultProfile() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    language: "en",
    units: "metric",
    location: {
      name: "Patna, Bihar",
      lat: 25.59,
      lon: 85.14,
      timezone: "Asia/Kolkata",
    },
    household: {
      members: [{ id: "m1", label: "Self", ageGroup: "adult", sensitive: false }],
    },
    home: {
      type: "flat",
      tightness: "average",
      windowsUsually: "mixed",
      cookingFuel: "lpg",
      heating: "none",
      purifier: { has: false },
      roomVolumeM3: 35,
    },
    lifestyle: {
      commute: [{ memberId: "m1", mode: "car", distanceKm: 12, daysPerWeek: 5 }],
      vehicles: ["car"],
      budgetBand: "low",
      exercisePreference: "none",
    },
    adoptedActions: [],
    reminders: [],
    loggedWins: [],
  };
}

/**
 * Validates and migrates profile data.
 * @param {any} raw
 * @returns {import("./types.js").HouseholdProfile}
 */
export function validateAndMigrateProfile(raw) {
  if (!raw || typeof raw !== "object" || !raw.household || !raw.location) {
    return getDefaultProfile();
  }
  return {
    ...getDefaultProfile(),
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Loads the stored profile safely, surviving corruption or missing storage.
 * @returns {import("./types.js").HouseholdProfile}
 */
export function loadProfile() {
  if (typeof window === "undefined" || !window.localStorage) {
    return getDefaultProfile();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProfile();
    const parsed = JSON.parse(raw);
    return validateAndMigrateProfile(parsed);
  } catch {
    console.warn("Recovered from corrupt local storage; loaded defaults");
    return getDefaultProfile();
  }
}

/**
 * Writes pending profile immediately to localStorage.
 * @returns {void}
 */
export function flushStorage() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!pendingProfile || typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingProfile));
  } catch (err) {
    console.warn("Storage write failed (quota exceeded?):", err);
  }
}

/**
 * Saves profile with 300ms debounce.
 * @param {import("./types.js").HouseholdProfile} profile
 * @returns {void}
 */
export function saveProfile(profile) {
  pendingProfile = profile;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    flushStorage();
  }, WRITE_DEBOUNCE_MS);
}

/**
 * Deletes all stored user profile data and resets to defaults.
 * @returns {import("./types.js").HouseholdProfile}
 */
export function clearProfile() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  pendingProfile = null;
  return getDefaultProfile();
}

// Bind flush to page lifecycle events
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushStorage);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushStorage();
  });
}
