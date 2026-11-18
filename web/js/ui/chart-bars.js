/**
 * @fileoverview Accessible Inline SVG Bar Chart with Table Parity.
 * Renders comparative metric bars with built-in accessible data table toggle.
 */

import { createDataTable } from "./data-table.js";

const BAR_HEIGHT = 28; // Height per bar in px
const CHART_WIDTH = 450; // Reference SVG coordinate width

/**
 * @typedef {Object} BarChartItem
 * @property {string} label
 * @property {number} value
 * @property {string} [color]
 * @property {string} [unit]
 */

/**
 * @typedef {Object} BarChartOptions
 * @property {string} title
 * @property {BarChartItem[]} data
 */

/**
 * Builds SVG bars representation.
 * @param {BarChartItem[]} items
 * @returns {SVGSVGElement}
 */
function renderBarSvg(items) {
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const svgHeight = items.length * (BAR_HEIGHT + 12) + 20;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${svgHeight}`);
  svg.setAttribute("class", "ui-barchart-svg");
  svg.setAttribute("role", "img");

  items.forEach((item, index) => {
    const y = index * (BAR_HEIGHT + 12) + 10;
    const barWidth = Math.max(4, Math.round((item.value / maxVal) * (CHART_WIDTH - 140)));

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "0");
    text.setAttribute("y", (y + 18).toString());
    text.setAttribute("font-size", "12");
    text.textContent = item.label;
    svg.appendChild(text);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "120");
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", barWidth.toString());
    rect.setAttribute("height", BAR_HEIGHT.toString());
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", item.color || "#0f766e");
    svg.appendChild(rect);

    const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valText.setAttribute("x", (130 + barWidth).toString());
    valText.setAttribute("y", (y + 18).toString());
    valText.setAttribute("font-size", "11");
    valText.textContent = `${item.value} ${item.unit || ""}`.trim();
    svg.appendChild(valText);
  });

  return svg;
}

/**
 * Creates an accessible bar chart with data table parity.
 *
 * @param {BarChartOptions} options
 * @returns {HTMLDivElement}
 */
export function createBarChart({ title, data }) {
  const container = document.createElement("div");
  container.className = "ui-chart-container";

  const header = document.createElement("div");
  header.className = "chart-header";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  header.appendChild(h3);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "ui-button secondary chart-toggle-btn";
  toggleBtn.textContent = "View Table";
  header.appendChild(toggleBtn);
  container.appendChild(header);

  const svgWrap = document.createElement("div");
  svgWrap.className = "chart-svg-wrap";
  svgWrap.appendChild(renderBarSvg(data));
  container.appendChild(svgWrap);

  const tableHeaders = ["Item", "Value"];
  const tableRows = data.map((d) => [d.label, `${d.value} ${d.unit || ""}`.trim()]);
  const table = createDataTable({
    headers: tableHeaders,
    rows: tableRows,
    caption: `${title} Table`,
  });
  table.style.display = "none";
  container.appendChild(table);

  let isTableView = false;
  toggleBtn.addEventListener("click", () => {
    isTableView = !isTableView;
    svgWrap.style.display = isTableView ? "none" : "block";
    table.style.display = isTableView ? "table" : "none";
    toggleBtn.textContent = isTableView ? "View Chart" : "View Table";
  });

  return container;
}
