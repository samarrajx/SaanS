import test from "node:test";
import assert from "node:assert/strict";
import { getSimulatedScenario, PRESET_SCENARIOS } from "../../web/js/engine/scenarios.js";
import { calculateNAQI } from "../../web/js/engine/naqi.js";

test("getSimulatedScenario returns fully structured data labeled Simulated", () => {
  const scenario = getSimulatedScenario("PATNA_SEVERE");
  assert.equal(scenario.label, "Simulated");
  assert.equal(scenario.location.name, "Patna, Bihar");
  assert.equal(scenario.times.length, 24);
  assert.equal(scenario.pm25.length, 24);
  assert.equal(scenario.pm10.length, 24);
  assert.equal(scenario.meta.attribution.includes("Simulated"), true);

  // Check diurnal curve: night/morning (hour 4) is higher than afternoon (hour 13)
  assert.ok(scenario.pm25[4] > scenario.pm25[13]);

  // Check 24-hr average headline NAQI
  const avg25 = scenario.pm25.reduce((a, b) => a + b, 0) / 24;
  const avg10 = scenario.pm10.reduce((a, b) => a + b, 0) / 24;
  const headline = calculateNAQI(avg25, avg10);
  assert.equal(headline.category, "Severe");
});

test("all preset scenarios generate valid non-empty series", () => {
  for (const key of Object.keys(PRESET_SCENARIOS)) {
    const s = getSimulatedScenario(/** @type {any} */ (key));
    assert.equal(s.pm25.length, 24);
    assert.ok(s.pm25.every((val) => typeof val === "number" && val > 0));
  }
});
