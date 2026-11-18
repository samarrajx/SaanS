/**
 * @fileoverview Reusable Patch Diff Card UI Primitive.
 * Displays proposed allowlisted profile changes with Apply and Undo actions.
 */

import { saveProfile } from "../storage.js";
import { announce } from "./announcer.js";
import { applyPatch } from "../engine/patch.js";

/**
 * Wire up apply and undo buttons for a patch.
 * @param {HTMLButtonElement} applyBtn
 * @param {HTMLButtonElement} undoBtn
 * @param {any} patch
 * @param {import("../types.js").HouseholdProfile} profile
 */
function wirePatchButtons(applyBtn, undoBtn, patch, profile) {
  let prevProfile = JSON.parse(JSON.stringify(profile));
  applyBtn.addEventListener("click", () => {
    prevProfile = JSON.parse(JSON.stringify(profile));
    const result = applyPatch(profile, patch);
    if (result.success) {
      saveProfile(result.updatedProfile);
      applyBtn.textContent = "✓ Applied";
      applyBtn.disabled = true;
      undoBtn.style.display = "inline-block";
      announce(`Applied update: ${result.diff}`);
    }
  });

  undoBtn.addEventListener("click", () => {
    saveProfile(prevProfile);
    applyBtn.textContent = "Apply to Profile";
    applyBtn.disabled = false;
    undoBtn.style.display = "none";
    announce("Reverted profile update");
  });
}

/**
 * Creates an accessible diff card with Apply and Undo actions.
 * @param {Object} options
 * @param {any} options.patch
 * @param {import("../types.js").HouseholdProfile} options.profile
 * @returns {HTMLDivElement}
 */
export function createPatchDiffBox({ patch, profile }) {
  const box = document.createElement("div");
  box.className = "patch-diff-box";

  const title = document.createElement("p");
  title.className = "patch-title";
  title.textContent = `💡 Suggested Profile Update: ${patch.op}`;
  box.appendChild(title);

  const btnGroup = document.createElement("div");
  btnGroup.className = "patch-btn-group";

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "ui-button primary";
  applyBtn.textContent = "Apply to Profile";

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "ui-button secondary";
  undoBtn.textContent = "Undo";
  undoBtn.style.display = "none";

  wirePatchButtons(applyBtn, undoBtn, patch, profile);

  btnGroup.appendChild(applyBtn);
  btnGroup.appendChild(undoBtn);
  box.appendChild(btnGroup);
  return box;
}
