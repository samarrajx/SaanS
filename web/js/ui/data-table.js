/**
 * @fileoverview Accessible Data Table Primitive.
 * Generates semantic table with caption, col-scoped headers, and cell rendering.
 */

/**
 * @typedef {Object} DataTableOptions
 * @property {string[]} headers - Column header titles
 * @property {Array<Array<string | number | HTMLElement>>} rows - Row cell contents
 * @property {string} [caption] - Table summary description
 * @property {string} [className=""]
 */

/**
 * Creates an accessible data table.
 *
 * @param {DataTableOptions} options
 * @returns {HTMLTableElement}
 */
export function createDataTable({ headers, rows, caption, className = "" }) {
  const table = document.createElement("table");
  table.className = `ui-data-table ${className}`.trim();

  if (caption) {
    const cap = document.createElement("caption");
    cap.textContent = caption;
    table.appendChild(cap);
  }

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      if (cell instanceof HTMLElement) {
        td.appendChild(cell);
      } else {
        td.textContent = cell !== undefined && cell !== null ? cell.toString() : "-";
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}
