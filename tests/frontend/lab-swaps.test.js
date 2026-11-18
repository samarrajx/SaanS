/**
 * @fileoverview Unit tests for Home Air Lab, Swaps View, and Running Impact Ledger.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./dom-mock.js";

const { openModal } = await import("../../web/js/ui/modal.js");
const { createActionCard, openWhyThisModal } = await import("../../web/js/ui/action-card.js");
const { ACTIONS_CATALOG } = await import("../../web/js/engine/actions.js");
const { getDefaultProfile } = await import("../../web/js/storage.js");

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

  // Exercise intervention and window habit dropdown changes
  const cardBody = controlsCard.children[1].children[0];
  const form = cardBody.children[0];
  const selects = Array.from(form.children).flatMap((c) =>
    Array.from(c.children || []).filter((el) => el.tagName === "SELECT")
  );
  if (selects[0]) {
    selects[0].dispatchEvent("change", { target: { value: "hepa" } });
    selects[0].dispatchEvent("change", { target: { value: "hepa_pro" } });
  }
  if (selects[1]) {
    selects[1].dispatchEvent("change", { target: { value: "closed" } });
  }
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

  // Toggle remove from ledger
  updatedBtn.dispatchEvent("click");
  assert.equal(listDiv.children[0].children[1].children[1].textContent, "+ Add to Ledger");
});

test("openModal supports action click and close method", () => {
  setupMockDom();
  let closed = false;
  let actionClicked = false;
  const content = document.createElement("p");
  content.textContent = "Modal Body";

  const modal = openModal({
    title: "Test Dialog",
    content,
    actions: [
      {
        label: "Confirm",
        isPrimary: true,
        onClick: () => {
          actionClicked = true;
        },
      },
    ],
    onClose: () => {
      closed = true;
    },
  });

  assert.equal(modal.element.className, "ui-modal-backdrop");
  assert.equal(Array.from(document.body.children).includes(modal.element), true);

  const actionBtn = modal.element.children[0].children[2].children[0];
  /** @type {any} */ (actionBtn).click();
  assert.equal(actionClicked, true);
  assert.equal(closed, true);

  // Close method API
  const modal2 = openModal({ title: "Close API", content: document.createElement("span") });
  modal2.close();
});

test("openModal handles backdrop and header close button click", () => {
  setupMockDom();
  let backdropClosed = false;
  const modal = openModal({
    title: "Backdrop",
    content: document.createElement("span"),
    onClose: () => {
      backdropClosed = true;
    },
  });
  // Click on dialog child (not backdrop itself) does not close
  /** @type {any} */ (modal.element).dispatchEvent("click", {
    target: modal.element.children[0],
  });
  assert.equal(backdropClosed, false);

  // Click on header close button closes modal
  const closeBtn = modal.element.children[0].children[0].children[1];
  /** @type {any} */ (closeBtn).click();
  assert.equal(backdropClosed, true);
});

test("openModal handles Escape key dismissal", () => {
  setupMockDom();
  let escapeClosed = false;
  openModal({
    title: "Escape Dialog",
    content: document.createElement("span"),
    onClose: () => {
      escapeClosed = true;
    },
  });
  /** @type {any} */ (document).dispatchEvent("keydown", { key: "Escape" });
  assert.equal(escapeClosed, true);
});

test("openWhyThisModal and createActionCard render complete actions and handle events", () => {
  setupMockDom();
  const profile = getDefaultProfile();
  const action = ACTIONS_CATALOG[0];

  openWhyThisModal(action, profile);
  assert.ok(document.body.children.length > 0);
  const lastModal = document.body.children[document.body.children.length - 1];
  const closeBtn = /** @type {any} */ (lastModal)?.children[0]?.children[2]?.children[0];
  if (closeBtn) /** @type {any} */ (closeBtn).click();

  let adopted = false;
  const card = createActionCard({
    action,
    profile,
    outdoorPm25: [120, 150],
    isAdopted: false,
    onToggleAdopt: () => {
      adopted = true;
    },
  });

  assert.equal(card.className, "action-card-item");
  const footer = card.children[1];
  const whyBtn = footer.children[0];
  const adoptBtn = footer.children[1];

  /** @type {any} */ (whyBtn).click();
  /** @type {any} */ (adoptBtn).click();
  assert.equal(adopted, true);

  const cardAdopted = createActionCard({
    action,
    profile,
    isAdopted: true,
    onToggleAdopt: () => {},
  });
  const adoptBtn2 = cardAdopted.children[1].children[1];
  assert.equal(adoptBtn2.textContent, "✓ Adopted");
});
