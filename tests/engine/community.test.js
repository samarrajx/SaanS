import test from "node:test";
import assert from "node:assert/strict";
import { getCommunityChecklist, COMMUNITY_TEMPLATES } from "../../web/js/engine/community.js";

test("COMMUNITY_TEMPLATES has definitions for rwa, school, and mohalla", () => {
  assert.ok(COMMUNITY_TEMPLATES.rwa);
  assert.ok(COMMUNITY_TEMPLATES.school);
  assert.ok(COMMUNITY_TEMPLATES.mohalla);
});

test("getCommunityChecklist returns tiered items and accumulates on Severe", () => {
  const rwaPoor = getCommunityChecklist("rwa", "Poor");
  assert.ok(rwaPoor.length >= 1);

  const rwaVeryPoor = getCommunityChecklist("rwa", "Very Poor");
  assert.ok(rwaVeryPoor.length >= 2);

  const rwaSevere = getCommunityChecklist("rwa", "Severe");
  // Cumulative items from Very Poor + Severe
  assert.ok(rwaSevere.length > rwaVeryPoor.length);

  const schoolSevere = getCommunityChecklist("school", "Severe");
  assert.ok(schoolSevere.some((item) => item.text.includes("online schooling")));
});
