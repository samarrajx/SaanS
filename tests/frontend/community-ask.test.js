/**
 * @fileoverview Unit tests for Community and Ask views, Notice drafting, and Patch diff/apply/undo.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./dom-mock.js";
import { loadProfile, saveProfile } from "../../web/js/storage.js";

test("Community view renders checklist, toggles audience, and drafts notices", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/community.js");
  const el = render();

  assert.equal(el.className, "view-community");
  const children = Array.from(el.children);
  const title = children.find((c) => c.textContent?.includes("Community Clean-Air Action"));
  assert.ok(title);

  // Mount point holds selector and card
  const mount = children[1];
  const typeSelector = mount.children[0];
  assert.equal(typeSelector.className, "community-type-selector mb-3");
  assert.equal(typeSelector.children.length, 3); // RWA, School, Mohalla

  // Switch to School
  const schoolBtn = /** @type {any} */ (typeSelector.children[1]);
  schoolBtn.dispatchEvent("click");

  // Re-read mount content after switch
  const card = mount.children[1];
  assert.ok(card.textContent.includes("Schools & Educational Institutions"));

  // Check an item (card -> ui-card-body -> content container)
  const cardBody = card.children[1].children[0];
  const checklist = cardBody.children[1];
  const firstRow = checklist.children[0];
  const checkbox = /** @type {any} */ (firstRow.children[0]);
  checkbox.checked = true;
  checkbox.dispatchEvent("change");
  assert.equal(checkbox.checked, true);

  // Trigger Print One-Pager
  const actionsBar = cardBody.children[2];
  const printBtn = /** @type {any} */ (actionsBar.children[1]);
  assert.equal(printBtn.textContent, "🖨️ Print One-Pager");
  printBtn.dispatchEvent("click");

  // Trigger Draft Notice Modal
  const draftBtn = /** @type {any} */ (actionsBar.children[0]);
  assert.equal(draftBtn.textContent, "📢 Draft Notice (AI)");
  draftBtn.dispatchEvent("click");
});

test("Ask view renders prompt pills and handles chat interaction", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/ask.js");
  const el = render();

  assert.equal(el.className, "view-ask");
  const cardBody = el.children[1].children[1].children[0];

  // 4 suggested prompt pills
  const pillsContainer = cardBody.children[0];
  assert.equal(pillsContainer.children.length, 4);

  // Click the purifier CADR prompt
  const purifierPill = /** @type {any} */ (pillsContainer.children[2]);
  purifierPill.dispatchEvent("click");
  await new Promise((r) => setTimeout(r, 50));

  // Chat log now has user query and assistant response
  const chatLog = cardBody.children[1];
  assert.ok(chatLog.children.length >= 2);

  // Test custom form submission
  const form = /** @type {any} */ (cardBody.children[2]);
  const input = form.children[0];
  input.value = "What about outdoor exercise?";
  form.dispatchEvent("submit");
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(chatLog.children.length >= 4);
});

test("Ask view renders patch diff box and supports apply and undo", async () => {
  setupMockDom();
  const profile = loadProfile();
  profile.home.purifier = { has: false };
  saveProfile(profile);

  const { render } = await import("../../web/js/views/ask.js");
  const el = render();
  const cardBody = el.children[1].children[1].children[0];

  const pill = /** @type {any} */ (cardBody.children[0].children[2]);
  pill.dispatchEvent("click");
  await new Promise((r) => setTimeout(r, 50));

  const chatLog = cardBody.children[1];
  const lastBubble = chatLog.children[chatLog.children.length - 1];
  const btnGroup = lastBubble.children[1].children[1];
  const applyBtn = /** @type {any} */ (btnGroup.children[0]);
  const undoBtn = /** @type {any} */ (btnGroup.children[1]);

  // Click Apply
  applyBtn.dispatchEvent("click");
  assert.equal(applyBtn.textContent, "✓ Applied");
  assert.equal(loadProfile().home.purifier?.has, true);

  // Click Undo
  undoBtn.dispatchEvent("click");
  assert.equal(applyBtn.textContent, "Apply to Profile");
  assert.equal(loadProfile().home.purifier?.has, false);
});

test("Settings view supports JSON backup export and data wipe confirmation", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/settings.js");
  const el = render();

  assert.equal(el.className, "view-settings");
  const children = Array.from(el.children);
  const dataCard = children.find((c) => c.textContent?.includes("Data Control"));
  assert.ok(dataCard);

  const dataBody = dataCard.children[1].children[0];
  const btnRow = dataBody.children[0];
  const backupBtn = /** @type {any} */ (btnRow.children[0]);
  assert.ok(backupBtn.textContent.includes("Backup Profile"));
  backupBtn.dispatchEvent("click");

  const deleteBtn = /** @type {any} */ (dataBody.children[1]);
  assert.ok(deleteBtn.textContent.includes("Delete All My Data"));
  deleteBtn.dispatchEvent("click");
});
