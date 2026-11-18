import test from "node:test";
import assert from "node:assert/strict";
import {
  getCommunityChecklist,
  createBaselineNotice,
  COMMUNITY_TEMPLATES,
} from "../../web/js/engine/community.js";

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

test("getCommunityChecklist and createBaselineNotice handle fallback templates and safe defaults", () => {
  // Unknown community type falls back to RWA
  const fallbackList = getCommunityChecklist(
    /** @type {"rwa" | "school" | "mohalla"} */ ("unknown"),
    "Poor"
  );
  assert.ok(fallbackList.length >= 1);

  // Non-alert category returns empty list
  const emptyList = getCommunityChecklist("rwa", /** @type {any} */ ("Good"));
  assert.deepEqual(emptyList, []);

  // Baseline notice generation with fallback
  const notice = createBaselineNotice(
    /** @type {"rwa" | "school" | "mohalla"} */ ("unknown"),
    "Moderate",
    fallbackList
  );
  assert.ok(notice.whatsapp.includes("Air Quality Alert"));
  assert.ok(notice.email.includes("Management Committee"));
  assert.ok(notice.noticeBoard.includes("AIR ALERT"));
});
