/**
 * @fileoverview Accessible WAI-ARIA Tabs Primitive.
 * Features keyboard arrow navigation, active state synchronization, and panel rendering.
 */

/**
 * Handles keyboard arrow navigation across tab buttons.
 * @param {KeyboardEvent} e
 * @param {HTMLButtonElement[]} buttons
 * @param {(id: string) => void} selectTab
 */
function handleTabKeydown(e, buttons, selectTab) {
  const currentIndex = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (e.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % buttons.length;
  } else if (e.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  } else {
    return;
  }

  e.preventDefault();
  buttons[nextIndex].focus();
  const nextId = buttons[nextIndex].getAttribute("data-tab-id") || "";
  selectTab(nextId);
}

/**
 * Builds individual tab buttons.
 * @param {Array<{ id: string, label: string }>} tabs
 * @param {(id: string) => void} onSelect
 * @returns {{ buttons: HTMLButtonElement[], tabList: HTMLDivElement }}
 */
function buildTabButtons(tabs, onSelect) {
  const tabList = document.createElement("div");
  tabList.className = "ui-tablist";
  tabList.setAttribute("role", "tablist");
  /** @type {HTMLButtonElement[]} */
  const buttons = [];

  tabs.forEach((tab) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-tab-btn";
    btn.setAttribute("role", "tab");
    btn.setAttribute("data-tab-id", tab.id);
    btn.textContent = tab.label;
    btn.addEventListener("click", () => onSelect(tab.id));
    buttons.push(btn);
    tabList.appendChild(btn);
  });

  return { buttons, tabList };
}

/**
 * Creates accessible tabs with keyboard arrow support.
 *
 * @param {Object} options
 * @param {Array<{ id: string, label: string, render: () => HTMLElement }>} options.tabs
 * @param {string} [options.activeId]
 * @param {(id: string) => void} [options.onTabChange]
 * @returns {HTMLDivElement}
 */
export function createTabs({ tabs, activeId = tabs[0]?.id, onTabChange }) {
  const container = document.createElement("div");
  container.className = "ui-tabs";
  const panel = document.createElement("div");
  panel.className = "ui-tabpanel";
  panel.setAttribute("role", "tabpanel");

  /** @type {HTMLButtonElement[]} */
  let buttons = [];
  /** @param {string} id */
  function renderActiveTab(id) {
    panel.innerHTML = "";
    buttons.forEach((btn) => {
      const isSelected = btn.getAttribute("data-tab-id") === id;
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
      btn.tabIndex = isSelected ? 0 : -1;
      btn.classList.toggle("active", isSelected);
    });
    const activeDef = tabs.find((t) => t.id === id);
    if (activeDef) panel.appendChild(activeDef.render());
    if (onTabChange) onTabChange(id);
  }

  const built = buildTabButtons(tabs, renderActiveTab);
  buttons = built.buttons;
  built.tabList.addEventListener("keydown", (e) => handleTabKeydown(e, buttons, renderActiveTab));

  container.appendChild(built.tabList);
  container.appendChild(panel);
  renderActiveTab(activeId);
  return container;
}
