/**
 * @fileoverview Accessible Form Field Primitive.
 * Connects inputs with labels, helper descriptions, and error states via WAI-ARIA.
 */

/**
 * Builds a select input element with option items.
 * @param {string} id
 * @param {Array<{ label: string, value: string }>} options
 * @param {string | number | boolean | undefined} value
 * @returns {HTMLSelectElement}
 */
function buildSelectInput(id, options, value) {
  const select = document.createElement("select");
  select.className = "ui-select";
  select.id = id;
  for (const opt of options) {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (opt.value === value) optionEl.selected = true;
    select.appendChild(optionEl);
  }
  return select;
}

/**
 * Builds standard input or checkbox element.
 * @param {string} id
 * @param {string} type
 * @param {string | number | boolean | undefined} value
 * @returns {HTMLInputElement}
 */
function buildStandardInput(id, type, value) {
  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.className = type === "checkbox" ? "ui-checkbox" : "ui-input";
  if (type === "checkbox") {
    input.checked = Boolean(value);
  } else if (value !== undefined) {
    input.value = value.toString();
  }
  return input;
}

/**
 * Attaches help text element and aria-describedby link.
 * @param {HTMLElement} container
 * @param {HTMLElement} inputEl
 * @param {string} id
 * @param {string} helpText
 */
function attachHelpText(container, inputEl, id, helpText) {
  const helpId = `${id}-help`;
  inputEl.setAttribute("aria-describedby", helpId);
  const helpEl = document.createElement("small");
  helpEl.id = helpId;
  helpEl.className = "ui-help-text";
  helpEl.textContent = helpText;
  container.appendChild(helpEl);
}

/**
 * Creates an input, select, or checkbox form field.
 *
 * @param {Object} options
 * @param {string} options.id - HTML ID
 * @param {string} options.label - Label text
 * @param {"text" | "number" | "select" | "checkbox"} [options.type="text"]
 * @param {string | number | boolean} [options.value] - Initial value
 * @param {Array<{ label: string, value: string }>} [options.options] - Select options
 * @param {string} [options.helpText] - Explanatory hint
 * @param {(val: string) => void} [options.onChange]
 * @returns {HTMLDivElement}
 */
export function createFormField({
  id,
  label,
  type = "text",
  value,
  options = [],
  helpText,
  onChange,
}) {
  const container = document.createElement("div");
  container.className = "ui-form-field";

  const labelEl = document.createElement("label");
  labelEl.className = "ui-label";
  labelEl.setAttribute("for", id);
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const inputEl =
    type === "select" ? buildSelectInput(id, options, value) : buildStandardInput(id, type, value);

  if (onChange) {
    inputEl.addEventListener("change", (e) => {
      const target = /** @type {HTMLInputElement | HTMLSelectElement} */ (e.target);
      const val =
        type === "checkbox"
          ? String(/** @type {HTMLInputElement} */ (target).checked)
          : target.value;
      onChange(val);
    });
  }

  container.appendChild(inputEl);
  if (helpText) attachHelpText(container, inputEl, id, helpText);
  return container;
}
