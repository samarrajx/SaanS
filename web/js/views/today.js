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
import { estimateImpact } from "../engine/impact.js";
import { createCard } from "../ui/card.js";
import { createChip } from "../ui/chip.js";
import { createLineChart } from "../ui/chart-line.js";
import { openModal } from "../ui/modal.js";
import { announce } from "../ui/announcer.js";

/**
 * Opens "Why this?" modal for an action.
 * @param {import("../types.js").ActionDefinition} action
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm25
 */
function showWhyThisModal(action, profile, outdoorPm25) {
  const impact = estimateImpact(action, profile, outdoorPm25);
  const content = document.createElement("div");

  const details = [
    `Estimated Exposure Reduction: ${impact.exposureChange.central}% (${impact.exposureChange.low}%-${impact.exposureChange.high}%)`,
    `Evidence Tier: ${action.evidenceTier === "established" ? "Established Standard (CPCB/WHO)" : "Scientific Model Estimate"}`,
    `Source Citation: ${action.sourceCitation}`,
    `Assumptions: ${impact.assumptions.join("; ")}`,
  ];
  details.forEach((text, i) => {
    const p = document.createElement("p");
    if (i > 0) p.style.marginTop = "8px";
    p.textContent = text;
    content.appendChild(p);
  });

  openModal({
    title: `Why this: ${action.title}`,
    content,
    actions: [{ label: "Close", isPrimary: false, onClick: () => {} }],
  });
}

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

  const chip = createChip({ label: naqi.category, category: naqi.category });
  metaDiv.appendChild(chip);

  const sub = document.createElement("span");
  sub.className = "aqi-subtext";
  sub.textContent = `Dominant: ${naqi.dominantPollutant.toUpperCase()} (24-h mean: ${rollingMean} µg/m³)`;
  metaDiv.appendChild(sub);

  div.appendChild(metaDiv);
  return div;
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
  const cleanBox = document.createElement("div");
  cleanBox.className = "window-box clean";
  const startH = best.startHour.toString().padStart(2, "0");
  const endH = best.endHour.toString().padStart(2, "0");
  cleanBox.innerHTML = `<h3>🌿 Cleanest Daylight Window</h3><p><strong>${startH}:00 – ${endH}:00</strong> (Mean: ${Math.round(best.averagePm)} µg/m³)</p><p style="font-size:0.8rem; margin-top:4px;">Recommended for essential outdoor tasks and brief room airing.</p>`;
  grid.appendChild(cleanBox);

  const peaks = findPeakPollutionHours(pm25);
  const peakBox = document.createElement("div");
  peakBox.className = "window-box peak";
  const peakStr = peaks.map((h) => `${h.toString().padStart(2, "0")}:00`).join(", ");
  peakBox.innerHTML = `<h3>⚠️ Diurnal Inversion Peaks</h3><p>Peak hours: <strong>${peakStr}</strong></p><p style="font-size:0.8rem; margin-top:4px;">Keep windows sealed and avoid outdoor exercise.</p>`;
  grid.appendChild(peakBox);

  return grid;
}

/**
 * Creates toggle button for adopting an action.
 * @param {import("../types.js").ActionDefinition} act
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLButtonElement}
 */
function createAdoptButton(act, profile) {
  const isAdopted = profile.adoptedActions.some((a) => a.actionId === act.id);
  const adoptBtn = document.createElement("button");
  adoptBtn.className = isAdopted ? "ui-button" : "ui-button secondary";
  adoptBtn.style.padding = "2px 8px";
  adoptBtn.style.fontSize = "0.75rem";
  adoptBtn.textContent = isAdopted ? "✓ Adopted" : "+ Adopt Action";
  adoptBtn.addEventListener("click", () => {
    if (isAdopted) {
      profile.adoptedActions = profile.adoptedActions.filter((a) => a.actionId !== act.id);
      adoptBtn.textContent = "+ Adopt Action";
      adoptBtn.className = "ui-button secondary";
      announce(`Unadopted ${act.title}`);
    } else {
      profile.adoptedActions.push({ actionId: act.id, since: new Date().toISOString() });
      adoptBtn.textContent = "✓ Adopted";
      adoptBtn.className = "ui-button";
      announce(`Adopted ${act.title}`);
    }
    saveProfile(profile);
  });
  return adoptBtn;
}

/**
 * Builds a single action card element.
 * @param {import("../types.js").ActionDefinition} act
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} outdoorPm25
 * @returns {HTMLElement}
 */
function buildActionItem(act, profile, outdoorPm25) {
  const item = document.createElement("div");
  item.className = "action-card-item";

  const header = document.createElement("div");
  header.className = "action-header";
  const titleH = document.createElement("strong");
  titleH.textContent = act.title;
  header.appendChild(titleH);

  const badges = document.createElement("div");
  badges.className = "action-badges";
  badges.appendChild(createChip({ label: act.costBand }));
  badges.appendChild(createChip({ label: `${act.effort} effort` }));
  header.appendChild(badges);
  item.appendChild(header);

  const footer = document.createElement("div");
  footer.className = "action-footer";

  const whyBtn = document.createElement("button");
  whyBtn.className = "ui-button secondary";
  whyBtn.style.padding = "2px 8px";
  whyBtn.style.fontSize = "0.75rem";
  whyBtn.textContent = "Why this?";
  whyBtn.addEventListener("click", () => showWhyThisModal(act, profile, outdoorPm25));
  footer.appendChild(whyBtn);

  footer.appendChild(createAdoptButton(act, profile));
  item.appendChild(footer);
  return item;
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
  const rollingMean = rolling[rolling.length - 1];

  if (profile.isDemo) {
    const banner = document.createElement("div");
    banner.className = "demo-banner";
    banner.textContent = "⚡ Simulated Demo Mode: Patna Severe Air Episode (Winter Smog)";
    container.appendChild(banner);
  }

  container.appendChild(
    createCard({
      title: `Today's Air Quality — ${profile.location.name}`,
      content: buildHeadlineAqi(naqi, rollingMean),
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
  const actionsList = document.createElement("div");
  actionsList.className = "actions-list";
  ranked
    .slice(0, 3)
    .forEach((r) => actionsList.appendChild(buildActionItem(r.action, profile, series.pm25)));

  container.appendChild(createCard({ title: "Do These 3 Things Today", content: actionsList }));

  return container;
}
