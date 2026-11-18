/**
 * @fileoverview Settings and About View.
 * Handles language selection, location preference, data attributions,
 * privacy explanations, and full data deletion with confirmation modal.
 */

import { loadProfile, saveProfile, clearProfile } from "../storage.js";
import { createCard } from "../ui/card.js";
import { createFormField } from "../ui/form-field.js";
import { openModal } from "../ui/modal.js";
import { announce } from "../ui/announcer.js";

/**
 * Builds the data attribution and disclaimer card.
 * @returns {HTMLElement}
 */
function buildAboutCard() {
  const container = document.createElement("div");

  const p1 = document.createElement("p");
  p1.textContent =
    "Air quality forecast data is provided by CAMS ENSEMBLE via Open-Meteo under CC BY 4.0. Spatial resolution is ~25-45 km model estimate.";
  p1.className = "settings-text";
  container.appendChild(p1);

  const p2 = document.createElement("p");
  p2.textContent =
    "Disclaimer: Saans estimates are for daily planning and low-emission routines, not medical advice or diagnosis. For severe respiratory symptoms, consult a healthcare provider.";
  p2.className = "settings-text text-muted";
  container.appendChild(p2);

  const p3 = document.createElement("p");
  p3.textContent =
    "Privacy: Your household profile is stored strictly inside your browser's local storage. Only coarse flags are sent to the serverless engine when generating personalized day plans.";
  p3.className = "settings-text text-muted";
  container.appendChild(p3);

  return createCard({
    title: "About & Data Attribution",
    content: container,
  });
}

/**
 * Builds language selector field.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLDivElement}
 */
function createLanguageField(profile) {
  return createFormField({
    id: "pref-lang",
    label: "Preferred Language",
    type: "select",
    value: profile.language,
    options: [
      { label: "English", value: "en" },
      { label: "हिन्दी (Hindi)", value: "hi" },
      { label: "Hinglish", value: "hinglish" },
    ],
    onChange: (val) => {
      profile.language = val;
      saveProfile(profile);
      document.documentElement.lang = val === "hi" ? "hi" : "en";
      announce("Language updated");
    },
  });
}

/**
 * Builds budget band selector field.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLDivElement}
 */
function createBudgetField(profile) {
  return createFormField({
    id: "pref-budget",
    label: "Budget Band for Recommendations",
    type: "select",
    value: profile.lifestyle?.budgetBand || "low",
    options: [
      { label: "₹0 (Zero budget / DIY only)", value: "zero" },
      { label: "₹ (Low budget under ₹1,000)", value: "low" },
      { label: "₹₹ (Medium budget ₹1,000 – ₹5,000)", value: "medium" },
      { label: "₹₹₹ (Flexible budget ₹5,000+)", value: "high" },
    ],
    onChange: (val) => {
      if (!profile.lifestyle) profile.lifestyle = { commute: [], vehicles: [], budgetBand: "low" };
      profile.lifestyle.budgetBand = val;
      saveProfile(profile);
      announce("Budget preference updated");
    },
  });
}

/**
 * Builds the profile preferences form card.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLElement}
 */
function buildPreferencesCard(profile) {
  const container = document.createElement("div");
  container.appendChild(createLanguageField(profile));
  container.appendChild(createBudgetField(profile));

  return createCard({
    title: "Household Preferences",
    content: container,
  });
}

/**
 * Builds the data management and deletion card.
 * @returns {HTMLElement}
 */
function buildDataManagementCard() {
  const container = document.createElement("div");

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "ui-button secondary btn-danger";
  deleteBtn.textContent = "Delete All My Data";

  deleteBtn.addEventListener("click", () => {
    const confirmP = document.createElement("p");
    confirmP.textContent =
      "This will immediately erase all saved household profiles, window habits, commute details, and win logs from this device. Are you sure?";

    openModal({
      title: "Confirm Data Deletion",
      content: confirmP,
      actions: [
        {
          label: "Yes, Delete Everything",
          isPrimary: true,
          onClick: () => {
            clearProfile();
            announce("All local profile data deleted");
            window.location.hash = "#onboarding";
          },
        },
        { label: "Cancel", onClick: () => {} },
      ],
    });
  });

  container.appendChild(deleteBtn);
  return createCard({
    title: "Data Control",
    content: container,
  });
}

/**
 * Renders the Settings View.
 * @returns {HTMLElement}
 */
export function render() {
  const profile = loadProfile();
  const view = document.createElement("div");
  view.className = "view-settings";

  const h1 = document.createElement("h1");
  h1.className = "view-title";
  h1.textContent = "Settings & About";
  view.appendChild(h1);

  view.appendChild(buildPreferencesCard(profile));
  view.appendChild(buildAboutCard());
  view.appendChild(buildDataManagementCard());

  return view;
}
