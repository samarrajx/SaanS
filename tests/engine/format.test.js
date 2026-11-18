import test from "node:test";
import assert from "node:assert/strict";
import { formatRupees, getBudgetBandLabel } from "../../web/js/engine/money.js";
import {
  formatRange,
  formatHour,
  formatTimeRange,
  formatNumber,
} from "../../web/js/engine/format.js";

test("formatRupees handles Indian numbering (lakh and crore)", () => {
  assert.equal(formatRupees(0), "₹0");
  assert.equal(formatRupees(500), "₹500");
  assert.equal(formatRupees(25000), "₹25,000");
  assert.equal(formatRupees(150000), "₹1.5 Lakh");
  assert.equal(formatRupees(12500000), "₹1.3 Cr");
});

test("getBudgetBandLabel returns explanatory string", () => {
  assert.ok(getBudgetBandLabel("zero").includes("Zero"));
  assert.ok(getBudgetBandLabel("low").includes("Low"));
  assert.ok(getBudgetBandLabel("medium").includes("Medium"));
  assert.ok(getBudgetBandLabel("high").includes("Flexible"));
});

test("formatRange displays low-high interval honestly", () => {
  assert.equal(formatRange(10, 20, "µg/m³"), "10–20 µg/m³");
  assert.equal(formatRange(15, 15, "kg"), "15 kg");
  assert.equal(formatRange(5.42, 9.87), "5.4–9.9");
});

test("formatHour and formatTimeRange generate clean time strings", () => {
  assert.equal(formatHour(7), "07:00");
  assert.equal(formatHour(14), "14:00");
  assert.equal(formatHour(7, "12h"), "7:00 AM");
  assert.equal(formatHour(14, "12h"), "2:00 PM");
  assert.equal(formatTimeRange(12, 14), "12:00 – 14:00");
  assert.equal(formatNumber(15.24), "15.2");
});
