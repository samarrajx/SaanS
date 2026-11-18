import test from "node:test";
import assert from "node:assert/strict";
import {
  hasSensitiveMembers,
  findPeakPollutionHours,
  findBestOutdoorWindow,
  findVentilationWindow,
} from "../../web/js/engine/exposure.js";

test("hasSensitiveMembers detects infants, seniors, or sensitive flag", () => {
  /** @type {any} */
  const generalProfile = {
    household: {
      members: [
        { id: "1", label: "Adult", ageGroup: "adult", sensitive: false },
        { id: "2", label: "Child", ageGroup: "child", sensitive: false },
      ],
    },
  };
  assert.equal(hasSensitiveMembers(generalProfile), false);

  /** @type {any} */
  const infantProfile = {
    household: {
      members: [{ id: "1", label: "Baby", ageGroup: "infant", sensitive: false }],
    },
  };
  assert.equal(hasSensitiveMembers(infantProfile), true);

  /** @type {any} */
  const seniorProfile = {
    household: {
      members: [{ id: "1", label: "Grandparent", ageGroup: "senior", sensitive: false }],
    },
  };
  assert.equal(hasSensitiveMembers(seniorProfile), true);

  /** @type {any} */
  const asthmaProfile = {
    household: {
      members: [{ id: "1", label: "Adult", ageGroup: "adult", sensitive: true }],
    },
  };
  assert.equal(hasSensitiveMembers(asthmaProfile), true);
});

test("findPeakPollutionHours returns indices of highest hours", () => {
  const series = Array(24).fill(50);
  series[7] = 300; // 07:00 morning peak
  series[8] = 320; // 08:00 morning peak
  series[20] = 350; // 20:00 evening peak
  series[21] = 340; // 21:00 evening peak

  const peaks = findPeakPollutionHours(series);
  assert.equal(peaks.length, 4);
  assert.ok(peaks.includes(7));
  assert.ok(peaks.includes(8));
  assert.ok(peaks.includes(20));
  assert.ok(peaks.includes(21));
});

test("findBestOutdoorWindow identifies lowest PM window and checks sensitivity", () => {
  // PM is lowest around 13:00 - 15:00
  const series = Array(24).fill(120);
  series[13] = 40;
  series[14] = 45;

  const standardResult = findBestOutdoorWindow(series, false);
  assert.equal(standardResult.startHour, 13);
  assert.equal(standardResult.endHour, 15);
  assert.equal(standardResult.averagePm, 42.5);
  assert.equal(standardResult.acceptable, true); // <= 60 is acceptable for general

  const sensitiveResult = findBestOutdoorWindow(series, true);
  assert.equal(sensitiveResult.startHour, 13);
  assert.equal(sensitiveResult.endHour, 15);
  assert.equal(sensitiveResult.acceptable, false); // 42.5 > 30 is not acceptable for sensitive
});

test("findVentilationWindow finds cleanest afternoon hour", () => {
  const series = Array(24).fill(200);
  series[14] = 95; // Afternoon dip at 14:00

  const vent = findVentilationWindow(series);
  assert.equal(vent.hour, 14);
  assert.equal(vent.pm, 95);
  assert.equal(vent.safeToVentilate, true);

  // If even the minimum is hazardous (> 150)
  const hazardousSeries = Array(24).fill(300);
  hazardousSeries[13] = 220;
  const hazVent = findVentilationWindow(hazardousSeries);
  assert.equal(hazVent.safeToVentilate, false);
});
