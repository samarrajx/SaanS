/**
 * @fileoverview Client-side Hash Router for Saans.
 * Manages view switching, focus management, nav state, and screen reader announcements.
 */

import { announce } from "./ui/announcer.js";

/** @type {Record<string, () => Promise<{ render: () => HTMLElement }>>} */
const ROUTES = {
  today: () => import("./views/today.js"),
  plan: () => import("./views/plan.js"),
  lab: () => import("./views/lab.js"),
  swaps: () => import("./views/swaps.js"),
  community: () => import("./views/community.js"),
  ask: () => import("./views/ask.js"),
  settings: () => import("./views/settings.js"),
  onboarding: () => import("./views/onboarding.js"),
};

/**
 * Updates navigation link active state.
 * @param {string} routeName
 */
function updateNavActive(routeName) {
  const navLinks = document.querySelectorAll(".app-nav a");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isTarget = href === `#${routeName}` || (routeName === "today" && href === "#");
    link.classList.toggle("active", isTarget);
    link.setAttribute("aria-current", isTarget ? "page" : "false");
  });
}

/**
 * Loads and mounts a route view into the main view container.
 * @param {string} routeName
 * @returns {Promise<void>}
 */
export async function navigateTo(routeName) {
  const targetRoute = ROUTES[routeName] ? routeName : "today";
  const container = document.getElementById("view-container");
  if (!container) return;

  container.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "view-loading";
  loading.textContent = "Loading...";
  container.appendChild(loading);

  try {
    const module = await ROUTES[targetRoute]();
    container.innerHTML = "";
    container.appendChild(module.render());

    updateNavActive(targetRoute);
    announce(`Navigated to ${targetRoute} screen`);

    // Move focus to main content for keyboard accessibility
    const main = document.getElementById("main-content");
    if (main) main.focus();
  } catch (err) {
    console.error("Navigation error:", err);
    container.innerHTML = "";
    const errorP = document.createElement("p");
    errorP.className = "view-error";
    errorP.textContent = "Failed to load view. Please try again.";
    container.appendChild(errorP);
  }
}

/**
 * Initializes hash routing listener and triggers initial route.
 * @returns {void}
 */
export function initRouter() {
  function handleHash() {
    const rawHash = window.location.hash.replace(/^#\/?/, "");
    navigateTo(rawHash || "today");
  }

  window.addEventListener("hashchange", handleHash);
  handleHash();
}
