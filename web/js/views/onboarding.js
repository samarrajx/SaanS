/**
 * @fileoverview Onboarding and Household Setup View.
 * Collects coarse location, household sensitivity flags, and home baseline parameters.
 */

import { loadProfile, saveProfile } from "../storage.js";
import { createCard } from "../ui/card.js";
import { createFormField } from "../ui/form-field.js";
import { announce } from "../ui/announcer.js";
import { navigateTo } from "../router.js";

/**
 * Creates the GPS location button.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLButtonElement}
 */
function createGpsButton(profile) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ui-button secondary";
  btn.textContent = "📍 Use My Coarse GPS";
  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      announce("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        profile.location.lat = Math.round(pos.coords.latitude * 100) / 100;
        profile.location.lon = Math.round(pos.coords.longitude * 100) / 100;
        profile.location.name = `GPS (${profile.location.lat}, ${profile.location.lon})`;
        announce(`Location updated to ${profile.location.name}`);
        const input = /** @type {HTMLInputElement | null} */ (
          document.getElementById("ob-location")
        );
        if (input) input.value = profile.location.name;
      },
      () => announce("Unable to retrieve location.")
    );
  });
  return btn;
}

/**
 * Creates demo preset button.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLButtonElement}
 */
function createDemoButton(profile) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ui-button secondary";
  btn.textContent = "⚡ Try Demo (Patna Severe)";
  btn.addEventListener("click", () => {
    profile.location.name = "Patna, Bihar";
    profile.location.lat = 25.59;
    profile.location.lon = 85.14;
    profile.isDemo = true;
    saveProfile(profile);
    announce("Demo mode enabled with Patna Severe data");
    navigateTo("today");
  });
  return btn;
}

/**
 * Builds the location search and GPS setup block.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLElement}
 */
function buildLocationSection(profile) {
  const container = document.createElement("div");
  container.className = "onboarding-location-section";

  const locField = createFormField({
    id: "ob-location",
    label: "City or Area (coarse)",
    value: profile.location.name,
    helpText: "Coordinates are rounded to 2 decimals (~1 km) and never linked to your identity.",
    onChange: (val) => {
      profile.location.name = val;
    },
  });
  container.appendChild(locField);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";
  btnRow.style.marginTop = "8px";
  btnRow.appendChild(createGpsButton(profile));
  btnRow.appendChild(createDemoButton(profile));

  container.appendChild(btnRow);
  return container;
}

/**
 * Builds household demographics and budget band section.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLElement}
 */
function buildHouseholdSection(profile) {
  const container = document.createElement("div");

  const budgetField = createFormField({
    id: "ob-budget",
    label: "Willingness to Spend on Clean Air",
    type: "select",
    value: profile.lifestyle.budgetBand,
    options: [
      { value: "zero", label: "₹0 (Zero cost routines only)" },
      { value: "low", label: "₹ Low (< ₹1,500 e.g. N95s, DIY tape)" },
      { value: "medium", label: "₹₹ Medium (< ₹8,000 e.g. DIY/Budget purifier)" },
      { value: "high", label: "₹₹₹ High (> ₹8,000 e.g. HEPA purifiers)" },
    ],
    onChange: (val) => {
      profile.lifestyle.budgetBand = /** @type {import("../types.js").BudgetBand} */ (val);
    },
  });
  container.appendChild(budgetField);

  return container;
}

/**
 * Builds home building baseline parameters.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLElement}
 */
function buildHomeSection(profile) {
  const container = document.createElement("div");

  const tightnessField = createFormField({
    id: "ob-tightness",
    label: "Home Building Tightness",
    type: "select",
    value: profile.home.tightness,
    options: [
      { value: "leaky", label: "Leaky (Old building, unsealed gaps, high drafts)" },
      { value: "average", label: "Typical (Standard doors and sliding windows)" },
      { value: "tight", label: "Tight (Well-sealed modern construction, double glaze)" },
    ],
    onChange: (val) => {
      profile.home.tightness = /** @type {import("../types.js").HomeTightness} */ (val);
    },
  });
  container.appendChild(tightnessField);

  const cookingField = createFormField({
    id: "ob-fuel",
    label: "Primary Cooking Fuel",
    type: "select",
    value: profile.home.cookingFuel,
    options: [
      { value: "lpg", label: "LPG Gas" },
      { value: "induction", label: "Electric / Induction" },
      { value: "biomass", label: "Wood / Biomass / Chulha" },
      { value: "other", label: "Other / Kerosene" },
    ],
    onChange: (val) => {
      profile.home.cookingFuel = /** @type {import("../types.js").CookingFuel} */ (val);
    },
  });
  container.appendChild(cookingField);

  return container;
}

/**
 * Renders the Onboarding view.
 * @returns {HTMLElement}
 */
export function render() {
  const profile = loadProfile();
  const wrapper = document.createElement("div");
  wrapper.className = "view-onboarding";

  const titleCard = createCard({
    title: "Welcome to Saans 🌱",
    subtitle:
      "Configure your home and daily habits to receive tailored, low-emission clean-air strategies.",
  });
  wrapper.appendChild(titleCard);

  const locCard = createCard({
    title: "1. Location",
    content: buildLocationSection(profile),
  });
  wrapper.appendChild(locCard);

  const houseCard = createCard({
    title: "2. Household & Budget",
    content: buildHouseholdSection(profile),
  });
  wrapper.appendChild(houseCard);

  const homeCard = createCard({
    title: "3. Home Baseline",
    content: buildHomeSection(profile),
  });
  wrapper.appendChild(homeCard);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "ui-button";
  saveBtn.style.width = "100%";
  saveBtn.style.marginTop = "16px";
  saveBtn.textContent = "Save Profile & View Today's Air →";
  saveBtn.addEventListener("click", () => {
    saveProfile(profile);
    announce("Profile saved successfully");
    navigateTo("today");
  });
  wrapper.appendChild(saveBtn);

  return wrapper;
}
