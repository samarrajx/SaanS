/**
 * @fileoverview Locale Registry and Getter.
 */

import { en } from "./en.js";
import { hi } from "./hi.js";
import { hinglish } from "./hinglish.js";

/** @type {Record<string, Record<string, string>>} */
export const LOCALES = {
  en,
  hi,
  hinglish,
};

/**
 * Returns dictionary for specified language code.
 * @param {string} [lang]
 * @returns {Record<string, string>}
 */
export function getLocale(lang = "en") {
  return LOCALES[lang] || en;
}
