/**
 * @fileoverview Settings and About View.
 * Handles language selection, location preference, data attributions,
 * privacy explanations, and full data deletion with confirmation modal.
 */

import { loadProfile, saveProfile, clearProfile, validateAndMigrateProfile } from "../storage.js";
import { createCard } from "../ui/card.js";
import { createFormField } from "../ui/form-field.js";
import { openModal } from "../ui/modal.js";
import { announce } from "../ui/announcer.js";

/**
 * Downloads current household profile as a JSON file.
 * @param {import("../types.js").HouseholdProfile} profile
 */
function exportProfile(profile) {
  const jsonStr = JSON.stringify(profile, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saans-profile-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  announce("Profile backup downloaded");
}

/**
 * Imports and validates an uploaded JSON profile.
 * @param {File} file
 */
function handleFileImport(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(/** @type {string} */ (event.target?.result));
      const migrated = validateAndMigrateProfile(parsed);
      saveProfile(migrated);
      announce("Profile imported successfully");
    } catch {
      announce("Failed to import profile: invalid JSON");
    }
  };
  reader.readAsText(file);
}

/**
 * Triggers file picker to import profile JSON.
 */
function triggerImportProfile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", (e) => {
    const file = /** @type {HTMLInputElement} */ (e.target)?.files?.[0];
    if (file) handleFileImport(file);
  });
  input.click();
}

/**
 * Builds the data attribution and disclaimer card.
 * @returns {HTMLElement}
 */
function buildAboutCard() {
  const container = document.createElement("div");
  const paragraphs = [
    {
      text: "Air quality forecast data is provided by CAMS ENSEMBLE via Open-Meteo under CC BY 4.0. Spatial resolution is ~25-45 km model estimate.",
      cls: "settings-text",
    },
    {
      text: "Disclaimer: Saans estimates are for daily planning and low-emission routines, not medical advice or diagnosis. For severe respiratory symptoms, consult a healthcare provider.",
      cls: "settings-text text-muted",
    },
    {
      text: "Privacy: Your household profile is stored strictly inside your browser's local storage. Only coarse flags are sent to the serverless engine when generating personalized day plans.",
      cls: "settings-text text-muted",
    },
  ];
  paragraphs.forEach(({ text, cls }) => {
    const p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    container.appendChild(p);
  });
  return createCard({ title: "About & Data Attribution", content: container });
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
      profile.language = /** @type {import("../types.js").LanguageCode} */ (val);
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
      profile.lifestyle.budgetBand = /** @type {import("../types.js").BudgetBand} */ (val);
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
 * Creates the data wipe button with confirmation modal.
 * @returns {HTMLButtonElement}
 */
function createDeleteButton() {
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
  return deleteBtn;
}

/**
 * Builds the data management and deletion card.
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLElement}
 */
function buildDataManagementCard(profile) {
  const container = document.createElement("div");

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;";

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "ui-button secondary";
  exportBtn.textContent = "💾 Backup Profile (JSON)";
  exportBtn.addEventListener("click", () => exportProfile(profile));

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "ui-button secondary";
  importBtn.textContent = "📥 Restore Profile (JSON)";
  importBtn.addEventListener("click", triggerImportProfile);

  btnRow.appendChild(exportBtn);
  btnRow.appendChild(importBtn);
  container.appendChild(btnRow);
  container.appendChild(createDeleteButton());

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
  view.appendChild(buildDataManagementCard(profile));

  return view;
}
