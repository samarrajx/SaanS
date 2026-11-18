import test from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./dom-mock.js";

setupMockDom();

const { createCard } = await import("../../web/js/ui/card.js");
const { createChip } = await import("../../web/js/ui/chip.js");
const { createFormField } = await import("../../web/js/ui/form-field.js");
const { createDataTable } = await import("../../web/js/ui/data-table.js");
const { createInlineForm } = await import("../../web/js/ui/inline-form.js");
const { createLineChart } = await import("../../web/js/ui/chart-line.js");
const { createBarChart } = await import("../../web/js/ui/chart-bars.js");
const { createTabs } = await import("../../web/js/ui/tabs.js");

test("characterisation: createCard structure and attributes", () => {
  const bodyEl = document.createElement("p");
  bodyEl.textContent = "Body content";
  const footEl = document.createElement("div");
  footEl.textContent = "Footer content";
  const card = createCard({
    title: "Card Title",
    subtitle: "Card Subtitle",
    content: bodyEl,
    footer: footEl,
    className: "custom-card",
    ariaLabel: "Accessible Card",
  });
  assert.equal(card.tagName, "SECTION");
  assert.equal(card.className, "ui-card custom-card");
  assert.equal(card.getAttribute("aria-label"), "Accessible Card");
  assert.equal(card.children[0].tagName, "H2");
  assert.equal(card.children[0].className, "ui-card-title");
  assert.equal(card.children[0].textContent, "Card Title");
  assert.equal(card.children[1].tagName, "P");
  assert.equal(card.children[1].className, "ui-card-subtitle");
  assert.equal(card.children[1].textContent, "Card Subtitle");
  assert.equal(card.children[2].tagName, "DIV");
  assert.equal(card.children[2].className, "ui-card-body");
  assert.equal(card.children[2].children[0].textContent, "Body content");
  assert.equal(card.children[3].tagName, "DIV");
  assert.equal(card.children[3].className, "ui-card-footer");
  assert.equal(card.children[3].children[0].textContent, "Footer content");
});

test("characterisation: createChip structure and attributes", () => {
  const chip = createChip({
    label: "Severe Smog",
    category: "Severe",
    title: "Severe PM2.5 level",
    icon: "⚠️",
  });
  assert.equal(chip.tagName, "SPAN");
  assert.equal(chip.className, "ui-chip chip-aqi-severe");
  assert.equal(chip.getAttribute("title"), "Severe PM2.5 level");
  assert.equal(chip.getAttribute("aria-label"), "Severe Smog: Severe PM2.5 level");
  assert.equal(chip.children[0].className, "chip-icon");
  assert.equal(chip.children[0].textContent, "⚠️");
  assert.equal(chip.children[1].className, "chip-text");
  assert.equal(chip.children[1].textContent, "Severe Smog");
});

test("characterisation: createInlineForm structure and attributes", () => {
  const form = createInlineForm({
    id: "search-form",
    placeholder: "Search locality...",
    buttonLabel: "Go",
    onSubmit: () => {},
  });
  assert.equal(form.tagName, "FORM");
  assert.equal(form.className, "ui-inline-form");
  const formInput = /** @type {any} */ (form).children[0];
  assert.equal(formInput.tagName, "INPUT");
  assert.equal(formInput.id, "search-form");
  assert.equal(formInput.className, "ui-input inline-input");
  assert.equal(formInput.type, "text");
  assert.equal(formInput.placeholder, "Search locality...");
  assert.equal(formInput.getAttribute("aria-label"), "Search locality...");
  const formBtn = /** @type {any} */ (form).children[1];
  assert.equal(formBtn.tagName, "BUTTON");
  assert.equal(formBtn.type, "submit");
  assert.equal(formBtn.className, "ui-button inline-submit");
  assert.equal(formBtn.textContent, "Go");
});

