import test from "node:test";
import assert from "node:assert/strict";
import { verifyOrigin, checkRateLimit, readJsonBody } from "../../api/_lib/security.js";
import { Readable } from "node:stream";

test("verifyOrigin allows localhost and exact self host", () => {
  /** @type {any} */
  const localReq = { headers: { origin: "http://localhost:3000", host: "localhost:3000" } };
  assert.equal(verifyOrigin(localReq), true);

  /** @type {any} */
  const ipReq = { headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" } };
  assert.equal(verifyOrigin(ipReq), true);

  /** @type {any} */
  const prodReq = { headers: { origin: "https://saans.vercel.app", host: "saans.vercel.app" } };
  assert.equal(verifyOrigin(prodReq), true);

  /** @type {any} */
  const noOriginReq = { headers: {} };
  assert.equal(verifyOrigin(noOriginReq), true);
});

test("verifyOrigin strictly rejects suffix spoofing and foreign domains", () => {
  /** @type {any} */
  const evil1 = { headers: { origin: "https://localhost.evil.com", host: "localhost:3000" } };
  assert.equal(verifyOrigin(evil1), false);

  /** @type {any} */
  const evil2 = {
    headers: { origin: "https://saans.vercel.app.attacker.com", host: "saans.vercel.app" },
  };
  assert.equal(verifyOrigin(evil2), false);

  /** @type {any} */
  const evil3 = { headers: { origin: "https://attacker.com", host: "saans.vercel.app" } };
  assert.equal(verifyOrigin(evil3), false);
});

test("checkRateLimit tracks per-IP window and throttles excess calls", () => {
  /** @type {any} */
  const req = {
    headers: { "x-forwarded-for": "198.51.100.1" },
    socket: {},
  };

  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit(req, 5), true);
  }
  // 6th call should be blocked by limit 5
  assert.equal(checkRateLimit(req, 5), false);
});

test("readJsonBody caps oversized payload at 32KB", async () => {
  const hugePayload = "x".repeat(35000);
  const stream = Readable.from([Buffer.from(hugePayload)]);
  /** @type {any} */ (stream).headers = {};

  await assert.rejects(
    async () => readJsonBody(/** @type {any} */ (stream)),
    (err) => /** @type {any} */ (err).status === 413
  );
});
