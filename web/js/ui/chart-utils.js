/**
 * @fileoverview Shared Chart UI Utilities and Geometry Constants.
 * Provides accessible chart container with toggleable data table parity.
 */

export const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @typedef {Object} ChartContainerOptions
 * @property {string} title - Chart heading title
 * @property {SVGSVGElement} svg - Rendered SVG graphic element
 * @property {HTMLTableElement} table - Accessible data table equivalent
 */

/**
 * Creates an accessible chart wrapper with toggleable data table view.
 *
 * @param {ChartContainerOptions} options
 * @returns {HTMLDivElement}
 */
export function createChartContainer({ title, svg, table }) {
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
  svgWrap.appendChild(svg);
  container.appendChild(svgWrap);

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
