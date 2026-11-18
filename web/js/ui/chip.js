/**
 * @fileoverview Accessible Status and AQI Chip Primitive.
 * Ensures color is never the only visual cue by pairing with icons and text labels.
 */

// Icon mappings per CPCB category
/** @type {Record<string, string>} */
const CATEGORY_ICONS = {
  Good: "🟢",
  Satisfactory: "🟡",
  Moderate: "🟠",
  Poor: "🔴",
  "Very Poor": "🟣",
  Severe: "⚠️",
};

/**
 * @typedef {Object} ChipOptions
 * @property {string} label - Display text
 * @property {import("../types.js").AQICategory | string} [category] - CPCB category
 * @property {string} [icon] - Optional explicit icon
 * @property {string} [title] - Hover/accessibility description
 */

/**
 * Creates an accessible badge/chip DOM element.
 *
 * @param {ChipOptions} options
 * @returns {HTMLSpanElement}
 */
export function createChip({ label, category, icon, title }) {
  const span = document.createElement("span");
  span.className = "ui-chip";

  if (category) {
    const safeCatClass = `chip-aqi-${category.toLowerCase().replace(/\s+/g, "")}`;
    span.classList.add(safeCatClass);
  }

  const iconGlyph = icon || (category ? CATEGORY_ICONS[category] || "•" : "");
  if (iconGlyph) {
    const iconSpan = document.createElement("span");
    iconSpan.className = "chip-icon";
    iconSpan.setAttribute("aria-hidden", "true");
    iconSpan.textContent = iconGlyph;
    span.appendChild(iconSpan);
  }

  const textSpan = document.createElement("span");
  textSpan.className = "chip-text";
  textSpan.textContent = label;
  span.appendChild(textSpan);

  if (title) {
    span.setAttribute("title", title);
    span.setAttribute("aria-label", `${label}: ${title}`);
  }

  return span;
}
