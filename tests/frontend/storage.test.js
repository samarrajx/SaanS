import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultProfile,
  validateAndMigrateProfile,
  CURRENT_SCHEMA_VERSION,
} from "../../web/js/storage.js";

test("getDefaultProfile produces valid version 1 structure", () => {
  const profile = getDefaultProfile();
  assert.equal(profile.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(profile.language, "en");
  assert.equal(profile.location.name, "Patna, Bihar");
  assert.equal(profile.household.members.length, 1);
  assert.equal(profile.home.type, "flat");
});

test("validateAndMigrateProfile repairs missing or corrupt data gracefully", () => {
  // Empty or null
  const fallback = validateAndMigrateProfile(null);
  assert.equal(fallback.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(fallback.location.name, "Patna, Bihar");

  // Partial profile missing schemaVersion
  const partial = {
    location: { name: "Delhi", lat: 28.61, lon: 77.21, timezone: "Asia/Kolkata" },
    household: { members: [] },
  };
  const migrated = validateAndMigrateProfile(partial);
  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(migrated.location.name, "Delhi");
  assert.ok(migrated.home); // Repaired with default home
});
