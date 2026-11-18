/**
 * @fileoverview Allowlisted immutable profile patching engine.
 * Applies permitted profile modifications, rejects unauthorized operations,
 * and generates human-readable diffs for transparency and undo capability.
 */

// Allowlisted patch operation types
export const ALLOWLISTED_OPERATIONS = [
  "set_commute_mode",
  "set_cooking_fuel",
  "set_purifier",
  "set_window_habit",
  "adopt_action",
  "drop_action",
  "add_reminder",
  "set_budget_band",
];

/**
 * Creates an immutable deep copy of a household profile.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {import("../types.js").HouseholdProfile}
 */
function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile));
}

/**
 * Handles home-related profile patches.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value: any }} patch
 * @returns {string}
 */
function applyHomePatch(clone, patch) {
  if (patch.op === "set_cooking_fuel") {
    const oldFuel = clone.home.cookingFuel;
    clone.home.cookingFuel = patch.value;
    return `Changed cooking fuel from ${oldFuel} to ${patch.value}`;
  }
  if (patch.op === "set_purifier") {
    clone.home.purifier = { has: Boolean(patch.value.has), cadrM3h: patch.value.cadrM3h || 250 };
    return `Updated purifier: ${patch.value.has ? "Active (CADR " + (patch.value.cadrM3h || 250) + " m³/h)" : "None"}`;
  }
  if (patch.op === "set_window_habit") {
    const oldHabit = clone.home.windowsUsually;
    clone.home.windowsUsually = patch.value;
    return `Updated window habit from ${oldHabit} to ${patch.value}`;
  }
  return "";
}

/**
 * Handles lifestyle and commute profile patches.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value: any }} patch
 * @returns {string}
 */
function applyLifestylePatch(clone, patch) {
  if (patch.op === "set_commute_mode") {
    const oldMode = clone.lifestyle.commute[0]?.mode || "car";
    if (!clone.lifestyle.commute[0]) {
      clone.lifestyle.commute.push({
        memberId: "default",
        mode: patch.value,
        distanceKm: 15,
        daysPerWeek: 5,
      });
    } else {
      clone.lifestyle.commute[0].mode = patch.value;
    }
    return `Changed commute mode from ${oldMode} to ${patch.value}`;
  }
  if (patch.op === "set_budget_band") {
    const oldBand = clone.lifestyle.budgetBand;
    clone.lifestyle.budgetBand = patch.value;
    return `Changed budget preference from ${oldBand} to ${patch.value}`;
  }
  return "";
}

/**
 * Handles action adoption and reminders.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value: any }} patch
 * @returns {string}
 */
function applyActionPatch(clone, patch) {
  if (patch.op === "adopt_action") {
    if (!clone.adoptedActions) clone.adoptedActions = [];
    if (!clone.adoptedActions.some((a) => a.actionId === patch.value)) {
      clone.adoptedActions.push({ actionId: patch.value, since: new Date().toISOString() });
    }
    return `Adopted action: ${patch.value}`;
  }
  if (patch.op === "drop_action") {
    clone.adoptedActions = (clone.adoptedActions || []).filter((a) => a.actionId !== patch.value);
    return `Removed adopted action: ${patch.value}`;
  }
  if (patch.op === "add_reminder") {
    if (!clone.reminders) clone.reminders = [];
    clone.reminders.push(patch.value);
    return `Added reminder: ${patch.value}`;
  }
  return "";
}

/**
 * Applies a single patch operation to a cloned profile.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value: any }} patch
 * @returns {string} Diff description
 */
function applySingleOp(clone, patch) {
  const homeDiff = applyHomePatch(clone, patch);
  if (homeDiff) return homeDiff;

  const lifestyleDiff = applyLifestylePatch(clone, patch);
  if (lifestyleDiff) return lifestyleDiff;

  const actionDiff = applyActionPatch(clone, patch);
  if (actionDiff) return actionDiff;

  throw new Error(`Unauthorized patch operation: ${patch.op}`);
}

/**
 * Applies an allowlisted patch to a household profile immutably.
 *
 * @param {import("../types.js").HouseholdProfile} currentProfile
 * @param {{ op: string, value: any }} patch
 * @returns {{ success: boolean, updatedProfile: import("../types.js").HouseholdProfile, diff: string, error?: string }}
 */
export function applyPatch(currentProfile, patch) {
  if (!patch || !ALLOWLISTED_OPERATIONS.includes(patch.op)) {
    return {
      success: false,
      updatedProfile: currentProfile,
      diff: "",
      error: `Rejected: operation "${patch?.op}" is not allowlisted`,
    };
  }

  try {
    const updated = cloneProfile(currentProfile);
    const diff = applySingleOp(updated, patch);
    return {
      success: true,
      updatedProfile: updated,
      diff,
    };
  } catch (err) {
    return {
      success: false,
      updatedProfile: currentProfile,
      diff: "",
      error: err instanceof Error ? err.message : "Patch failed",
    };
  }
}
