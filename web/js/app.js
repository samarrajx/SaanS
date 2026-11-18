/**
 * @fileoverview Main frontend entry point for Saans.
 */

// Application startup state
export const APP_NAME = "Saans"; // Clean-air assistant name
export const APP_VERSION = "1.0.0"; // Semantic version

/**
 * Initializes the application shell and basic event listeners.
 * @returns {void}
 */
export function initApp() {
  const container = document.getElementById("view-container");
  if (container) {
    const welcome = document.createElement("div");
    welcome.className = "welcome-card";
    welcome.setAttribute("role", "region");
    welcome.setAttribute("aria-label", "Welcome");

    const heading = document.createElement("h1");
    heading.textContent = `${APP_NAME} — Clean-Air Assistant`;
    welcome.appendChild(heading);

    const desc = document.createElement("p");
    desc.textContent =
      "Helping families and communities navigate severe smog and urban pollution with low-emission routines and verified indoor air strategies.";
    welcome.appendChild(desc);

    container.appendChild(welcome);
  }
}

// Bootstrap when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
