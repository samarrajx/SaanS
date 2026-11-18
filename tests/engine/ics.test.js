import test from "node:test";
import assert from "node:assert/strict";
import { generateIcsCalendar, formatIcsDate } from "../../web/js/engine/ics.js";

test("formatIcsDate formats ISO UTC date for iCalendar standard", () => {
  const d = new Date(Date.UTC(2026, 10, 18, 12, 30, 0));
  assert.equal(formatIcsDate(d), "20261118T123000Z");
});

test("generateIcsCalendar builds RFC 5545 compliant calendar string", () => {
  /** @type {any} */
  const blocks = [
    {
      startHour: "07:00",
      endHour: "08:00",
      titleKey: "Morning Inversion Seal",
      reasonKey: "Keep windows shut during inversion peak.",
    },
    {
      startHour: "13:00",
      endHour: "14:00",
      titleKey: "Afternoon Air Flush",
      reasonKey: "Cleanest outdoor window. Open cross-breeze.",
    },
  ];

  const ics = generateIcsCalendar(blocks, new Date(2026, 10, 18));
  assert.ok(ics.includes("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("VERSION:2.0"));
  assert.ok(ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.includes("SUMMARY:Saans: Morning Inversion Seal"));
  assert.ok(ics.includes("SUMMARY:Saans: Afternoon Air Flush"));
  assert.ok(ics.includes("END:VCALENDAR"));
});
