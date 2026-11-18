import test from "node:test";
import assert from "node:assert/strict";
import { en } from "../../web/js/locales/en.js";
import { hi } from "../../web/js/locales/hi.js";
import { hinglish } from "../../web/js/locales/hinglish.js";

test("Locales key completeness: all en keys must exist in hi and hinglish", () => {
  const enKeys = Object.keys(en);
  const hiKeys = new Set(Object.keys(hi));
  const hinglishKeys = new Set(Object.keys(hinglish));

  assert.ok(enKeys.length >= 40, "Locale dictionary too small");

  for (const key of enKeys) {
    assert.ok(hiKeys.has(key), `Missing key in Hindi locale: "${key}"`);
    assert.ok(hinglishKeys.has(key), `Missing key in Hinglish locale: "${key}"`);

    // Ensure values are non-empty strings
    assert.ok(/** @type {any} */ (en)[key]?.length > 0);
    assert.ok(/** @type {any} */ (hi)[key]?.length > 0);
    assert.ok(/** @type {any} */ (hinglish)[key]?.length > 0);
  }
});
