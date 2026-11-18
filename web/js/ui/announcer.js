/**
 * @fileoverview Screen Reader Live Region Announcer.
 * Provides accessible, unobtrusive announcements for dynamic state changes.
 */

// Delay constant in ms to ensure DOM mutation triggers assistive technology
const ANNOUNCE_DELAY_MS = 50;

/**
 * Announces a message to screen readers using the polite live region.
 *
 * @param {string} message - Plain text message to announce
 * @param {"polite" | "assertive"} [priority="polite"]
 * @returns {void}
 */
export function announce(message, priority = "polite") {
  if (typeof document === "undefined") return;

  const announcer = document.getElementById("app-announcer");
  if (!announcer) return;

  announcer.setAttribute("aria-live", priority);
  // Clear and update with slight delay to ensure screen readers re-read identical messages
  announcer.textContent = "";
  setTimeout(() => {
    announcer.textContent = message;
  }, ANNOUNCE_DELAY_MS);
}
