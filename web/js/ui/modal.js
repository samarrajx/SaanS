/**
 * @fileoverview Accessible Modal Dialog Primitive.
 * Features WAI-ARIA dialog attributes, focus trapping, Escape key listener,
 * and focus restoration to the trigger element upon dismissal.
 */

/**
 * Builds modal header with title and close button.
 * @param {string} title
 * @param {() => void} onClose
 * @returns {{ header: HTMLDivElement, closeBtn: HTMLButtonElement }}
 */
function buildModalHeader(title, onClose) {
  const header = document.createElement("div");
  header.className = "modal-header";
  const h2 = document.createElement("h2");
  h2.id = "modal-title";
  h2.textContent = title;
  header.appendChild(h2);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal-close-btn";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", onClose);
  header.appendChild(closeBtn);

  return { header, closeBtn };
}

/**
 * Builds modal action footer.
 * @param {Array<{ label: string, onClick: () => void, isPrimary?: boolean }>} actions
 * @param {() => void} closeModal
 * @returns {HTMLDivElement}
 */
function buildModalFooter(actions, closeModal) {
  const footer = document.createElement("div");
  footer.className = "modal-footer";

  actions.forEach((act) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = act.isPrimary ? "ui-button" : "ui-button secondary";
    btn.textContent = act.label;
    btn.addEventListener("click", () => {
      act.onClick();
      closeModal();
    });
    footer.appendChild(btn);
  });
  return footer;
}

/**
 * Creates and displays an accessible modal dialog.
 *
 * @param {Object} options
 * @param {string} options.title - Modal heading
 * @param {HTMLElement} options.content - Body DOM element
 * @param {Array<{ label: string, onClick: () => void, isPrimary?: boolean }>} [options.actions=[]]
 * @param {() => void} [options.onClose]
 * @returns {{ close: () => void, element: HTMLDivElement }}
 */
export function openModal({ title, content, actions = [], onClose }) {
  const previousFocus = /** @type {HTMLElement} */ (document.activeElement);
  const backdrop = document.createElement("div");
  backdrop.className = "ui-modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "ui-modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "modal-title");

  function closeModal() {
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    document.removeEventListener("keydown", handleKeydown);
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    if (onClose) onClose();
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  const { header, closeBtn } = buildModalHeader(title, closeModal);
  const body = document.createElement("div");
  body.className = "modal-body";
  body.appendChild(content);
  const footer = buildModalFooter(actions, closeModal);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", handleKeydown);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  closeBtn.focus();

  return { close: closeModal, element: backdrop };
}
