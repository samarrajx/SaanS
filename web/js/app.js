/**
 * @fileoverview Main Frontend Application Entry Point for Saans.
 * Initializes navigation shell, demo mode toggle, and hash routing.
 */

import { initRouter, navigateTo } from "./router.js";
import { loadProfile, saveProfile } from "./storage.js";
import { getLocale } from "./locales/index.js";
import { announce } from "./ui/announcer.js";

const NAV_ITEMS = [
  { id: "today", label: "Today", icon: "📊" },
  { id: "plan", label: "Day Plan", icon: "🕒" },
  { id: "lab", label: "Home Air Lab", icon: "🧪" },
  { id: "swaps", label: "Swaps", icon: "🔄" },
  { id: "community", label: "Community", icon: "🏘️" },
  { id: "ask", label: "Ask", icon: "💬" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

/**
 * Builds and renders main navigation bar links.
 * @param {HTMLElement} navElement
 */
function renderNav(navElement) {
  navElement.replaceChildren();
  const profile = loadProfile();
  const t = getLocale(profile.language);

  NAV_ITEMS.forEach((item) => {
    const link = document.createElement("a");
    link.href = `#${item.id}`;
    link.setAttribute("data-route", item.id);
    const labelText = t[`nav${item.id.charAt(0).toUpperCase() + item.id.slice(1)}`] || item.label;
    link.textContent = `${item.icon} ${labelText}`;
    navElement.appendChild(link);
  });
}

/**
 * Updates header demo mode status banner and buttons.
 * @param {HTMLElement} statusElement
 */
function updateHeaderStatus(statusElement) {
  statusElement.replaceChildren();
  const profile = loadProfile();

  if (profile.isDemo) {
    const demoBadge = document.createElement("span");
    demoBadge.className = "ui-chip chip-aqi-severe";
    demoBadge.textContent = "⚡ Demo Mode";
    statusElement.appendChild(demoBadge);

    const exitBtn = document.createElement("button");
    exitBtn.className = "ui-button secondary";
    exitBtn.style.padding = "4px 8px";
    exitBtn.style.fontSize = "0.75rem";
    exitBtn.textContent = "Exit Demo";
    exitBtn.addEventListener("click", () => {
      profile.isDemo = false;
      saveProfile(profile);
      announce("Exited demo mode");
      updateHeaderStatus(statusElement);
      navigateTo("today");
    });
    statusElement.appendChild(exitBtn);
  } else {
    const demoBtn = document.createElement("button");
    demoBtn.className = "ui-button secondary";
    demoBtn.style.padding = "4px 8px";
    demoBtn.style.fontSize = "0.75rem";
    demoBtn.textContent = "Try Demo";
    demoBtn.addEventListener("click", () => {
      profile.isDemo = true;
      saveProfile(profile);
      announce("Entered Patna Severe Demo Mode");
      updateHeaderStatus(statusElement);
      navigateTo("today");
    });
    statusElement.appendChild(demoBtn);
  }
}

/**
 * Bootstraps the application shell.
 */
function initApp() {
  const nav = document.getElementById("main-nav");
  if (nav) renderNav(nav);

  const statusHeader = document.getElementById("header-status");
  if (statusHeader) updateHeaderStatus(statusHeader);

  initRouter();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
