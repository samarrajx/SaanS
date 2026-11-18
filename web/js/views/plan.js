/**
 * @fileoverview Day Plan View.
 * Displays hour-by-hour timeline schedule (commute, ventilation, school, cooking, sleep)
 * with attached clean-air actions and calendar (.ics) export.
 */

import { loadProfile } from "../storage.js";
import { getSimulatedScenario } from "../engine/scenarios.js";
import { generateBaselinePlan } from "../engine/baseline.js";
import { generateIcsCalendar } from "../engine/ics.js";
import { createCard } from "../ui/card.js";
import { createChip } from "../ui/chip.js";
import { announce } from "../ui/announcer.js";

/**
 * Triggers client-side RFC 5545 .ics file download.
 * @param {import("../types.js").DayBlock[]} blocks
 */
function exportCalendar(blocks) {
  const ics = generateIcsCalendar(blocks);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "saans-day-plan.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  announce("Calendar .ics exported successfully");
}

/**
 * Builds a single timeline block element.
 * @param {import("../types.js").DayBlock} block
 * @returns {HTMLElement}
 */
function buildBlockElement(block) {
  const item = document.createElement("div");
  item.className = "timeline-block";

  const timeSpan = document.createElement("div");
  timeSpan.className = "timeline-time";
  timeSpan.textContent = `${block.startHour} – ${block.endHour}: ${block.titleKey}`;
  item.appendChild(timeSpan);

  const chip = createChip({ label: `Outdoor PM2.5: ~${Math.round(block.outdoorPm)} µg/m³` });
  chip.style.margin = "4px 0";
  item.appendChild(chip);

  const actP = document.createElement("p");
  actP.className = "timeline-actions";
  actP.textContent = block.reasonKey;
  item.appendChild(actP);

  return item;
}

/**
 * Builds the timeline grid container.
 * @param {import("../types.js").DayBlock[]} blocks
 * @returns {HTMLElement}
 */
function buildTimelineGrid(blocks) {
  const grid = document.createElement("div");
  grid.className = "timeline-grid";
  blocks.forEach((b) => grid.appendChild(buildBlockElement(b)));
  return grid;
}

/**
 * Builds the export calendar button.
 * @param {import("../types.js").DayBlock[]} blocks
 * @returns {HTMLButtonElement}
 */
function buildExportButton(blocks) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ui-button secondary";
  btn.textContent = "📅 Add Reminders to Calendar (.ics)";
  btn.style.marginBottom = "16px";
  btn.addEventListener("click", () => exportCalendar(blocks));
  return btn;
}

/**
 * Renders the Day Plan View.
 * @returns {HTMLElement}
 */
export function render() {
  const container = document.createElement("div");
  container.className = "view-plan";

  const profile = loadProfile();
  const series = getSimulatedScenario("PATNA_SEVERE");
  const plan = generateBaselinePlan(profile, series);

  const headerCard = createCard({
    title: "Hour-by-Hour Clean Air Plan",
    subtitle: plan.summary,
  });
  container.appendChild(headerCard);
  container.appendChild(buildExportButton(plan.dayPlan));

  const timelineCard = createCard({
    title: "Today's Schedule & Routine Adjustments",
    content: buildTimelineGrid(plan.dayPlan),
  });
  container.appendChild(timelineCard);

  return container;
}
