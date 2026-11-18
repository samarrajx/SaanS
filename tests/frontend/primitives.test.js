import test from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./dom-mock.js";

// Initialize mock DOM before loading UI components
setupMockDom();

const { createCard } = await import("../../web/js/ui/card.js");
const { createChip } = await import("../../web/js/ui/chip.js");
const { createFormField } = await import("../../web/js/ui/form-field.js");
const { createDataTable } = await import("../../web/js/ui/data-table.js");
const { createInlineForm } = await import("../../web/js/ui/inline-form.js");
const { createLineChart } = await import("../../web/js/ui/chart-line.js");
const { createTabs } = await import("../../web/js/ui/tabs.js");
const { announce } = await import("../../web/js/ui/announcer.js");

test("createCard builds structured accessible container", () => {
  const p = document.createElement("p");
  p.textContent = "Card body";
  const card = createCard({ title: "My Card", content: p });

  assert.equal(card.tagName, "SECTION");
  assert.equal(card.className, "ui-card");
  assert.equal(card.children[0].textContent, "My Card");
});

test("createChip pairs category with icon and non-color cue", () => {
  const chip = createChip({ label: "Severe", category: "Severe" });
  assert.ok(chip.className.includes("chip-aqi-severe"));
  assert.ok(
    /** @type {any} */ (chip).children.some((/** @type {any} */ c) => c.textContent === "⚠️")
  );

  const customChip = createChip({ label: "Custom", title: "Tooltip", icon: "✨" });
  assert.equal(customChip.getAttribute("title"), "Tooltip");
  const fallbackChip = createChip({ label: "Fallback", category: "Unknown" });
  assert.ok(fallbackChip);
});

test("createInlineForm handles submission cleanly", () => {
  let submitted = "";
  const form = createInlineForm({
    id: "search",
    placeholder: "Search city",
    buttonLabel: "Search",
    onSubmit: (val) => {
      submitted = val;
    },
  });

  const input = /** @type {any} */ (form).children[0];
  input.value = "Patna";
  /** @type {any} */ (form).dispatchEvent("submit", { preventDefault: () => {} });
  assert.equal(submitted, "Patna");

  const formEmpty = createInlineForm({ id: "empty", buttonLabel: "Send", onSubmit: () => {} });
  /** @type {any} */ (formEmpty).children[0].value = "   ";
  /** @type {any} */ (formEmpty).dispatchEvent("submit", { preventDefault: () => {} });
});

test("createFormField links label for and input id", () => {
  let changed = "";
  const field = createFormField({
    id: "test-input",
    label: "Full Name",
    value: "Initial",
    onChange: (val) => {
      changed = val;
    },
  });

  const label = field.children[0];
  const input = field.children[1];
  assert.equal(label.getAttribute("for"), "test-input");
  assert.equal(input.id, "test-input");

  /** @type {any} */ (input).dispatchEvent("change", { target: { value: "Updated" } });
  assert.equal(changed, "Updated");
});

test("createFormField supports select and checkbox types with helpText", () => {
  let cbVal = "";
  const cbField = createFormField({
    id: "has-purifier",
    label: "Purifier",
    type: "checkbox",
    value: true,
    helpText: "Check if active",
    onChange: (val) => {
      cbVal = val;
    },
  });
  const cbInput = cbField.children[1];
  assert.equal(/** @type {any} */ (cbInput).checked, true);
  /** @type {any} */ (cbInput).dispatchEvent("change", { target: { checked: false } });
  assert.equal(cbVal, "false");

  const selectField = createFormField({
    id: "fuel-select",
    label: "Fuel",
    type: "select",
    value: "lpg",
    options: [
      { label: "LPG", value: "lpg" },
      { label: "Induction", value: "elec" },
    ],
  });
  assert.equal(selectField.children[1].tagName, "SELECT");
  assert.equal(/** @type {any} */ (selectField.children[1]).children[0].selected, true);
});

test("createDataTable builds semantic table with col-scoped headers", () => {
  const table = createDataTable({
    headers: ["Hour", "PM2.5"],
    rows: [
      ["08:00", 250],
      ["09:00", 220],
    ],
    caption: "Hourly PM Table",
  });

  assert.equal(table.tagName, "TABLE");
  const thead = /** @type {any} */ (table).children.find(
    (/** @type {any} */ c) => c.tagName === "THEAD"
  );
  assert.ok(thead);
  const th = thead.children[0].children[0];
  assert.equal(th.getAttribute("scope"), "col");

  const elCell = document.createElement("span");
  elCell.textContent = "Inner";
  const tableWithEl = createDataTable({
    headers: ["A"],
    rows: [[elCell], [/** @type {any} */ (null)]],
  });
  assert.ok(tableWithEl);
});

