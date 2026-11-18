/**
 * @fileoverview Lightweight Mock DOM helper for testing browser UI primitives in Node.js.
 */

class MockElement {
  /**
   * @param {string} tag
   */
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    /** @type {Record<string, string>} */
    this.attributes = {};
    /** @type {MockElement[]} */
    this.children = [];
    /** @type {MockElement | null} */
    this.parentNode = null;
    /** @type {string} */
    this._textContent = "";
    this.className = "";
    this.style = {};
    this.id = "";
    /** @type {Record<string, Function[]>} */
    this.listeners = {};
    this.classList = {
      /** @param {string} c */
      add: (c) => {
        const set = new Set(this.className.split(" ").filter(Boolean));
        set.add(c);
        this.className = Array.from(set).join(" ");
      },
      /** @param {string} c */
      remove: (c) => {
        const set = new Set(this.className.split(" ").filter(Boolean));
        set.delete(c);
        this.className = Array.from(set).join(" ");
      },
      /**
       * @param {string} c
       * @param {boolean} [force]
       */
      toggle: (c, force) => {
        const has = this.className.split(" ").includes(c);
        const shouldAdd = force !== undefined ? force : !has;
        if (shouldAdd) this.classList.add(c);
        else this.classList.remove(c);
      },
      /** @param {string} c */
      contains: (c) => this.className.split(" ").includes(c),
    };
  }

  /** @param {string} name @param {string} val */
  setAttribute(name, val) {
    this.attributes[name] = val.toString();
    if (name === "id") this.id = val.toString();
    if (name === "class") this.className = val.toString();
  }

  /** @param {string} name */
  getAttribute(name) {
    return this.attributes[name] || null;
  }

  /** @param {MockElement} child */
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  /** @param {MockElement} newChild @param {MockElement | null} refChild */
  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);
    newChild.parentNode = this;
    this.children.splice(idx, 0, newChild);
    return newChild;
  }

  /** @param {MockElement} child */
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
  }

  /** @param {string} event @param {Function} handler */
  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  /** @param {string} event @param {any} [data] */
  dispatchEvent(event, data = {}) {
    if (this.listeners[event]) {
      const ev = {
        target: this,
        preventDefault: () => {},
        stopPropagation: () => {},
        ...data,
      };
      this.listeners[event].forEach((h) => h(ev));
    }
  }

  get textContent() {
    const own = this._textContent || "";
    if (this.children.length === 0) return own;
    const childText = this.children.map((c) => c.textContent).join(" ");
    return (own + " " + childText).trim();
  }

  /** @param {string} val */
  set textContent(val) {
    this._textContent = val;
    this.children = [];
  }

  /** @param {string} val */
  set innerHTML(val) {
    if (val === "") {
      this.children = [];
      this._textContent = "";
    }
  }

  get innerHTML() {
    return this.textContent;
  }

  /**
   * @param  {...MockElement} newChildren
   */
  replaceChildren(...newChildren) {
    this.children = [];
    this._textContent = "";
    newChildren.forEach((c) => this.appendChild(c));
  }

  click() {
    this.dispatchEvent("click");
  }

  focus() {}
}

/**
 * Sets up global mock window, localStorage and URL utilities.
 * @returns {{ store: Map<string, string> }}
 */
/**
 * Sets up global mock window and location utilities.
 * @param {Map<string, string>} store
 */
function setupMockWindowObject(store) {
  /** @type {Record<string, Function[]>} */
  const winListeners = {};
  /** @type {any} */ (globalThis).window = {
    localStorage: {
      /** @param {string} k */
      getItem: (k) => store.get(k) || null,
      /** @param {string} k @param {string} v */
      setItem: (k, v) => store.set(k, v),
      /** @param {string} k */
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    location: {
      _hash: "",
      get hash() {
        return this._hash;
      },
      set hash(v) {
        this._hash = v;
      },
    },
    print: () => {},
    /** @param {string} event @param {Function} handler */
    addEventListener: (event, handler) => {
      if (!winListeners[event]) winListeners[event] = [];
      winListeners[event].push(handler);
    },
    /** @param {string} event @param {Function} handler */
    removeEventListener: (event, handler) => {
      if (winListeners[event]) {
        winListeners[event] = winListeners[event].filter((h) => h !== handler);
      }
    },
    /** @param {string} event @param {any} [data] */
    dispatchEvent: (event, data = {}) => {
      if (winListeners[event]) {
        winListeners[event].forEach((h) => h({ type: event, ...data }));
      }
    },
  };
}

/**
 * Sets up global mock navigator with geolocation and clipboard.
 */
function setupMockNavigator() {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      clipboard: {
        writeText: async () => {},
      },
      geolocation: {
        /** @param {Function} success @param {Function} [_error] */
        getCurrentPosition: (success, _error) => {
          success({
            coords: {
              latitude: 25.594,
              longitude: 85.137,
            },
          });
        },
      },
    },
    configurable: true,
    writable: true,
  });
}

