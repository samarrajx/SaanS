import test from "node:test";
import assert from "node:assert/strict";
import { ACTIONS_CATALOG } from "../../web/js/engine/actions.js";
import { rankActions, isWithinBudget } from "../../web/js/engine/rank.js";

test("ACTIONS_CATALOG contains valid schema for all catalog actions", () => {
  assert.ok(ACTIONS_CATALOG.length >= 10);
  for (const action of ACTIONS_CATALOG) {
    assert.ok(action.id);
    assert.ok(action.group);
    assert.ok(["₹0", "₹", "₹₹", "₹₹₹"].includes(action.costBand));
    assert.ok(["low", "medium", "high"].includes(action.effort));
    assert.equal(typeof action.isApplicable, "function");
    assert.ok(action.sourceCitation);
  }
});

test("isWithinBudget correctly filters cost bands", () => {
  assert.equal(isWithinBudget("₹0", "zero"), true);
  assert.equal(isWithinBudget("₹", "zero"), false);

  assert.equal(isWithinBudget("₹0", "low"), true);
  assert.equal(isWithinBudget("₹", "low"), true);
  assert.equal(isWithinBudget("₹₹", "low"), false);

  assert.equal(isWithinBudget("₹₹", "medium"), true);
  assert.equal(isWithinBudget("₹₹₹", "medium"), false);

  assert.equal(isWithinBudget("₹₹₹", "high"), true);
});

test("rankActions produces deterministic stable ordering", () => {
  /** @type {any} */
  const profile = {
    household: { members: [{ id: "1", label: "Self", ageGroup: "adult", sensitive: false }] },
    home: {
      type: "flat",
      tightness: "leaky",
      windowsUsually: "open",
      cookingFuel: "lpg",
      purifier: { has: false },
    },
    lifestyle: {
      commute: [{ memberId: "1", mode: "car", distanceKm: 20, daysPerWeek: 5 }],
      budgetBand: "medium",
    },
  };
  const airSeries = Array(24).fill(250);

  const run1 = rankActions(profile, airSeries);
  const run2 = rankActions(profile, airSeries);

  assert.equal(run1.length, run2.length);
  for (let i = 0; i < run1.length; i++) {
    assert.equal(run1[i].action.id, run2[i].action.id);
    assert.equal(run1[i].score, run2[i].score);
  }
});

test("rankActions handles missing lifestyle and zero cost bands cleanly", () => {
  /** @type {any} */
  const minimalProfile = {
    household: { members: [] },
    home: { type: "flat" },
  };
  const airSeries = Array(24).fill(150);
  const ranked = rankActions(minimalProfile, airSeries);
  assert.ok(ranked.length > 0);
  assert.equal(isWithinBudget("₹₹", "zero"), false);
  assert.equal(isWithinBudget(/** @type {any} */ ("unknown"), "zero"), true);
});
