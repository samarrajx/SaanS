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
 * Updates purifier configuration on the household profile clone.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {unknown} value
 * @returns {string}
 */
function updatePurifierState(clone, value) {
  const purifierVal = /** @type {{ has?: boolean, cadrM3h?: number } | null | undefined} */ (value);
  const hasPurifier = Boolean(purifierVal && purifierVal.has);
  const cadr = purifierVal && purifierVal.cadrM3h ? purifierVal.cadrM3h : 250;
  clone.home.purifier = { has: hasPurifier, cadrM3h: cadr };
  const desc = hasPurifier ? `Active (CADR ${cadr} m³/h)` : "None";
  return `Updated purifier: ${desc}`;
}

/**
 * Handles home-related profile patches.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value?: unknown }} patch
 * @returns {string}
 */
function applyHomePatch(clone, patch) {
  if (patch.op === "set_cooking_fuel") {
    const oldFuel = clone.home.cookingFuel;
    clone.home.cookingFuel = /** @type {import("../types.js").CookingFuel} */ (patch.value);
    return `Changed cooking fuel from ${oldFuel} to ${patch.value}`;
  }
  if (patch.op === "set_purifier") {
    return updatePurifierState(clone, patch.value);
  }
  if (patch.op === "set_window_habit") {
    const oldHabit = clone.home.windowsUsually;
    clone.home.windowsUsually = /** @type {import("../types.js").WindowHabit} */ (patch.value);
    return `Updated window habit from ${oldHabit} to ${patch.value}`;
  }
  return "";
}

/**
 * Handles lifestyle and commute profile patches.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value?: unknown }} patch
 * @returns {string}
 */
function applyLifestylePatch(clone, patch) {
  if (patch.op === "set_commute_mode") {
    const oldMode = clone.lifestyle.commute[0]?.mode || "car";
    if (!clone.lifestyle.commute[0]) {
      clone.lifestyle.commute.push({
        memberId: "default",
        mode: /** @type {import("../types.js").CommuteMode} */ (patch.value),
        distanceKm: 15,
        daysPerWeek: 5,
      });
    } else {
      clone.lifestyle.commute[0].mode = /** @type {import("../types.js").CommuteMode} */ (
        patch.value
      );
    }
    return `Changed commute mode from ${oldMode} to ${patch.value}`;
  }
  if (patch.op === "set_budget_band") {
    const oldBand = clone.lifestyle.budgetBand;
    clone.lifestyle.budgetBand = /** @type {import("../types.js").BudgetBand} */ (patch.value);
    return `Changed budget preference from ${oldBand} to ${patch.value}`;
  }
  return "";
}

/**
 * Handles action adoption and reminders.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value?: unknown }} patch
 * @returns {string}
 */
function applyActionPatch(clone, patch) {
  if (patch.op === "adopt_action") {
    if (!clone.adoptedActions) clone.adoptedActions = [];
    if (!clone.adoptedActions.some((a) => a.actionId === patch.value)) {
      clone.adoptedActions.push({
        actionId: String(patch.value),
        since: new Date().toISOString(),
      });
    }
    return `Adopted action: ${patch.value}`;
  }
  if (patch.op === "drop_action") {
    clone.adoptedActions = (clone.adoptedActions || []).filter((a) => a.actionId !== patch.value);
    return `Removed adopted action: ${patch.value}`;
  }
  if (patch.op === "add_reminder") {
    if (!clone.reminders) clone.reminders = [];
    clone.reminders.push(String(patch.value));
    return `Added reminder: ${patch.value}`;
  }
  return "";
}

/**
 * Applies a single patch operation to a cloned profile.
 * @param {import("../types.js").HouseholdProfile} clone
 * @param {{ op: string, value?: unknown }} patch
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
 * @param {{ op: string, value?: unknown }} patch
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
