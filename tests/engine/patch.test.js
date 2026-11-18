import test from "node:test";
import assert from "node:assert/strict";
import { applyPatch, ALLOWLISTED_OPERATIONS } from "../../web/js/engine/patch.js";

test("applyPatch rejects unauthorized non-allowlisted operations", () => {
  /** @type {any} */
  const profile = { home: { cookingFuel: "lpg" } };
  const res = applyPatch(profile, { op: "delete_account", value: true });

  assert.equal(res.success, false);
  assert.ok(res.error?.includes("not allowlisted"));
  assert.equal(profile.home.cookingFuel, "lpg");
});

test("applyPatch mutates copy immutably and returns clear diff", () => {
  /** @type {any} */
  const original = {
    home: { cookingFuel: "lpg", windowsUsually: "open", purifier: { has: false } },
    lifestyle: { commute: [{ mode: "car" }], budgetBand: "low" },
    adoptedActions: [],
  };

  // Change cooking fuel
  const res1 = applyPatch(original, { op: "set_cooking_fuel", value: "induction" });
  assert.equal(res1.success, true);
  assert.equal(res1.updatedProfile.home.cookingFuel, "induction");
  assert.equal(original.home.cookingFuel, "lpg"); // Immutability verified
  assert.ok(res1.diff.includes("Changed cooking fuel"));

  // Adopt action
  const res2 = applyPatch(res1.updatedProfile, {
    op: "adopt_action",
    value: "weatherstrip_windows",
  });
  assert.equal(res2.success, true);
  assert.equal(res2.updatedProfile.adoptedActions.length, 1);
  assert.equal(res2.updatedProfile.adoptedActions[0].actionId, "weatherstrip_windows");

  // Drop action
  const res3 = applyPatch(res2.updatedProfile, {
    op: "drop_action",
    value: "weatherstrip_windows",
  });
  assert.equal(res3.success, true);
  assert.equal(res3.updatedProfile.adoptedActions.length, 0);
});

test("all ALLOWLISTED_OPERATIONS succeed with valid payloads", () => {
  /** @type {any} */
  const base = {
    home: { cookingFuel: "lpg", windowsUsually: "open", purifier: { has: false } },
    lifestyle: { commute: [], budgetBand: "low" },
    adoptedActions: [],
    reminders: [],
  };

  for (const op of ALLOWLISTED_OPERATIONS) {
    let value = "test";
    if (op === "set_purifier") value = /** @type {any} */ ({ has: true, cadrM3h: 300 });
    const res = applyPatch(base, { op, value });
    assert.equal(res.success, true, `Operation ${op} failed`);
  }
});

test("applyPatch handles purifier defaults and falsy values", () => {
  /** @type {any} */
  const base = {
    home: { purifier: { has: true, cadrM3h: 300 } },
    lifestyle: { commute: [] },
  };
  const offRes = applyPatch(base, { op: "set_purifier", value: { has: false } });
  assert.equal(offRes.updatedProfile.home.purifier.has, false);

  const defaultCadrRes = applyPatch(base, { op: "set_purifier", value: { has: true } });
  assert.equal(defaultCadrRes.updatedProfile.home.purifier.cadrM3h, 250);
});

test("applyPatch handles empty commute, duplicate actions, and reminders", () => {
  /** @type {any} */
  const base = {
    home: {},
    lifestyle: { commute: [] },
  };
  // Commute mode on empty commute array
  const commRes = applyPatch(base, { op: "set_commute_mode", value: "metro" });
  assert.equal(commRes.updatedProfile.lifestyle.commute[0].mode, "metro");

  // Duplicate adopt_action
  const adopt1 = applyPatch(base, { op: "adopt_action", value: "act1" });
  const adopt2 = applyPatch(adopt1.updatedProfile, { op: "adopt_action", value: "act1" });
  assert.equal(adopt2.updatedProfile.adoptedActions.length, 1);

  // drop_action when undefined
  const dropRes = applyPatch(base, { op: "drop_action", value: "none" });
  assert.equal(dropRes.updatedProfile.adoptedActions.length, 0);

  // add_reminder when undefined
  const remRes = applyPatch(base, { op: "add_reminder", value: "Check filter" });
  assert.equal(remRes.updatedProfile.reminders.length, 1);
});