/**
 * Sets up global browser primitives: URL, Blob, FileReader.
 */
function setupMockFileApis() {
  /** @type {any} */ (globalThis).URL = {
    createObjectURL: () => "blob:mock-url",
    revokeObjectURL: () => {},
  };

  /** @type {any} */ (globalThis).Blob = class MockBlob {
    /** @param {any[]} parts @param {any} [options] */
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  };

  if (!globalThis.FileReader) {
    /** @type {any} */ (globalThis).FileReader = class MockFileReader {
      constructor() {
        /** @type {((event: { target: { result: string } }) => void) | null} */
        this.onload = null;
      }
      /** @param {any} file */
      readAsText(file) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: file?.text || "{}" } });
          }
        }, 0);
      }
    };
  }
}

/**
 * Sets up global mock window, localStorage and URL utilities.
 * @returns {{ store: Map<string, string> }}
 */
function setupMockWindow() {
  /** @type {Map<string, string>} */
  const store = new Map();
  setupMockWindowObject(store);
  setupMockNavigator();
  setupMockFileApis();
  return { store };
}

/**
 * Binds DOM element constructor prototypes to globalThis.
 */
function bindGlobalElementConstructors() {
  /** @type {any} */ (globalThis).HTMLElement = MockElement;
  /** @type {any} */ (globalThis).HTMLSpanElement = MockElement;
  /** @type {any} */ (globalThis).HTMLDivElement = MockElement;
  /** @type {any} */ (globalThis).HTMLButtonElement = MockElement;
  /** @type {any} */ (globalThis).HTMLTableElement = MockElement;
  /** @type {any} */ (globalThis).HTMLFormElement = MockElement;
  /** @type {any} */ (globalThis).HTMLInputElement = MockElement;
  /** @type {any} */ (globalThis).HTMLSelectElement = MockElement;
  /** @type {any} */ (globalThis).SVGSVGElement = MockElement;
}

export function setupMockDom() {
  const body = new MockElement("body");
  /** @type {Map<string, any>} */
  const elementRegistry = new Map();
  /** @type {Map<string, any[]>} */
  const queryRegistry = new Map();
  /** @type {Record<string, Function[]>} */
  const docListeners = {};

  const doc = {
    body,
    documentElement: new MockElement("html"),
    /** @param {string} tag */
    createElement: (tag) => new MockElement(tag),
    /** @param {string} _ns @param {string} tag */
    createElementNS: (_ns, tag) => new MockElement(tag),
    /** @param {string} id */
    getElementById: (id) => {
      if (elementRegistry.has(id)) return elementRegistry.get(id);
      return id === "app-announcer" ? new MockElement("div") : null;
    },
    /** @param {string} sel */
    querySelectorAll: (sel) => queryRegistry.get(sel) || [],
    /** @param {string} event @param {Function} handler */
    addEventListener: (event, handler) => {
      if (!docListeners[event]) docListeners[event] = [];
      docListeners[event].push(handler);
    },
    /** @param {string} event @param {Function} handler */
    removeEventListener: (event, handler) => {
      if (docListeners[event]) {
        docListeners[event] = docListeners[event].filter((h) => h !== handler);
      }
    },
    /** @param {string} event @param {any} [data] */
    dispatchEvent: (event, data = {}) => {
      if (docListeners[event]) {
        docListeners[event].forEach((h) => h({ type: event, ...data }));
      }
    },
  };

  const { store } = setupMockWindow();
  /** @type {any} */ (globalThis).document = doc;
  bindGlobalElementConstructors();

  return { elementRegistry, queryRegistry, store };
}
