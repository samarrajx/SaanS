/**
 * @fileoverview Reusable HTTP Request and Response Mocking Helper for API Tests.
 */

import { Readable } from "node:stream";

/**
 * Creates a mock HTTP request with readable stream body.
 *
 * @param {Object} options
 * @param {string} [options.method="GET"]
 * @param {string} [options.url="/"]
 * @param {Record<string, string>} [options.headers={}]
 * @param {any} [options.body]
 * @returns {any}
 */
export function createMockReq({ method = "GET", url = "/", headers = {}, body = null }) {
  const req = new Readable({
    read() {
      if (body !== null) {
        this.push(typeof body === "string" ? body : JSON.stringify(body));
      }
      this.push(null);
    },
  });

  /** @type {any} */ (req).method = method;
  /** @type {any} */ (req).url = url;
  /** @type {any} */ (req).headers = { host: "localhost:3000", ...headers };
  /** @type {any} */ (req).socket = { remoteAddress: "127.0.0.1" };

  return req;
}

/**
 * Creates a mock HTTP response recording status, headers, and body.
 *
 * @returns {any}
 */
export function createMockRes() {
  /** @type {Record<string, string>} */
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: "",
    /**
     * @param {string} name
     * @param {string} value
     */
    setHeader(name, value) {
      headers[name] = value;
    },
    /**
     * @param {string} data
     */
    end(data) {
      this.body = data || "";
    },
  };
}
