/**
 * @fileoverview Inline Search / Message Form Primitive.
 */

/**
 * @typedef {Object} InlineFormOptions
 * @property {string} id
 * @property {string} [placeholder=""]
 * @property {string} buttonLabel
 * @property {string} [value=""]
 * @property {(val: string) => void} onSubmit
 */

/**
 * Creates an inline form container with input and submit button.
 *
 * @param {InlineFormOptions} options
 * @returns {HTMLFormElement}
 */
export function createInlineForm({ id, placeholder = "", buttonLabel, value = "", onSubmit }) {
  const form = document.createElement("form");
  form.className = "ui-inline-form";

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.className = "ui-input inline-input";
  input.placeholder = placeholder;
  input.value = value;
  input.setAttribute("aria-label", placeholder || buttonLabel);

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "ui-button inline-submit";
  button.textContent = buttonLabel;

  form.appendChild(input);
  form.appendChild(button);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) onSubmit(val);
  });

  return form;
}
