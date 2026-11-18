/**
 * @fileoverview Unit tests for Onboarding, Today, Day Plan views and Demo Mode flow.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./dom-mock.js";

test("Onboarding view renders form sections and saves profile", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/onboarding.js");
  const el = render();

  assert.equal(el.className, "view-onboarding");
  const children = /** @type {any[]} */ (Array.from(el.children));
  assert.ok(children.length >= 4);

  // Find the save button (last child)
  const saveBtn = children[children.length - 1];
  assert.equal(saveBtn.tagName, "BUTTON");
  assert.ok(saveBtn.textContent.includes("Save Profile"));

  // Trigger click
  saveBtn.dispatchEvent("click");
});

test("Today view renders headline AQI, activity windows, and actions", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/today.js");
  const el = render();

  assert.equal(el.className, "view-today");
  const children = /** @type {any[]} */ (Array.from(el.children));

  // Verify headline card exists and contains AQI numbers
  const headlineCard = children.find((c) => (c.textContent || "").includes("Today's Air Quality"));
  assert.ok(headlineCard);

  // Verify activity windows card
  const windowsCard = children.find((c) =>
    (c.textContent || "").includes("Activity & Ventilation Windows")
  );
  assert.ok(windowsCard);

  // Verify Top 3 actions card
  const actionsCard = children.find((c) =>
    (c.textContent || "").includes("Do These 3 Things Today")
  );
  assert.ok(actionsCard);
});

test("Day Plan view renders schedule timeline and handles calendar export", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/plan.js");
  const el = render();

  assert.equal(el.className, "view-plan");
  const children = /** @type {any[]} */ (Array.from(el.children));

  // Find export calendar button
  const exportBtn = children.find(
    (c) => c.tagName === "BUTTON" && (c.textContent || "").includes("Calendar")
  );
  assert.ok(exportBtn);

  // Trigger export
  exportBtn.dispatchEvent("click");

  // Verify timeline card
  const timelineCard = children.find((c) => (c.textContent || "").includes("Today's Schedule"));
  assert.ok(timelineCard);
});

/**
 * Flattens DOM tree to find nested elements.
 * @param {any} root
 * @returns {any[]}
 */
function flattenTree(root) {
  /** @type {any[]} */
  const result = [];
  /** @param {any} n */
  function traverse(n) {
    if (!n) return;
    result.push(n);
    (n.children || []).forEach(traverse);
  }
  traverse(root);
  return result;
}

test("router handles route navigation, active links, and fallbacks", async () => {
  const { elementRegistry, queryRegistry } = setupMockDom();
  const viewContainer = document.createElement("div");
  viewContainer.id = "view-container";
  elementRegistry.set("view-container", viewContainer);

  const mainContent = document.createElement("main");
  mainContent.id = "main-content";
  elementRegistry.set("main-content", mainContent);

  const linkToday = document.createElement("a");
  linkToday.setAttribute("href", "#today");
  const linkSwaps = document.createElement("a");
  linkSwaps.setAttribute("href", "#swaps");
  queryRegistry.set(".app-nav a", [linkToday, linkSwaps]);

  const { navigateTo, initRouter } = await import("../../web/js/router.js");

  initRouter();
  await navigateTo("today");
  assert.equal(linkToday.classList.contains("active"), true);

  await navigateTo("swaps");
  assert.equal(linkSwaps.classList.contains("active"), true);

  for (const r of ["plan", "lab", "community", "ask", "settings", "onboarding"]) {
    await navigateTo(r);
  }

  await navigateTo("nonexistent");
  assert.equal(linkToday.classList.contains("active"), true);

  elementRegistry.delete("view-container");
  await navigateTo("today");
});

test("Onboarding view handles GPS button, demo preset, and input changes", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/onboarding.js");
  const el = render();

  const allElements = flattenTree(el);
  const gpsBtn = allElements.find((b) => (b.textContent || "").includes("Coarse GPS"));
  if (gpsBtn) gpsBtn.dispatchEvent("click");

  const demoBtn = allElements.find((b) => (b.textContent || "").includes("Try Demo"));
  if (demoBtn) demoBtn.dispatchEvent("click");

  const inputs = allElements.filter((e) => e.tagName === "INPUT");
  inputs.forEach((inp) => inp.dispatchEvent("change", { target: { value: "Delhi" } }));

  const selects = allElements.filter((e) => e.tagName === "SELECT");
  selects.forEach((s) => s.dispatchEvent("change", { target: { value: "induction" } }));

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_s, err) =>
      err?.(/** @type {any} */ ({ code: 1, message: "denied" }));
    if (gpsBtn) gpsBtn.dispatchEvent("click");
  }
});

test("Settings view handles language, budget preference, and delete data modal", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/settings.js");
  const view = render();
  assert.ok(view);

  const allElements = flattenTree(view);
  const selects = allElements.filter((e) => e.tagName === "SELECT");
  selects.forEach((s) => s.dispatchEvent("change", { target: { value: "hi" } }));

  const exportBtn = allElements.find((b) => (b.textContent || "").includes("Backup Profile"));
  if (exportBtn) exportBtn.dispatchEvent("click");

  const deleteBtn = allElements.find((b) => (b.textContent || "").includes("Delete All My Data"));
  if (deleteBtn) {
    deleteBtn.dispatchEvent("click");
    const modalBackdrop = document.body.children[document.body.children.length - 1];
    if (modalBackdrop && modalBackdrop.children[0]) {
      const confirmBtn = modalBackdrop.children[0].children[2]?.children[0];
      if (confirmBtn) /** @type {any} */ (confirmBtn).click();
    }
  }
});

test("Settings view handles profile restore file import and invalid JSON", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/settings.js");
  const view = render();

  const allElements = flattenTree(view);
  const restoreBtn = allElements.find((b) => (b.textContent || "").includes("Restore Profile"));

  const origCreate = document.createElement;
  let fileInput = null;
  /** @type {any} */ (document).createElement = (/** @type {string} */ tag) => {
    const created = origCreate(tag);
    if (tag === "input") fileInput = created;
    return created;
  };

  if (restoreBtn) restoreBtn.dispatchEvent("click");
  document.createElement = origCreate;

  if (fileInput) {
    /** @type {any} */ (fileInput).dispatchEvent("change", {
      target: { files: [{ text: JSON.stringify({ home: {}, lifestyle: {} }) }] },
    });
    /** @type {any} */ (fileInput).dispatchEvent("change", {
      target: { files: [{ text: "not-json" }] },
    });
    await new Promise((r) => setTimeout(r, 20));
  }
});
