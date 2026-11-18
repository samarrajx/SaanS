/**
 * @fileoverview Home Air Lab View.
 * Simulates indoor PM2.5 mass-balance physics under various interventions
 * (HEPA, DIY Corsi-Rosenthal, window sealing, weatherstripping).
 */

import { loadProfile } from "../storage.js";
import { getSimulatedScenario } from "../engine/scenarios.js";
import { simulateIndoorSeries } from "../engine/indoor.js";
import { createCard } from "../ui/card.js";
import { createLineChart } from "../ui/chart-line.js";
import { createFormField } from "../ui/form-field.js";
import { openModal } from "../ui/modal.js";
import { announce } from "../ui/announcer.js";

/**
 * Opens modal explaining the mass-balance physical equation and citations.
 */
function showPhysicsModal() {
  const content = document.createElement("div");
  const p1 = document.createElement("p");
  p1.textContent =
    "Model: Single-zone mass-balance differential equation: dC/dt = P·λ·C_out + S/V - (λ + k + CADR/V)·C.";
  content.appendChild(p1);

  const p2 = document.createElement("p");
  p2.style.marginTop = "8px";
  p2.textContent =
    "Parameters: Penetration factor P = 0.65-0.85; Deposition rate k = 0.2 h⁻¹; Air exchange λ = 0.3-2.5 h⁻¹.";
  content.appendChild(p2);

  const p3 = document.createElement("p");
  p3.style.marginTop = "8px";
  p3.textContent =
    "Sources: Nazaroff (2004) Indoor Air; CPCB Indoor Air Quality Studies (2018); EPA Indoor Air Modeling.";
  content.appendChild(p3);

  openModal({
    title: "Physics & Model Methodology",
    content,
    actions: [{ label: "Close", isPrimary: false, onClick: () => {} }],
  });
}

/**
 * Builds simulation control fields.
 * @param {any} state
 * @param {() => void} onUpdate
 * @returns {HTMLElement}
 */
function buildControls(state, onUpdate) {
  const form = document.createElement("div");
  form.className = "lab-controls";

  form.appendChild(
    createFormField({
      id: "lab-purifier",
      label: "Air Cleaning Intervention",
      type: "select",
      value: state.purifier,
      options: [
        { value: "none", label: "None (₹0, CADR: 0 m³/h)" },
        { value: "diy", label: "DIY Box Fan / Corsi-Rosenthal (₹1,500, CADR: 220 m³/h)" },
        { value: "hepa", label: "Standard Commercial HEPA (₹7,500, CADR: 300 m³/h)" },
        { value: "hepa_pro", label: "High-Capacity HEPA (₹14,000, CADR: 450 m³/h)" },
      ],
      onChange: (val) => {
        state.purifier = val;
        onUpdate();
      },
    })
  );

  form.appendChild(
    createFormField({
      id: "lab-windows",
      label: "Window & Sealing Habit",
      type: "select",
      value: state.windows,
      options: [
        { value: "open", label: "Windows Open (High natural draft, ACH ~2.5)" },
        { value: "mixed", label: "Mixed / Normal (Aired intermittently, ACH ~1.2)" },
        { value: "closed", label: "Windows Closed & Weatherstripped (ACH ~0.4)" },
      ],
      onChange: (val) => {
        state.windows = val;
        onUpdate();
      },
    })
  );

  return form;
}

/**
 * Computes CADR from selected purifier key.
 * @param {string} purifier
 * @returns {number}
 */
function getCadr(purifier) {
  if (purifier === "diy") return 220;
  if (purifier === "hepa") return 300;
  if (purifier === "hepa_pro") return 450;
  return 0;
}

/**
 * Builds summary comparison card.
 * @param {number} baseMean
 * @param {number} actionMean
 * @returns {HTMLElement}
 */
function buildSummary(baseMean, actionMean) {
  const div = document.createElement("div");
  div.className = "lab-summary";
  const diff = Math.max(0, baseMean - actionMean);
  const pct = baseMean > 0 ? Math.round((diff / baseMean) * 100) : 0;

  const p1 = document.createElement("p");
  p1.style.fontSize = "1.1rem";
  p1.style.marginBottom = "8px";
  p1.textContent = `Current 24-h Indoor Mean: ${Math.round(baseMean)} µg/m³ → With Interventions: ${Math.round(actionMean)} µg/m³`;
  div.appendChild(p1);

  const p2 = document.createElement("p");
  p2.textContent = `Estimated Indoor Exposure Reduction: ${pct}% (~${Math.round(diff)} µg/m³ avoided)`;
  div.appendChild(p2);

  return div;
}

/**
 * Renders indoor simulation charts and summary stats.
 * @param {HTMLElement} chartMount
 * @param {HTMLElement} summaryMount
 * @param {import("../types.js").HourlySeries} series
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {any} state
 */
function renderSimulation(chartMount, summaryMount, series, profile, state) {
  const baseIndoor = simulateIndoorSeries(series.pm25, profile, { cadr: 0 });
  const actionIndoor = simulateIndoorSeries(series.pm25, profile, {
    cadr: getCadr(state.purifier),
    windowsUsually: /** @type {import("../types.js").WindowHabit} */ (state.windows),
  });

  const baseMean = baseIndoor.reduce((a, b) => a + b, 0) / 24;
  const actionMean = actionIndoor.reduce((a, b) => a + b, 0) / 24;

  summaryMount.replaceChildren();
  summaryMount.appendChild(buildSummary(baseMean, actionMean));

  const hours = series.times.map((t) => t.substring(11, 16));
  chartMount.replaceChildren();
  chartMount.appendChild(
    createLineChart({
      title: "Indoor vs Outdoor PM2.5 Simulation (µg/m³)",
      series: [
        { name: "Outdoor (Severe)", values: series.pm25, color: "#e11d48" },
        { name: "Current Indoor Baseline", values: baseIndoor, color: "#f59e0b" },
        { name: "With Interventions", values: actionIndoor, color: "#10b981" },
      ],
      labels: hours,
    })
  );
}

/**
 * Renders the Home Air Lab view.
 * @returns {HTMLElement}
 */
export function render() {
  const container = document.createElement("div");
  container.className = "view-lab";

  const profile = loadProfile();
  const series = getSimulatedScenario("PATNA_SEVERE");

  const state = {
    purifier: profile.home.purifier.has ? "hepa" : "diy",
    windows: profile.home.windowsUsually || "mixed",
  };

  const chartMount = document.createElement("div");
  const summaryMount = document.createElement("div");
  const updateSimulation = () => renderSimulation(chartMount, summaryMount, series, profile, state);

  const headerCard = createCard({
    title: "Home Air Lab 🧪",
    subtitle:
      "Simulate indoor PM2.5 physics and discover the highest exposure reduction per rupee.",
  });
  container.appendChild(headerCard);

  const physicsBtn = document.createElement("button");
  physicsBtn.className = "ui-button secondary";
  physicsBtn.style.marginBottom = "16px";
  physicsBtn.textContent = "🔬 Why this? Scientific Model & Citations";
  physicsBtn.addEventListener("click", () => {
    showPhysicsModal();
    announce("Opened scientific methodology modal");
  });
  container.appendChild(physicsBtn);

  const controlsCard = createCard({
    title: "Simulation Parameters & Interventions",
    content: buildControls(state, updateSimulation),
  });
  container.appendChild(controlsCard);

  container.appendChild(summaryMount);
  container.appendChild(chartMount);

  updateSimulation();
  return container;
}
