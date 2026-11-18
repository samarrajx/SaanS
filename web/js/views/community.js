/**
 * @fileoverview Community Clean-Air Action View.
 * Provides collective action checklists for RWAs, schools, and mohallas,
 * print-friendly circulars, and multi-channel notice generation.
 */

import { loadProfile } from "../storage.js";
import { createCard } from "../ui/card.js";
import { openModal } from "../ui/modal.js";
import { createTabs } from "../ui/tabs.js";
import { announce } from "../ui/announcer.js";
import {
  COMMUNITY_TEMPLATES,
  getCommunityChecklist,
  createBaselineNotice,
} from "../engine/community.js";

/**
 * Copies text safely to clipboard and announces to screen readers.
 * @param {string} text
 * @param {HTMLButtonElement} btn
 */
async function copyToClipboard(text, btn) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // Fallback if clipboard API is restricted
  }
  const original = btn.textContent;
  btn.textContent = "✓ Copied!";
  announce("Copied notice to clipboard");
  setTimeout(() => {
    btn.textContent = original;
  }, 2000);
}

/**
 * Builds a channel tab panel with copy action.
 * @param {string} text
 * @returns {HTMLDivElement}
 */
function buildChannelPanel(text) {
  const panel = document.createElement("div");
  panel.className = "notice-channel-panel";

  const pre = document.createElement("pre");
  pre.className = "notice-text-content";
  pre.textContent = text;
  panel.appendChild(pre);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "ui-button primary";
  copyBtn.textContent = "📋 Copy to Clipboard";
  copyBtn.addEventListener("click", () => copyToClipboard(text, copyBtn));
  panel.appendChild(copyBtn);

  return panel;
}

/**
 * Fetches notice from API with offline baseline fallback.
 * @param {string} type
 * @param {import("../types.js").AQICategory} category
 * @param {string} lang
 * @param {Array<{ id: string, text: string }>} checklist
 * @returns {Promise<{ whatsapp: string, email: string, noticeBoard: string }>}
 */
async function fetchNotice(type, category, lang, checklist) {
  try {
    const res = await fetch("/api/notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityType: type, category, language: lang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.channels) return data.channels;
    }
  } catch {
    // Network offline or API unavailable
  }
  return createBaselineNotice(/** @type {any} */ (type), category, checklist);
}

/**
 * Opens notice modal with multi-channel copy tabs.
 * @param {"rwa" | "school" | "mohalla"} type
 * @param {import("../types.js").AQICategory} category
 * @param {import("../types.js").HouseholdProfile} profile
 */
async function openNoticeDraftModal(type, category, profile) {
  const checklist = getCommunityChecklist(type, category);
  const container = document.createElement("div");
  container.className = "notice-modal-body";

  const loadingP = document.createElement("p");
  loadingP.textContent = "Drafting community circular...";
  container.appendChild(loadingP);

  openModal({
    title: `Draft Circular: ${COMMUNITY_TEMPLATES[type].name}`,
    content: container,
    actions: [{ label: "Close", onClick: () => {} }],
  });

  const channels = await fetchNotice(type, category, profile.language, checklist);
  container.replaceChildren(
    createTabs({
      tabs: [
        { id: "wa", label: "WhatsApp Text", render: () => buildChannelPanel(channels.whatsapp) },
        { id: "email", label: "Formal Email", render: () => buildChannelPanel(channels.email) },
        { id: "board", label: "Notice Board", render: () => buildChannelPanel(channels.noticeBoard) },
      ],
    })
  );
  announce("Notice draft ready across 3 channels");
}

/**
 * Builds the interactive checklist DOM nodes.
 * @param {Array<{ id: string, text: string }>} items
 * @returns {HTMLDivElement}
 */
function buildChecklistElements(items) {
  const container = document.createElement("div");
  container.className = "community-checklist";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "checklist-row";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = `chk-${item.id}`;
    chk.addEventListener("change", () => {
      announce(`${chk.checked ? "Checked" : "Unchecked"} ${item.text.slice(0, 30)}`);
    });

    const label = document.createElement("label");
    label.htmlFor = `chk-${item.id}`;
    label.textContent = item.text;

    row.appendChild(chk);
    row.appendChild(label);
    container.appendChild(row);
  });
  return container;
}

/**
 * Builds the community action checklist card.
 * @param {"rwa" | "school" | "mohalla"} type
 * @param {import("../types.js").AQICategory} category
 * @param {import("../types.js").HouseholdProfile} profile
 * @returns {HTMLElement}
 */
function buildChecklistCard(type, category, profile) {
  const template = COMMUNITY_TEMPLATES[type];
  const items = getCommunityChecklist(type, category);

  const container = document.createElement("div");
  const p = document.createElement("p");
  p.className = "text-muted mb-3";
  p.textContent = `${template.description} Displaying actions for ${category} AQI tier:`;
  container.appendChild(p);

  container.appendChild(buildChecklistElements(items));

  const actionsRow = document.createElement("div");
  actionsRow.className = "community-actions-bar mt-3";

  const draftBtn = document.createElement("button");
  draftBtn.type = "button";
  draftBtn.className = "ui-button primary";
  draftBtn.textContent = "📢 Draft Notice (AI)";
  draftBtn.addEventListener("click", () => openNoticeDraftModal(type, category, profile));

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "ui-button secondary";
  printBtn.textContent = "🖨️ Print One-Pager";
  printBtn.addEventListener("click", () => {
    announce("Opening print view");
    if (typeof window !== "undefined" && window.print) window.print();
  });

  actionsRow.appendChild(draftBtn);
  actionsRow.appendChild(printBtn);
  container.appendChild(actionsRow);

  return createCard({
    title: `${template.name} - Clean Air Protocol`,
    content: container,
  });
}

/**
 * Builds the community type selection buttons.
 * @param {"rwa" | "school" | "mohalla"} currentType
 * @param {(type: "rwa" | "school" | "mohalla") => void} onSelect
 * @returns {HTMLDivElement}
 */
function buildTypeSelector(currentType, onSelect) {
  const container = document.createElement("div");
  container.className = "community-type-selector mb-3";

  const types = /** @type {Array<"rwa" | "school" | "mohalla">} */ (["rwa", "school", "mohalla"]);
  types.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ui-button ${currentType === t ? "primary" : "secondary"}`;
    btn.textContent = COMMUNITY_TEMPLATES[t].name.split("(")[0].trim();
    btn.addEventListener("click", () => onSelect(t));
    container.appendChild(btn);
  });
  return container;
}

/**
 * Renders the Community View.
 * @returns {HTMLElement}
 */
export function render() {
  const profile = loadProfile();
  const view = document.createElement("div");
  view.className = "view-community";

  const h1 = document.createElement("h1");
  h1.className = "view-title";
  h1.textContent = "Community Clean-Air Action 🏘️";
  view.appendChild(h1);

  /** @type {"rwa" | "school" | "mohalla"} */
  let currentType = "rwa";
  /** @type {import("../types.js").AQICategory} */
  const category = profile.isDemo ? "Severe" : "Very Poor";

  const mountPoint = document.createElement("div");

  function refresh() {
    mountPoint.replaceChildren(
      buildTypeSelector(currentType, (newType) => {
        currentType = newType;
        refresh();
      }),
      buildChecklistCard(currentType, category, profile)
    );
  }

  refresh();
  view.appendChild(mountPoint);
  return view;
}
