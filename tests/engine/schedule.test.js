import test from "node:test";
import assert from "node:assert/strict";
import { buildDaySchedule } from "../../web/js/engine/schedule.js";

test("buildDaySchedule generates contiguous blocks linked to actions", () => {
  /** @type {any} */
  const profile = {
    household: {
      members: [{ id: "1", label: "Kid", ageGroup: "child", sensitive: false }],
    },
    lifestyle: { schoolStart: "08:00" },
  };
  const airSeries = Array(24).fill(180);
  airSeries[13] = 70; // Clean afternoon window

  const schedule = buildDaySchedule(profile, airSeries, false);
  assert.ok(schedule.length >= 4);

  const blockTypes = schedule.map((b) => b.type);
  assert.ok(blockTypes.includes("close"));
  assert.ok(blockTypes.includes("commute"));
  assert.ok(blockTypes.includes("ventilate"));
  assert.ok(blockTypes.includes("exercise"));

  for (const block of schedule) {
    assert.ok(block.startHour);
    assert.ok(block.endHour);
    assert.ok(block.titleKey);
    assert.ok(block.reasonKey);
    assert.ok(block.actionId);
    assert.equal(typeof block.outdoorPm, "number");
  }
});
