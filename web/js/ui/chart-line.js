/**
 * @fileoverview Accessible Inline SVG Line Chart with Built-in Table Toggle.
 * Renders pure SVG vector curves with accessible table parity for assistive tech.
 */

import { createDataTable } from "./data-table.js";

const SVG_WIDTH = 600; // Reference coordinate width
const SVG_HEIGHT = 240; // Reference coordinate height
const PADDING_X = 40; // Horizontal axis padding
const PADDING_Y = 30; // Vertical axis padding

/**
 * Computes SVG polyline points string from numeric array.
 * @param {number[]} values
 * @param {number} minVal
 * @param {number} maxVal
 * @returns {string}
 */
function buildPoints(values, minVal, maxVal) {
  const range = maxVal - minVal || 1;
  const usableWidth = SVG_WIDTH - PADDING_X * 2;
  const usableHeight = SVG_HEIGHT - PADDING_Y * 2;

  return values
    .map((val, idx) => {
      const x = Math.round(PADDING_X + (idx / (values.length - 1 || 1)) * usableWidth);
      const y = Math.round(SVG_HEIGHT - PADDING_Y - ((val - minVal) / range) * usableHeight);
      return `${x},${y}`;
    })
    .join(" ");
}

/**
 * Builds the SVG element with axes and series lines.
 * @param {Array<{ name: string, values: number[], color: string }>} series
 * @param {string[]} [_labels]
 * @returns {SVGSVGElement}
 */
function renderSvg(series, _labels) {
  const allVals = series.flatMap((s) => s.values);
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(10, ...allVals);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
  svg.setAttribute("class", "ui-chart-svg");
  svg.setAttribute("role", "img");

  // Grid line at mid
  const midLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  midLine.setAttribute("x1", PADDING_X.toString());
  midLine.setAttribute("x2", (SVG_WIDTH - PADDING_X).toString());
  midLine.setAttribute("y1", (SVG_HEIGHT / 2).toString());
  midLine.setAttribute("y2", (SVG_HEIGHT / 2).toString());
  midLine.setAttribute("stroke", "#e2e8f0");
  svg.appendChild(midLine);

  series.forEach((s) => {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", s.color);
    poly.setAttribute("stroke-width", "2.5");
    poly.setAttribute("points", buildPoints(s.values, minVal, maxVal));
    svg.appendChild(poly);
  });

  return svg;
}

/**
 * Creates an accessible line chart widget with toggleable data table.
 *
 * @param {Object} options
 * @param {string} options.title - Chart title
 * @param {Array<{ name: string, values: number[], color: string }>} options.series
 * @param {string[]} options.labels - X-axis labels (e.g. hours)
 * @param {string} [options.unit="µg/m³"]
 * @returns {HTMLDivElement}
 */
export function createLineChart({ title, series, labels, unit = "µg/m³" }) {
  const container = document.createElement("div");
  container.className = "ui-chart-container";

  const header = document.createElement("div");
  header.className = "chart-header";
  const h3 = document.createElement("h3");
  h3.textContent = `${title} (${unit})`;
  header.appendChild(h3);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "ui-button secondary chart-toggle-btn";
  toggleBtn.textContent = "View Table";
  header.appendChild(toggleBtn);
  container.appendChild(header);

  const svgWrap = document.createElement("div");
  svgWrap.className = "chart-svg-wrap";
  svgWrap.appendChild(renderSvg(series, labels));
  container.appendChild(svgWrap);

  // Accessible Table equivalent
  const tableHeaders = ["Time", ...series.map((s) => s.name)];
  const tableRows = labels.map((lbl, idx) => [
    lbl,
    ...series.map((s) => `${s.values[idx] || 0} ${unit}`),
  ]);
  const table = createDataTable({
    headers: tableHeaders,
    rows: tableRows,
    caption: `${title} Data Table`,
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