test("createLineChart supports chart and table toggling", () => {
  const chart = createLineChart({
    title: "Diurnal Air",
    series: [{ name: "PM2.5", values: [100, 150, 200], color: "#b91c1c" }],
    labels: ["00:00", "01:00", "02:00"],
  });

  const btn = chart.children[0].children[1];
  assert.equal(btn.textContent, "View Table");

  /** @type {any} */ (btn).dispatchEvent("click");
  assert.equal(btn.textContent, "View Chart");
});

test("createTabs supports keyboard navigation and tab switching", () => {
  let activeTab = "tab1";
  const p1 = document.createElement("p");
  const p2 = document.createElement("p");
  const container = createTabs({
    tabs: [
      { id: "tab1", label: "Tab 1", render: () => p1 },
      { id: "tab2", label: "Tab 2", render: () => p2 },
    ],
    onTabChange: (id) => {
      activeTab = id;
    },
  });

  const tabList = container.children[0];
  const btn1 = tabList.children[0];
  const btn2 = tabList.children[1];

  // Click tab 2
  /** @type {any} */ (btn2).click();
  assert.equal(activeTab, "tab2");

  // Keyboard navigation on tablist
  Object.defineProperty(document, "activeElement", { value: btn1, configurable: true });
  /** @type {any} */ (tabList).dispatchEvent("keydown", { key: "ArrowRight" });
  /** @type {any} */ (tabList).dispatchEvent("keydown", { key: "ArrowLeft" });
  /** @type {any} */ (tabList).dispatchEvent("keydown", { key: "Enter" });
});

test("createCard supports subtitle, array content, footer, className, and ariaLabel", () => {
  const c1 = document.createElement("p");
  const c2 = document.createElement("p");
  const foot = document.createElement("footer");

  const card = createCard({
    title: "Comprehensive Card",
    subtitle: "Helpful Subtitle",
    content: [c1, c2],
    footer: foot,
    className: "highlight-card",
    ariaLabel: "Card Description",
  });

  assert.equal(card.getAttribute("aria-label"), "Card Description");
  assert.ok(card.className.includes("highlight-card"));
  assert.equal(card.children.length, 4);
});

test("announce broadcasts live region updates", async () => {
  const { elementRegistry } = setupMockDom();
  const announcer = document.createElement("div");
  announcer.id = "app-announcer";
  elementRegistry.set("app-announcer", announcer);

  announce("Immediate hazard alert", "assertive");
  assert.equal(announcer.getAttribute("aria-live"), "assertive");
  announce("Default polite alert");
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(announcer.textContent, "Default polite alert");

  // Call announce when element does not exist
  elementRegistry.set("app-announcer", null);
  announce("No failure without announcer");

  // Call announce when document is undefined
  const origDoc = globalThis.document;
  delete (/** @type {any} */ (globalThis).document);
  announce("Without document");
  globalThis.document = origDoc;
});

test("createTabs ignores keydown when active element is not a tab button", () => {
  const container = createTabs({
    tabs: [{ id: "t1", label: "T1", render: () => document.createElement("div") }],
  });
  const tabList = container.children[0];
  Object.defineProperty(document, "activeElement", { value: document.body, configurable: true });
  /** @type {any} */ (tabList).dispatchEvent("keydown", { key: "ArrowRight" });
  /** @type {any} */ (tabList).dispatchEvent("keydown", { key: "Escape" });
});

test("createLineChart toggles between chart and data table back and forth", () => {
  const chart = createLineChart({
    title: "Diurnal PM",
    series: [{ name: "PM2.5", values: [80, 120, 160], color: "#ef4444" }],
    labels: ["00:00", "01:00", "02:00"],
    unit: "µg/m³",
  });

  const toggleBtn = chart.children[0].children[1];
  assert.equal(toggleBtn.textContent, "View Table");

  /** @type {any} */ (toggleBtn).click();
  assert.equal(toggleBtn.textContent, "View Chart");

  /** @type {any} */ (toggleBtn).click();
  assert.equal(toggleBtn.textContent, "View Table");
});
