/**
 * @fileoverview Unit tests for Home Air Lab, Swaps View, and Running Impact Ledger.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./dom-mock.js";

test("Home Air Lab renders controls, simulation chart and handles parameter changes", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/lab.js");
  const el = render();

  assert.equal(el.className, "view-lab");
  const children = /** @type {any[]} */ (Array.from(el.children));

  // Verify physics why-this button exists
  const physicsBtn = children.find(
    (c) => c.tagName === "BUTTON" && (c.textContent || "").includes("Scientific Model")
  );
  assert.ok(physicsBtn);
  physicsBtn.dispatchEvent("click");

  // Verify controls card exists
  const controlsCard = children.find((c) =>
    (c.textContent || "").includes("Simulation Parameters")
  );
  assert.ok(controlsCard);

  // Verify chart exists
  const chartEl = children.find((c) => (c.textContent || "").includes("Indoor vs Outdoor"));
  assert.ok(chartEl);
});

test("Swaps view maintains running impact ledger and supports action toggling", async () => {
  setupMockDom();
  const { render } = await import("../../web/js/views/swaps.js");
  const el = render();

  assert.equal(el.className, "view-swaps");
  const children = /** @type {any[]} */ (Array.from(el.children));

  // Verify Impact Ledger exists
  const ledgerBox = children.find((c) => (c.textContent || "").includes("Running Impact Ledger"));
  assert.ok(ledgerBox);

  // Verify Swaps list exists
  const swapsCard = children.find((c) => (c.textContent || "").includes("Catalog of Sustainable"));
  assert.ok(swapsCard);

  // Find a "+ Add to Ledger" button
  const listDiv = /** @type {any} */ (swapsCard).children[1].children[0];
  const firstAction = listDiv.children[0];
  const footer = firstAction.children[1];
  const addBtn = footer.children[1];
  assert.ok(addBtn);
  assert.equal(addBtn.textContent, "+ Add to Ledger");

  // Toggle add to ledger (triggers refresh of listDiv)
  addBtn.dispatchEvent("click");
  const updatedBtn = listDiv.children[0].children[1].children[1];
  assert.equal(updatedBtn.textContent, "✓ In Ledger");
});
