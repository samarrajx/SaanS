import test from "node:test";
import assert from "node:assert/strict";
import pingHandler from "../../api/ping.js";

/**
 * Creates a mock HTTP request.
 * @param {string} method
 * @returns {any}
 */
function createMockReq(method) {
  return { method, headers: {} };
}

/**
 * Creates a mock HTTP response.
 * @returns {any}
 */
function createMockRes() {
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
      this.body = data;
    },
  };
}

test("GET /api/ping returns 200 with status ok", () => {
  const req = createMockReq("GET");
  const res = createMockRes();

  pingHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "application/json");
  const parsed = JSON.parse(res.body);
  assert.equal(parsed.status, "ok");
  assert.equal(parsed.app, "Saans");
  assert.ok(parsed.timestamp);
});

test("POST /api/ping returns 405 Method Not Allowed", () => {
  const req = createMockReq("POST");
  const res = createMockRes();

  pingHandler(req, res);

  assert.equal(res.statusCode, 405);
  const parsed = JSON.parse(res.body);
  assert.equal(parsed.error, "Method Not Allowed");
});
