/**
 * @fileoverview Lab View (Home Air Lab placeholder stub).
 */

export function render() {
  const container = document.createElement("div");
  container.className = "view-lab";
  const h1 = document.createElement("h1");
  h1.textContent = "Home Air Lab";
  container.appendChild(h1);
  return container;
}
