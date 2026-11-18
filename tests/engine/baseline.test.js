import test from "node:test";
import assert from "node:assert/strict";
import { generateBaselinePlan } from "../../web/js/engine/baseline.js";
import { getSimulatedScenario } from "../../web/js/engine/scenarios.js";

const TEST_PROFILES = [
  {
    name: "Rural/Semi-urban with biomass cooking & infant",
    profile: {
      household: { members: [{ id: "1", label: "Baby", ageGroup: "infant", sensitive: false }] },
      home: {
        type: "house",
        tightness: "leaky",
        windowsUsually: "open",
        cookingFuel: "biomass",
        purifier: { has: false },
      },
      lifestyle: {
        commute: [{ mode: "two_wheeler", distanceKm: 10, daysPerWeek: 6 }],
        budgetBand: "zero",
      },
    },
  },
  {
    name: "Urban family with school-going child & LPG",
    profile: {
      household: { members: [{ id: "1", label: "Child", ageGroup: "child", sensitive: false }] },
      home: {
        type: "flat",
        tightness: "average",
        windowsUsually: "mixed",
        cookingFuel: "lpg",
        purifier: { has: false },
      },
      lifestyle: {
        commute: [{ mode: "car", distanceKm: 15, daysPerWeek: 5 }],
        budgetBand: "low",
        schoolStart: "08:00",
      },
    },
  },
  {
    name: "Senior with asthma, tight home, purifier already owned",
    profile: {
      household: {
        members: [{ id: "1", label: "Grandparent", ageGroup: "senior", sensitive: true }],
      },
      home: {
        type: "flat",
        tightness: "tight",
        windowsUsually: "closed",
        cookingFuel: "induction",
        purifier: { has: true, cadrM3h: 300 },
      },
      lifestyle: { commute: [], budgetBand: "high" },
    },
  },
  {
    name: "Zero-budget student apartment with WFH",
    profile: {
      household: { members: [{ id: "1", label: "Student", ageGroup: "adult", sensitive: false }] },
      home: {
        type: "flat",
        tightness: "average",
        windowsUsually: "open",
        cookingFuel: "lpg",
        purifier: { has: false },
      },
      lifestyle: { commute: [{ mode: "walk", distanceKm: 2, daysPerWeek: 5 }], budgetBand: "zero" },
    },
  },
];

test("generateBaselinePlan produces complete plan across all profile classes", () => {
  const scenario = getSimulatedScenario("PATNA_SEVERE");

  for (const { name, profile } of TEST_PROFILES) {
    const plan = generateBaselinePlan(/** @type {any} */ (profile), scenario);

    assert.ok(plan.summary.length > 20, `${name}: summary missing`);
    assert.ok(plan.headlineNAQI.aqi >= 400, `${name}: wrong severe NAQI`);
    assert.ok(plan.dayPlan.length >= 4, `${name}: dayPlan incomplete`);
    assert.ok(plan.rankedActions.length >= 1, `${name}: no ranked actions`);
    assert.equal(plan.topActions.length, 3, `${name}: topActions count mismatch`);
    assert.ok(plan.caveat.includes("not medical advice"), `${name}: caveat missing`);
  }
});

test("generateBaselinePlan handles Moderate and Good air categories", () => {
  const profile = TEST_PROFILES[0].profile;
  const modScenario = {
    times: Array(24).fill("2026-11-18T12:00"),
    pm25: Array(24).fill(75),
    pm10: Array(24).fill(150),
    meta: { model: "TEST", resolutionNote: "None", fetchedAt: "", attribution: "" },
  };
  const modPlan = generateBaselinePlan(/** @type {any} */ (profile), modScenario);
  assert.ok(modPlan.summary.includes("Moderate"));

  const goodScenario = {
    times: Array(24).fill("2026-11-18T12:00"),
    pm25: Array(24).fill(15),
    pm10: Array(24).fill(30),
    meta: { model: "TEST", resolutionNote: "None", fetchedAt: "", attribution: "" },
  };
  const goodPlan = generateBaselinePlan(/** @type {any} */ (profile), goodScenario);
  assert.ok(goodPlan.summary.includes("Good") || goodPlan.summary.includes("NAQI"));
});
