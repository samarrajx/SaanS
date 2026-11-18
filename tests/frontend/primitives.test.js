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
