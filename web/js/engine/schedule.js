/**
 * @fileoverview Day Schedule Builder.
 * Maps hourly air quality dynamics to household lifestyle constraints,
 * generating actionable timeline blocks linked to catalog actions.
 */

import { findBestOutdoorWindow, findVentilationWindow } from "./exposure.js";

/**
 * Builds the morning routine block.
 * @param {number[]} outdoorPm
 * @returns {import("../types.js").DayBlock}
 */
function buildMorningBlock(outdoorPm) {
  const avgPm = Math.round(((outdoorPm[6] + outdoorPm[7]) / 2) * 10) / 10;
  return {
    id: "block_morning_seal",
    startHour: "06:00",
    endHour: "08:00",
    type: "close",
    titleKey: "Morning Inversion Seal",
    reasonKey: `Inversion smog peak (${avgPm} µg/m³). Keep doors and windows closed; run air purifier.`,
    actionId: "timed_ventilation",
    outdoorPm: avgPm,
  };
}

/**
 * Builds the transit or school drop block.
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm
 * @returns {import("../types.js").DayBlock}
 */
function buildTransitBlock(profile, outdoorPm) {
  const hasChild = profile?.household?.members?.some((m) => m.ageGroup === "child");
  const pm = outdoorPm[8] || 150;
  return {
    id: "block_morning_transit",
    startHour: "08:00",
    endHour: "09:30",
    type: "commute",
    titleKey: hasChild ? "School Drop & Morning Commute" : "Morning Commute",
    reasonKey:
      "Heavy traffic and cool air trap vehicle exhaust. Ensure fitted N95 masks for outdoor legs.",
    actionId: "wear_n95_mask",
    outdoorPm: pm,
  };
}

/**
 * Builds the midday clean window blocks (ventilation and outdoor exercise).
 * @param {number[]} outdoorPm
 * @param {boolean} isSensitive
 * @returns {import("../types.js").DayBlock[]}
 */
function buildMiddayBlocks(outdoorPm, isSensitive) {
  const vent = findVentilationWindow(outdoorPm);
  const outdoorWin = findBestOutdoorWindow(outdoorPm, isSensitive);

  const ventBlock = {
    id: "block_midday_ventilation",
    startHour: `${vent.hour.toString().padStart(2, "0")}:00`,
    endHour: `${(vent.hour + 1).toString().padStart(2, "0")}:00`,
    type: "ventilate",
    titleKey: "Afternoon Air Flush",
    reasonKey: vent.safeToVentilate
      ? `Cleanest air hour of the day (${vent.pm} µg/m³). Open cross-ventilation for 15-20 minutes.`
      : `High ambient particulate (${vent.pm} µg/m³). Skip natural ventilation; keep home sealed.`,
    actionId: "timed_ventilation",
    outdoorPm: vent.pm,
  };

  const exerciseBlock = {
    id: "block_outdoor_exercise",
    startHour: `${outdoorWin.startHour.toString().padStart(2, "0")}:00`,
    endHour: `${outdoorWin.endHour.toString().padStart(2, "0")}:00`,
    type: "exercise",
    titleKey: "Optimal Outdoor Window",
    reasonKey: `Best daylight air quality (${outdoorWin.averagePm} µg/m³). Ideal time for essential walks or errands.`,
    actionId: "shift_exercise_hours",
    outdoorPm: outdoorWin.averagePm,
  };

  return [ventBlock, exerciseBlock];
}

/**
 * Builds the evening and night protection block.
 * @param {number[]} outdoorPm
 * @returns {import("../types.js").DayBlock}
 */
function buildEveningNightBlock(outdoorPm) {
  const pm = outdoorPm[20] || 200;
  return {
    id: "block_evening_seal",
    startHour: "19:00",
    endHour: "23:00",
    type: "close",
    titleKey: "Nighttime Seal & Bedroom Filtration",
    reasonKey:
      "Nocturnal cooling drops the boundary layer. Seal windows tightly and activate bedroom purifier.",
    actionId: "hepa_purifier_run",
    outdoorPm: pm,
  };
}

/**
 * Assembles the full 24-hour day schedule for a household.
 *
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm25Series - 24 hourly PM2.5 values
 * @param {boolean} isSensitive
 * @returns {import("../types.js").DayBlock[]}
 */
export function buildDaySchedule(profile, outdoorPm25Series, isSensitive = false) {
  const morning = buildMorningBlock(outdoorPm25Series);
  const transit = buildTransitBlock(profile, outdoorPm25Series);
  const midday = buildMiddayBlocks(outdoorPm25Series, isSensitive);
  const night = buildEveningNightBlock(outdoorPm25Series);

  return [morning, transit, ...midday, night];
}
