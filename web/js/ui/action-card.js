/**
 * @fileoverview Action Card and "Why this?" Modal UI Primitive.
 * Reusable across Today, Swaps, and Community views.
 */

import { estimateImpact } from "../engine/impact.js";
import { openModal } from "./modal.js";
import { createChip } from "./chip.js";

/**
 * Opens "Why this?" modal for an action definition.
 * @param {import("../types.js").ActionDefinition} action
 * @param {import("../types.js").HouseholdProfile} profile
 * @param {number[]} [outdoorPm25]
 */
export function openWhyThisModal(action, profile, outdoorPm25) {
  const pmSeries = outdoorPm25 || new Array(24).fill(150);
  const imp = estimateImpact(action, profile, pmSeries);
  const content = document.createElement("div");

  const lines = [
    `Estimated Exposure Reduction: ${imp.exposureChange.central}% (${imp.exposureChange.low}% - ${imp.exposureChange.high}%)`,
    `Evidence Tier: ${action.evidenceTier === "established" ? "Established Standard (CPCB / WHO)" : "Scientific Model Estimate"}`,
    `Source Citation: ${action.sourceCitation}`,
    `Assumptions: ${imp.assumptions.join("; ")}`,
  ];

  lines.forEach((txt, i) => {
    const p = document.createElement("p");
    if (i > 0) p.style.marginTop = "8px";
    p.textContent = txt;
    content.appendChild(p);
  });

  openModal({
    title: `Why this: ${action.title}`,
    content,
    actions: [{ label: "Close", isPrimary: false, onClick: () => {} }],
  });
}

/**
 * Builds footer action buttons.
 * @param {any} opts
 * @returns {HTMLElement}
 */
function buildActionFooter({
  action,
  profile,
  outdoorPm25,
  isAdopted,
  adoptLabel,
  unadoptLabel,
  onToggleAdopt,
}) {
  const footer = document.createElement("div");
  footer.className = "action-footer";

  const whyBtn = document.createElement("button");
  whyBtn.className = "ui-button secondary";
  whyBtn.style.padding = "2px 8px";
  whyBtn.style.fontSize = "0.75rem";
  whyBtn.textContent = "Why this?";
  whyBtn.addEventListener("click", () => openWhyThisModal(action, profile, outdoorPm25));
  footer.appendChild(whyBtn);

  const adoptBtn = document.createElement("button");
  adoptBtn.className = isAdopted ? "ui-button" : "ui-button secondary";
  adoptBtn.style.padding = "2px 8px";
  adoptBtn.style.fontSize = "0.75rem";
  adoptBtn.textContent = isAdopted ? unadoptLabel : adoptLabel;
  adoptBtn.addEventListener("click", onToggleAdopt);
  footer.appendChild(adoptBtn);

  return footer;
}

/**
 * Creates an accessible action card with Why This modal and adopt toggle.
 *
 * @param {Object} options
 * @param {import("../types.js").ActionDefinition} options.action
 * @param {import("../types.js").HouseholdProfile} options.profile
 * @param {number[]} [options.outdoorPm25]
 * @param {boolean} options.isAdopted
 * @param {string} [options.adoptLabel]
 * @param {string} [options.unadoptLabel]
 * @param {() => void} options.onToggleAdopt
 * @returns {HTMLElement}
 */
export function createActionCard({
  action,
  profile,
  outdoorPm25,
  isAdopted,
  adoptLabel = "+ Adopt Action",
  unadoptLabel = "✓ Adopted",
  onToggleAdopt,
}) {
  const item = document.createElement("div");
  item.className = "action-card-item";

  const header = document.createElement("div");
  header.className = "action-header";
  const title = document.createElement("strong");
  title.textContent = action.title;
  header.appendChild(title);

  const badges = document.createElement("div");
  badges.className = "action-badges";
  badges.appendChild(createChip({ label: action.costBand }));
  badges.appendChild(createChip({ label: `${action.effort} effort` }));
  header.appendChild(badges);
  item.appendChild(header);

  const footer = buildActionFooter({
    action,
    profile,
    outdoorPm25,
    isAdopted,
    adoptLabel,
    unadoptLabel,
    onToggleAdopt,
  });
  item.appendChild(footer);

  return item;
}
