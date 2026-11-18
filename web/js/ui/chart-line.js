/**
 * @fileoverview Accessible Inline SVG Line Chart with Built-in Table Toggle.
 * Renders pure SVG vector curves with accessible table parity for assistive tech.
 */

import { createDataTable } from "./data-table.js";
import { createChartContainer, SVG_NS } from "./chart-utils.js";

const SVG_WIDTH = 600; // Reference coordinate viewBox width
const SVG_HEIGHT = 240; // Reference coordinate viewBox height
const PADDING_X = 40; // Horizontal axis padding in coordinate units
const PADDING_Y = 30; // Vertical axis padding in coordinate units
const MIN_SCALE_MAX = 10; // Floor for maximum value on vertical scale
const STROKE_WIDTH = "2.5"; // Vector polyline stroke thickness
const GRID_COLOR = "#e2e8f0"; // Reference horizontal grid line color

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
 * @typedef {Object} LineChartSeries
 * @property {string} name
 * @property {number[]} values
 * @property {string} color
 */

/**
 * @typedef {Object} LineChartOptions
 * @property {string} title - Chart title
 * @property {LineChartSeries[]} series
 * @property {string[]} labels - X-axis labels (e.g. hours)
 * @property {string} [unit="µg/m³"]
 */

/**
 * Builds the SVG element with axes and series lines.
 * @param {LineChartSeries[]} series
 * @param {string[]} [_labels]
 * @returns {SVGSVGElement}
 */
function renderSvg(series, _labels) {
  const allVals = series.flatMap((s) => s.values);
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(MIN_SCALE_MAX, ...allVals);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
  svg.setAttribute("class", "ui-chart-svg");
  svg.setAttribute("role", "img");

  // Grid line at mid
  const midLine = document.createElementNS(SVG_NS, "line");
  midLine.setAttribute("x1", PADDING_X.toString());
  midLine.setAttribute("x2", (SVG_WIDTH - PADDING_X).toString());
  midLine.setAttribute("y1", (SVG_HEIGHT / 2).toString());
  midLine.setAttribute("y2", (SVG_HEIGHT / 2).toString());
  midLine.setAttribute("stroke", GRID_COLOR);
  svg.appendChild(midLine);

  series.forEach((s) => {
    const poly = document.createElementNS(SVG_NS, "polyline");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", s.color);
    poly.setAttribute("stroke-width", STROKE_WIDTH);
    poly.setAttribute("points", buildPoints(s.values, minVal, maxVal));
    svg.appendChild(poly);
  });

  return svg;
}

/**
 * Creates an accessible line chart widget with toggleable data table.
 *
 * @param {LineChartOptions} options
 * @returns {HTMLDivElement}
 */
export function createLineChart({ title, series, labels, unit = "µg/m³" }) {
  const chartTitle = `${title} (${unit})`;
  const svg = renderSvg(series, labels);

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

  return createChartContainer({
    title: chartTitle,
    svg,
    table,
  });
}
