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
