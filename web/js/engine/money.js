/**
 * @fileoverview Indian Rupee currency and cost formatting utilities.
 * Handles Indian numbering system (Lakh/Crore grouping) and cost band symbols.
 */

// Cost band symbols and labels
export const COST_BANDS = {
  ZERO: "₹0",
  LOW: "₹",
  MEDIUM: "₹₹",
  HIGH: "₹₹₹",
};

/**
 * Formats a numeric rupee amount using the Indian numbering system (lakh/crore).
 * Examples: 500 -> "₹500", 25000 -> "₹25,000", 150000 -> "₹1.5 Lakh"
 *
 * @param {number} amountInRupees
 * @returns {string}
 */
export function formatRupees(amountInRupees) {
  if (amountInRupees === 0) return "₹0";
  if (!amountInRupees || isNaN(amountInRupees)) return "₹0";

  const absAmount = Math.abs(amountInRupees);
  const sign = amountInRupees < 0 ? "-" : "";

  // 1 Crore = 10,000,000
  if (absAmount >= 10000000) {
    const cr = (absAmount / 10000000).toFixed(1).replace(/\.0$/, "");
    return `${sign}₹${cr} Cr`;
  }

  // 1 Lakh = 100,000
  if (absAmount >= 100000) {
    const lakh = (absAmount / 100000).toFixed(1).replace(/\.0$/, "");
    return `${sign}₹${lakh} Lakh`;
  }

  // Standard Indian comma format for < 1 Lakh
  const formatted = absAmount.toLocaleString("en-IN");
  return `${sign}₹${formatted}`;
}

/**
 * Returns human-readable label for a cost band code.
 *
 * @param {import("../types.js").BudgetBand} band
 * @returns {string}
 */
export function getBudgetBandLabel(band) {
  switch (band) {
    case "zero":
      return "Zero budget (₹0 DIY / behavioral)";
    case "low":
      return "Low budget (under ₹1,000)";
    case "medium":
      return "Medium budget (₹1,000 – ₹5,000)";
    case "high":
      return "Flexible budget (₹5,000+)";
    default:
      return "Standard";
  }
}
