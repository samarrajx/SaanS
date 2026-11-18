/**
 * @fileoverview Today View.
 * Displays headline 24-h NAQI, outdoor/ventilation windows, hourly forecast chart,
 * and top 3 personalized actions with "Why this?" modal support.
 */

import { loadProfile, saveProfile } from "../storage.js";
import { getSimulatedScenario } from "../engine/scenarios.js";
import { calculateNAQI, calculateRollingMean } from "../engine/naqi.js";
import {
  findBestOutdoorWindow,
  findPeakPollutionHours,
  hasSensitiveMembers,
} from "../engine/exposure.js";
import { rankActions } from "../engine/rank.js";
import { createCard } from "../ui/card.js";
import { createChip } from "../ui/chip.js";
import { createLineChart } from "../ui/chart-line.js";
import { createActionCard } from "../ui/action-card.js";
import { announce } from "../ui/announcer.js";

/**
 * Builds headline AQI display.
 * @param {import("../types.js").NAQIResult} naqi
 * @param {number} rollingMean
 * @returns {HTMLElement}
 */
function buildHeadlineAqi(naqi, rollingMean) {
  const div = document.createElement("div");
  div.className = "aqi-display";

  const numSpan = document.createElement("span");
  numSpan.className = "aqi-number";
  numSpan.textContent = naqi.aqi.toString();
  div.appendChild(numSpan);

  const metaDiv = document.createElement("div");
  metaDiv.className = "aqi-meta";
  metaDiv.appendChild(createChip({ label: naqi.category, category: naqi.category }));

  const sub = document.createElement("span");
  sub.className = "aqi-subtext";
  sub.textContent = `Dominant: ${naqi.dominantPollutant.toUpperCase()} (24-h: ${rollingMean} µg/m³)`;
  metaDiv.appendChild(sub);

  div.appendChild(metaDiv);
  return div;
}

/**
 * Creates an activity window box.
 * @param {string} title
 * @param {string} text
 * @param {boolean} isClean
 * @returns {HTMLElement}
 */
function createWindowBox(title, text, isClean) {
  const box = document.createElement("div");
  box.className = `window-box ${isClean ? "clean" : "peak"}`;
  const h = document.createElement("h3");
  h.textContent = title;
  box.appendChild(h);
  const p = document.createElement("p");
  p.textContent = text;
  box.appendChild(p);
  return box;
}

/**
 * Builds best window and peak smog cards.
 * @param {number[]} pm25
 * @param {boolean} isSensitive
 * @returns {HTMLElement}
 */
function buildWindowsGrid(pm25, isSensitive) {
  const grid = document.createElement("div");
  grid.className = "windows-grid";

  const best = findBestOutdoorWindow(pm25, isSensitive);
  const startH = best.startHour.toString().padStart(2, "0");
  const endH = best.endHour.toString().padStart(2, "0");
  grid.appendChild(
    createWindowBox(
      "🌿 Cleanest Daylight Window",
      `${startH}:00 – ${endH}:00 (~${Math.round(best.averagePm)} µg/m³). Best for airing.`,
      true
    )
  );

  const peaks = findPeakPollutionHours(pm25);
  const peakStr = peaks.map((h) => `${h.toString().padStart(2, "0")}:00`).join(", ");
  grid.appendChild(
    createWindowBox(
      "⚠️ Diurnal Inversion Peaks",
      `Peak: ${peakStr}. Seal windows and avoid exertion.`,
      false
    )
  );

  return grid;
}

/**
 * Builds the hourly chart element.
 * @param {import("../types.js").HourlySeries} series
 * @returns {HTMLElement}
 */
function buildForecastChart(series) {
  const hours = series.times.map((t) => t.substring(11, 16));
  return createLineChart({
    title: "24-Hour Diurnal Forecast (µg/m³)",
    series: [
      { name: "PM2.5", values: series.pm25, color: "#e11d48" },
      { name: "PM10", values: series.pm10, color: "#d97706" },
    ],
    labels: hours,
  });
}

/**
 * Builds top 3 action cards list.
 * @param {Array<{ action: any }>} ranked
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} pm25Series
 * @returns {HTMLElement}
 */
function buildTopActionsList(ranked, profile, pm25Series) {
  const actionsList = document.createElement("div");
  actionsList.className = "actions-list";
  ranked.slice(0, 3).forEach((r) => {
    const isAdopted = profile.adoptedActions.some((a) => a.actionId === r.action.id);
    actionsList.appendChild(
      createActionCard({
        action: r.action,
        profile,
        outdoorPm25: pm25Series,
        isAdopted,
        onToggleAdopt: () => {
          if (isAdopted) {
            profile.adoptedActions = profile.adoptedActions.filter(
              (a) => a.actionId !== r.action.id
            );
          } else {
            profile.adoptedActions.push({ actionId: r.action.id, since: new Date().toISOString() });
          }
          announce(`${isAdopted ? "Unadopted" : "Adopted"} ${r.action.title}`);
          saveProfile(profile);
        },
      })
    );
  });
  return actionsList;
}

/**
 * Renders the Today View.
 * @returns {HTMLElement}
 */
export function render() {
  const container = document.createElement("div");
  container.className = "view-today";

  const profile = loadProfile();
  const series = getSimulatedScenario("PATNA_SEVERE");
  const pm25Mean = series.pm25.reduce((a, b) => a + b, 0) / series.pm25.length;
  const pm10Mean = series.pm10.reduce((a, b) => a + b, 0) / series.pm10.length;
  const naqi = calculateNAQI(pm25Mean, pm10Mean);
  const rolling = calculateRollingMean(series.pm25);

  if (profile.isDemo) {
    const banner = document.createElement("div");
    banner.className = "demo-banner";
    banner.textContent = "⚡ Simulated Demo Mode: Patna Severe Air Episode (Winter Smog)";
    container.appendChild(banner);
  }

  container.appendChild(
    createCard({
      title: `Today's Air Quality — ${profile.location.name}`,
      content: buildHeadlineAqi(naqi, rolling[rolling.length - 1]),
    })
  );

  container.appendChild(
    createCard({
      title: "Activity & Ventilation Windows",
      content: buildWindowsGrid(series.pm25, hasSensitiveMembers(profile)),
    })
  );

  container.appendChild(buildForecastChart(series));

  const ranked = rankActions(profile, series.pm25);
  container.appendChild(
    createCard({
      title: "Do These 3 Things Today",
      content: buildTopActionsList(ranked, profile, series.pm25),
    })
  );

  return container;
}
