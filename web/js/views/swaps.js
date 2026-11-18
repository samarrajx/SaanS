/**
 * @fileoverview Swaps View & Running Impact Ledger.
 * Lets users adopt sustainable daily swaps across commute, cooking, heating,
 * and waste, maintaining a cumulative ledger of avoided exposure and emissions.
 */

import { loadProfile, saveProfile } from "../storage.js";
import { getSimulatedScenario } from "../engine/scenarios.js";
import { ACTIONS_CATALOG } from "../engine/actions.js";
import { estimateImpact } from "../engine/impact.js";
import { createCard } from "../ui/card.js";
import { createActionCard } from "../ui/action-card.js";
import { announce } from "../ui/announcer.js";

const SWAP_IDS = [
  "switch_metro_bus",
  "wfh_smog_alert",
  "switch_induction_stove",
  "replace_biomass_heating",
  "stop_leaf_burning",
  "stop_agarbatti_coils",
];

/**
 * Calculates cumulative weekly impact from adopted actions.
 * @param {string[]} adoptedIds
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} pm25Series
 */
function calculateLedger(adoptedIds, profile, pm25Series) {
  let avoidedCo2e = 0;
  let avoidedPmG = 0;
  /** @type {number[]} */
  const exposureReductions = [];

  adoptedIds.forEach((id) => {
    const act = ACTIONS_CATALOG.find((a) => a.id === id);
    if (!act) return;
    const imp = estimateImpact(act, profile, pm25Series);
    if (imp.emissionsChange?.co2e) {
      avoidedCo2e += imp.emissionsChange.co2e.central || 0;
    }
    if (imp.emissionsChange?.pm) {
      avoidedPmG += imp.emissionsChange.pm.central || 0;
    }
    if (imp.exposureChange?.central) {
      exposureReductions.push(imp.exposureChange.central);
    }
  });

  const avgExposure =
    exposureReductions.length > 0
      ? Math.round(exposureReductions.reduce((a, b) => a + b, 0) / exposureReductions.length)
      : 0;

  return { avoidedCo2e, avoidedPmG, avgExposure, count: adoptedIds.length };
}

/**
 * Builds the impact ledger summary card.
 * @param {any} ledger
 * @returns {HTMLElement}
 */
function buildLedgerCard(ledger) {
  const div = document.createElement("div");
  div.className = "impact-ledger-box";
  div.style.padding = "12px";
  div.style.background = "#f0fdf4";
  div.style.borderRadius = "8px";
  div.style.border = "1px solid #bbf7d0";

  const h3 = document.createElement("h3");
  h3.style.fontSize = "1.1rem";
  h3.style.color = "#166534";
  h3.style.marginBottom = "8px";
  h3.textContent = `Running Impact Ledger (${ledger.count} Swaps Active)`;
  div.appendChild(h3);

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";

  const items = [
    `🌿 Estimated Avoided Exposure: ~${ledger.avgExposure}% reduction across adopted routines`,
    `🚗 Avoided Greenhouse Emissions: ~${ledger.avoidedCo2e} kg CO₂e / month`,
    `💨 Avoided Direct Particulate: ~${ledger.avoidedPmG} g exhaust PM / month`,
  ];
  items.forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    ul.appendChild(li);
  });
  div.appendChild(ul);
  return div;
}

/**
 * Renders the list of swap action cards.
 * @param {HTMLElement} listContainer
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} pm25Series
 * @param {() => void} onRefresh
 */
function renderSwapsList(listContainer, profile, pm25Series, onRefresh) {
  listContainer.replaceChildren();

  SWAP_IDS.forEach((id) => {
    const act = ACTIONS_CATALOG.find((a) => a.id === id);
    if (!act) return;
    const isAdopted = profile.adoptedActions.some((a) => a.actionId === act.id);
    listContainer.appendChild(
      createActionCard({
        action: act,
        profile,
        outdoorPm25: pm25Series,
        isAdopted,
        adoptLabel: "+ Add to Ledger",
        unadoptLabel: "✓ In Ledger",
        onToggleAdopt: () => {
          if (isAdopted) {
            profile.adoptedActions = profile.adoptedActions.filter((a) => a.actionId !== act.id);
            announce(`Removed ${act.title} from impact ledger`);
          } else {
            profile.adoptedActions.push({ actionId: act.id, since: new Date().toISOString() });
            announce(`Added ${act.title} to impact ledger`);
          }
          saveProfile(profile);
          onRefresh();
        },
      })
    );
  });
}

/**
 * Renders the Swaps and Impact Ledger view.
 * @returns {HTMLElement}
 */
export function render() {
  const container = document.createElement("div");
  container.className = "view-swaps";

  const profile = loadProfile();
  const series = getSimulatedScenario("PATNA_SEVERE");

  const ledgerMount = document.createElement("div");
  const listMount = document.createElement("div");
  listMount.className = "actions-list";

  function refresh() {
    const adoptedIds = profile.adoptedActions.map((a) => a.actionId);
    const ledger = calculateLedger(adoptedIds, profile, series.pm25);
    ledgerMount.replaceChildren();
    ledgerMount.appendChild(buildLedgerCard(ledger));
    renderSwapsList(listMount, profile, series.pm25, refresh);
  }

  container.appendChild(
    createCard({
      title: "Daily Swaps & Impact Ledger 🔄",
      subtitle:
        "Adopt low-emission habits and track your cumulative exposure and emissions impact.",
    })
  );

  container.appendChild(ledgerMount);
  container.appendChild(createCard({ title: "Catalog of Sustainable Swaps", content: listMount }));

  refresh();
  return container;
}