test("characterisation: createFormField structure and attributes", () => {
  const formField = createFormField({
    id: "user-name",
    label: "Your Name",
    type: "text",
    value: "Aarav",
    helpText: "Enter full name",
  });
  assert.equal(formField.tagName, "DIV");
  assert.equal(formField.className, "ui-form-field");
  assert.equal(formField.children[0].tagName, "LABEL");
  assert.equal(formField.children[0].getAttribute("for"), "user-name");
  assert.equal(formField.children[0].textContent, "Your Name");
  const inputEl = /** @type {any} */ (formField).children[1];
  assert.equal(inputEl.tagName, "INPUT");
  assert.equal(inputEl.id, "user-name");
  assert.equal(inputEl.value, "Aarav");
  assert.equal(inputEl.className, "ui-input");
  assert.equal(inputEl.getAttribute("aria-describedby"), "user-name-help");
  assert.equal(formField.children[2].tagName, "SMALL");
  assert.equal(formField.children[2].id, "user-name-help");
  assert.equal(formField.children[2].className, "ui-help-text");
  assert.equal(formField.children[2].textContent, "Enter full name");
});

test("characterisation: createDataTable structure and attributes", () => {
  const table = createDataTable({
    headers: ["Hour", "PM2.5"],
    rows: [["00:00", 120]],
    caption: "Midnight Air",
  });
  assert.equal(table.tagName, "TABLE");
  assert.equal(table.className, "ui-data-table");
  assert.equal(table.children[0].tagName, "CAPTION");
  assert.equal(table.children[0].textContent, "Midnight Air");
  assert.equal(table.children[1].tagName, "THEAD");
  assert.equal(table.children[1].children[0].children[0].tagName, "TH");
  assert.equal(table.children[1].children[0].children[0].getAttribute("scope"), "col");
  assert.equal(table.children[1].children[0].children[0].textContent, "Hour");
  assert.equal(table.children[2].tagName, "TBODY");
  assert.equal(table.children[2].children[0].children[0].tagName, "TD");
  assert.equal(table.children[2].children[0].children[0].textContent, "00:00");
});

test("characterisation: createTabs structure and attributes", () => {
  const t1Panel = document.createElement("div");
  t1Panel.textContent = "Panel 1";
  const tabs = createTabs({
    tabs: [{ id: "tab-a", label: "Overview", render: () => t1Panel }],
  });
  assert.equal(tabs.tagName, "DIV");
  assert.equal(tabs.className, "ui-tabs");
  const tabList = tabs.children[0];
  assert.equal(tabList.tagName, "DIV");
  assert.equal(tabList.className, "ui-tablist");
  assert.equal(tabList.getAttribute("role"), "tablist");
  const tabBtn = tabList.children[0];
  assert.equal(tabBtn.getAttribute("role"), "tab");
  assert.equal(tabBtn.getAttribute("aria-selected"), "true");
  assert.equal(tabBtn.textContent, "Overview");
  const tabPanel = tabs.children[1];
  assert.equal(tabPanel.getAttribute("role"), "tabpanel");
  assert.equal(tabPanel.children[0].textContent, "Panel 1");
});

test("characterisation: createLineChart and createBarChart structure", () => {
  const lineChart = createLineChart({
    title: "Diurnal Line",
    series: [{ name: "PM", values: [100, 150], color: "#ef4444" }],
    labels: ["00:00", "01:00"],
    unit: "µg/m³",
  });
  assert.equal(lineChart.tagName, "DIV");
  assert.equal(lineChart.className, "ui-chart-container");
  assert.equal(lineChart.children[0].children[0].textContent, "Diurnal Line (µg/m³)");
  assert.equal(lineChart.children[1].children[0].tagName, "SVG");
  assert.equal(lineChart.children[2].tagName, "TABLE");

  const barChart = createBarChart({
    title: "Cost Bar",
    data: [{ label: "Mask", value: 50, color: "#0f766e", unit: "INR" }],
  });
  assert.equal(barChart.tagName, "DIV");
  assert.equal(barChart.className, "ui-chart-container");
  const bcHeader = barChart.children[0];
  assert.equal(bcHeader.children[0].textContent, "Cost Bar");
  const bcToggle = /** @type {any} */ (bcHeader.children[1]);
  assert.equal(bcToggle.textContent, "View Table");
  assert.equal(barChart.children[1].className, "chart-svg-wrap");
  assert.equal(barChart.children[1].children[0].tagName, "SVG");
  assert.equal(barChart.children[2].tagName, "TABLE");

  bcToggle.click();
  assert.equal(bcToggle.textContent, "View Chart");
  bcToggle.click();
  assert.equal(bcToggle.textContent, "View Table");
});
