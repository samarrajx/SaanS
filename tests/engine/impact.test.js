import test from "node:test";
import assert from "node:assert/strict";
import { estimateImpact } from "../../web/js/engine/impact.js";
import { ACTIONS_CATALOG } from "../../web/js/engine/actions.js";

test("estimateImpact returns ranges and transparent assumptions", () => {
  /** @type {any} */
  const profile = {
    lifestyle: {
      commute: [{ memberId: "1", mode: "car", distanceKm: 15, daysPerWeek: 5 }],
      budgetBand: "medium",
    },
    home: { type: "flat", tightness: "average", windowsUsually: "closed", cookingFuel: "lpg" },
  };
  const airSeries = Array(24).fill(200);

  const metroAction = ACTIONS_CATALOG.find((a) => a.id === "switch_metro_bus");
  assert.ok(metroAction);
  const metroImpact = estimateImpact(metroAction, profile, airSeries);

  assert.ok(metroImpact.exposureChange.low <= metroImpact.exposureChange.central);
  assert.ok(metroImpact.exposureChange.central <= metroImpact.exposureChange.high);
  assert.ok(metroImpact.emissionsChange?.co2e);
  assert.ok(metroImpact.assumptions.length >= 1);
  assert.ok(["High", "Medium", "Low"].includes(metroImpact.confidence));
});

test("wear_n95_mask returns high confidence particulate filtration", () => {
  /** @type {any} */
  const profile = {};
  const airSeries = Array(24).fill(300);
  const maskAction = ACTIONS_CATALOG.find((a) => a.id === "wear_n95_mask");
  assert.ok(maskAction);

  const impact = estimateImpact(maskAction, profile, airSeries);
  assert.equal(impact.confidence, "High");
  assert.equal(impact.exposureChange.central, 90);
});
