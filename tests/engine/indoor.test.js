import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveACH,
  resolvePenetration,
  resolveRoomVolume,
  calculateSteadyState,
  stepIndoorPm,
  simulateIndoorSeries,
} from "../../web/js/engine/indoor.js";

test("resolveACH returns higher infiltration for open windows and leaky homes", () => {
  const closedTight = resolveACH("closed", "tight", "central");
  const closedAverage = resolveACH("closed", "average", "central");
  const closedLeaky = resolveACH("closed", "leaky", "central");
  const openWindows = resolveACH("open", "average", "central");

  assert.ok(closedTight < closedAverage);
  assert.ok(closedAverage < closedLeaky);
  assert.ok(closedLeaky < openWindows);
});

test("resolvePenetration reflects building envelope quality", () => {
  const pTight = resolvePenetration("tight", "central");
  const pAverage = resolvePenetration("average", "central");
  const pLeaky = resolvePenetration("leaky", "central");

  assert.ok(pTight < pAverage);
  assert.ok(pAverage < pLeaky);
});

test("resolveRoomVolume defaults by home type or honors custom volume", () => {
  /** @type {any} */
  const flatProfile = { home: { type: "flat" } };
  assert.equal(resolveRoomVolume(flatProfile), 35);

  /** @type {any} */
  const houseProfile = { home: { type: "house" } };
  assert.equal(resolveRoomVolume(houseProfile), 65);

  /** @type {any} */
  const customProfile = { home: { roomVolumeM3: 80 } };
  assert.equal(resolveRoomVolume(customProfile), 80);
});

test("calculateSteadyState matches closed-form analytical solution", () => {
  const outdoorPm = 200;
  const p = 0.65;
  const lambda = 0.5;
  const k = 0.25;
  const cadr = 250;
  const volume = 35;
  const s = 0;

  // Expected C_ss = (0.65 * 0.5 * 200) / (0.5 + 0.25 + 250/35)
  // Numerator = 65
  // Denominator = 0.75 + 7.142857 = 7.892857
  // C_ss = 65 / 7.892857 ≈ 8.235 µg/m³
  const css = calculateSteadyState(outdoorPm, p, lambda, k, cadr, volume, s);
  assert.ok(Math.abs(css - 8.235) < 0.05);

  // Without purifier: cadr = 0
  // Denominator = 0.75
  // C_ss = 65 / 0.75 ≈ 86.67 µg/m³
  const cssNoPurifier = calculateSteadyState(outdoorPm, p, lambda, k, 0, volume, s);
  assert.ok(Math.abs(cssNoPurifier - 86.67) < 0.05);
});

test("stepIndoorPm converges toward steady-state exponentially", () => {
  const outdoorPm = 200;
  const p = 0.65;
  const lambda = 0.5;
  const k = 0.25;
  const cadr = 250;
  const volume = 35;
  const css = calculateSteadyState(outdoorPm, p, lambda, k, cadr, volume, 0);

  let current = 150; // Start far above steady-state
  for (let i = 0; i < 5; i++) {
    current = stepIndoorPm(current, outdoorPm, p, lambda, k, cadr, volume, 0);
  }
  // After 5 hours with effective loss rate ~7.89 h⁻¹, it must converge very close to C_ss
  assert.ok(Math.abs(current - css) < 0.1);
});

test("simulateIndoorSeries proves purifier substantially reduces indoor PM2.5", () => {
  const outdoorSeries = Array(24).fill(250); // Severe outdoor air

  /** @type {any} */
  const baseProfile = {
    home: {
      type: "flat",
      tightness: "average",
      windowsUsually: "closed",
      cookingFuel: "lpg",
      purifier: { has: false },
    },
  };

  const indoorWithout = simulateIndoorSeries(outdoorSeries, baseProfile);
  const indoorWith = simulateIndoorSeries(outdoorSeries, baseProfile, { cadr: 300 });

  // With a 300 CADR purifier, average indoor PM should be dramatically lower than without
  const avgWithout = indoorWithout.reduce((a, b) => a + b, 0) / 24;
  const avgWith = indoorWith.reduce((a, b) => a + b, 0) / 24;

  assert.ok(avgWith < avgWithout * 0.25); // At least 75% reduction
});
