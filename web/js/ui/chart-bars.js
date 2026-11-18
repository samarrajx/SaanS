/**
 * @fileoverview Accessible Inline SVG Bar Chart with Table Parity.
 * Renders comparative metric bars with built-in accessible data table toggle.
 */

import { createDataTable } from "./data-table.js";
import { createChartContainer, SVG_NS } from "./chart-utils.js";

const BAR_HEIGHT = 28; // Height per bar in coordinate pixels
const BAR_GAP = 12; // Gap between consecutive horizontal bars
const TOP_PADDING = 10; // Top coordinate padding
const BOTTOM_PADDING = 20; // Bottom coordinate padding
const CHART_WIDTH = 450; // Reference SVG coordinate width (viewBox)
const BAR_START_X = 120; // Horizontal start offset for bar rectangle
const VALUE_START_OFFSET = 10; // Spacing after bar for value text
const LABEL_TEXT_Y_OFFSET = 18; // Vertical baseline offset for label text
const LABEL_RESERVED_WIDTH = 140; // Total horizontal space reserved for labels & margins
const MIN_BAR_WIDTH = 4; // Minimum visible bar width
const CORNER_RADIUS = "4"; // Border radius for bar rectangle
const DEFAULT_BAR_COLOR = "#0f766e"; // Default teal bar color
const LABEL_FONT_SIZE = "12"; // Font size for item label
const VALUE_FONT_SIZE = "11"; // Font size for metric value

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
  const svgHeight = items.length * (BAR_HEIGHT + BAR_GAP) + BOTTOM_PADDING;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${svgHeight}`);
  svg.setAttribute("class", "ui-barchart-svg");
  svg.setAttribute("role", "img");

  items.forEach((item, index) => {
    const y = index * (BAR_HEIGHT + BAR_GAP) + TOP_PADDING;
    const barWidth = Math.max(
      MIN_BAR_WIDTH,
      Math.round((item.value / maxVal) * (CHART_WIDTH - LABEL_RESERVED_WIDTH))
    );

    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", "0");
    text.setAttribute("y", (y + LABEL_TEXT_Y_OFFSET).toString());
    text.setAttribute("font-size", LABEL_FONT_SIZE);
    text.textContent = item.label;
    svg.appendChild(text);

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", BAR_START_X.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", barWidth.toString());
    rect.setAttribute("height", BAR_HEIGHT.toString());
    rect.setAttribute("rx", CORNER_RADIUS);
    rect.setAttribute("fill", item.color || DEFAULT_BAR_COLOR);
    svg.appendChild(rect);

    const valText = document.createElementNS(SVG_NS, "text");
    valText.setAttribute("x", (BAR_START_X + VALUE_START_OFFSET + barWidth).toString());
    valText.setAttribute("y", (y + LABEL_TEXT_Y_OFFSET).toString());
    valText.setAttribute("font-size", VALUE_FONT_SIZE);
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
  const svg = renderBarSvg(data);
  const tableHeaders = ["Item", "Value"];
  const tableRows = data.map((d) => [d.label, `${d.value} ${d.unit || ""}`.trim()]);
  const table = createDataTable({
    headers: tableHeaders,
    rows: tableRows,
    caption: `${title} Table`,
  });

  return createChartContainer({
    title,
    svg,
    table,
  });
}
