/**
 * @fileoverview Semantic Card Primitive.
 * Standard container with structured heading, content, and optional footer.
 */

/**
 * @typedef {Object} CardOptions
 * @property {string} [title] - Card title
 * @property {string} [subtitle] - Card subtitle/description
 * @property {HTMLElement | HTMLElement[]} [content] - Body elements
 * @property {HTMLElement} [footer] - Footer actions element
 * @property {string} [className=""] - Additional class names
 * @property {string} [ariaLabel] - Accessible label
 */

/**
 * Creates an accessible UI card element.
 *
 * @param {CardOptions} options
 * @returns {HTMLElement}
 */
export function createCard({ title, subtitle, content, footer, className = "", ariaLabel }) {
  const card = document.createElement("section");
  card.className = `ui-card ${className}`.trim();
  if (ariaLabel) card.setAttribute("aria-label", ariaLabel);

  if (title) {
    const heading = document.createElement("h2");
    heading.className = "ui-card-title";
    heading.textContent = title;
    card.appendChild(heading);
  }

  if (subtitle) {
    const sub = document.createElement("p");
    sub.className = "ui-card-subtitle";
    sub.textContent = subtitle;
    card.appendChild(sub);
  }

  if (content) {
    const body = document.createElement("div");
    body.className = "ui-card-body";
    if (Array.isArray(content)) {
      for (const el of content) body.appendChild(el);
    } else {
      body.appendChild(content);
    }
    card.appendChild(body);
  }

  if (footer) {
    const foot = document.createElement("div");
    foot.className = "ui-card-footer";
    foot.appendChild(footer);
    card.appendChild(foot);
  }

  return card;
}
