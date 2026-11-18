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
  const css = calculateSteadyState({
    outdoorPm,
    penetration: p,
    ach: lambda,
    deposition: k,
    cadr,
    roomVolume: volume,
    sourceEmission: s,
  });
  assert.ok(Math.abs(css - 8.235) < 0.05);

  // Without purifier: cadr = 0
  // Denominator = 0.75
  // C_ss = 65 / 0.75 ≈ 86.67 µg/m³
  const cssNoPurifier = calculateSteadyState({
    outdoorPm,
    penetration: p,
    ach: lambda,
    deposition: k,
    cadr: 0,
    roomVolume: volume,
    sourceEmission: s,
  });
  assert.ok(Math.abs(cssNoPurifier - 86.67) < 0.05);
});

test("stepIndoorPm converges toward steady-state exponentially", () => {
  const outdoorPm = 200;
  const p = 0.65;
  const lambda = 0.5;
  const k = 0.25;
  const cadr = 250;
  const volume = 35;
  const css = calculateSteadyState({
    outdoorPm,
    penetration: p,
    ach: lambda,
    deposition: k,
    cadr,
    roomVolume: volume,
    sourceEmission: 0,
  });

  let current = 150; // Start far above steady-state
  for (let i = 0; i < 5; i++) {
    current = stepIndoorPm({
      currentIndoor: current,
      outdoorPm,
      penetration: p,
      ach: lambda,
      deposition: k,
      cadr,
      roomVolume: volume,
      sourceEmission: 0,
    });
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

test("simulateIndoorSeries handles custom source emissions and fallback profile defaults", () => {
  const outdoorSeries = Array(24).fill(100);
  const withSource = simulateIndoorSeries(outdoorSeries, /** @type {any} */ (undefined), {
    sourceEmission: 40,
  });
  assert.ok(withSource[0] > 0);

  /** @type {any} */
  const emptyProfile = { home: {} };
  const withEmpty = simulateIndoorSeries(outdoorSeries, emptyProfile);
  assert.equal(withEmpty.length, 24);

  /** @type {any} */
  const biomassProfile = { home: { cookingFuel: "biomass" } };
  const withBiomass = simulateIndoorSeries(outdoorSeries, biomassProfile);
  assert.equal(withBiomass.length, 24);
});

const DIURNAL = [
  180, 210, 240, 260, 280, 250, 220, 190, 160, 140, 130, 120, 110, 105, 100, 110, 130, 160, 200,
  240, 270, 290, 260, 220,
];

const S1_PARAMS = {
  outdoorPm: 25,
  penetration: 0.5,
  ach: 0.3,
  deposition: 0.25,
  cadr: 200,
  roomVolume: 35,
  sourceEmission: 0,
};
/** @type {any} */
const S1_PROF = {
  home: {
    type: "flat",
    tightness: "tight",
    windowsUsually: "closed",
    purifier: { has: true, cadr: 200 },
    cookingFuel: "lpg",
  },
};

const S2_PARAMS = {
  outdoorPm: 350,
  penetration: 0.65,
  ach: 0.5,
  deposition: 0.25,
  cadr: 300,
  roomVolume: 35,
  sourceEmission: 0,
};
/** @type {any} */
const S2_PROF = {
  home: {
    type: "flat",
    tightness: "average",
    windowsUsually: "closed",
    purifier: { has: true, cadr: 300 },
    cookingFuel: "lpg",
  },
};

const S3_PARAMS = {
  outdoorPm: 80,
  penetration: 0.65,
  ach: 0.5,
  deposition: 0.25,
  cadr: 0,
  roomVolume: 35,
  sourceEmission: 40,
};
/** @type {any} */
const S3_PROF = {
  home: {
    type: "flat",
    tightness: "average",
    windowsUsually: "closed",
    purifier: { has: false },
    cookingFuel: "lpg",
  },
};

test("characterisation: scenario 1 low pollution clean home", () => {
  const s1_css = calculateSteadyState(S1_PARAMS);
  assert.equal(s1_css, 0.5986316989737742);
  const s1_step = stepIndoorPm({ currentIndoor: 20, ...S1_PARAMS });
  assert.equal(s1_step, 0.6);
  const s1_series = simulateIndoorSeries(
    DIURNAL.map((v) => Math.round(v * 0.1)),
    S1_PROF,
    { cadr: 200 }
  );
  assert.deepEqual(
    s1_series,
    [
      0.3, 0.4, 0.4, 0.5, 0.5, 0.5, 0.4, 0.3, 0.3, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.4,
      0.4, 0.5, 0.5, 0.5, 0.4,
    ]
  );
});

test("characterisation: scenario 2 severe smog with purifier", () => {
  const s2_css = calculateSteadyState(S2_PARAMS);
  assert.equal(s2_css, 12.203065134099617);
  const s2_step = stepIndoorPm({ currentIndoor: 150, ...S2_PARAMS });
  assert.equal(s2_step, 12.2);
  const s2_series = simulateIndoorSeries(DIURNAL, S2_PROF, { cadr: 300 });
  assert.deepEqual(
    s2_series,
    [
      6.3, 7.3, 8.4, 9.1, 9.8, 8.7, 7.7, 6.6, 5.6, 4.9, 4.5, 4.2, 3.8, 3.7, 3.5, 3.8, 4.5, 5.6, 7,
      8.4, 9.4, 10.1, 9.1, 7.7,
    ]
  );
});

test("characterisation: scenario 3 moderate pollution cooking spike", () => {
  const s3_css = calculateSteadyState(S3_PARAMS);
  assert.equal(s3_css, 36.19047619047619);
  const s3_step = stepIndoorPm({ currentIndoor: 50, ...S3_PARAMS });
  assert.equal(s3_step, 42.7);
  const s3_series = simulateIndoorSeries(
    DIURNAL.map((v) => Math.round(v * 0.4)),
    S3_PROF,
    { sourceEmission: 40 }
  );
  assert.deepEqual(
    s3_series,
    [
      31.2, 33.9, 38, 41.7, 45.3, 44.3, 41, 36.7, 32.8, 28.3, 25.3, 22.9, 20.9, 20.3, 18.7, 18.9,
      20.8, 24.5, 29.9, 36.1, 42.5, 46.6, 45.8, 41.8,
    ]
  );
});
