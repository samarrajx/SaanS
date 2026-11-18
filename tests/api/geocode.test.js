import test from "node:test";
import assert from "node:assert/strict";
import geocodeHandler from "../../api/geocode.js";
import { createMockReq, createMockRes } from "./mock-http.js";
import { cache } from "../../api/_lib/cache.js";

test("GET /api/geocode validates query length and method", async () => {
  // Too short (< 2 chars)
  const shortReq = createMockReq({ url: "/api/geocode?q=a" });
  const shortRes = createMockRes();
  await geocodeHandler(shortReq, shortRes);
  assert.equal(shortRes.statusCode, 400);

  // Method Not Allowed
  const postReq = createMockReq({ method: "POST", url: "/api/geocode?q=Patna" });
  const postRes = createMockRes();
  await geocodeHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 405);
});

test("GET /api/geocode normalizes results and caches", async () => {
  cache.clear();
  const originalFetch = globalThis.fetch;

  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      results: [
        {
          name: "Patna",
          admin1: "Bihar",
          country: "India",
          latitude: 25.5941,
          longitude: 85.1376,
          timezone: "Asia/Kolkata",
        },
      ],
    }),
  });

  try {
    const req1 = createMockReq({ url: "/api/geocode?q=Patna" });
    const res1 = createMockRes();
    await geocodeHandler(req1, res1);

    assert.equal(res1.statusCode, 200);
    assert.equal(res1.headers["X-Cache"], "MISS");
    const results = JSON.parse(res1.body);
    assert.equal(results.length, 1);
    assert.equal(results[0].name, "Patna");
    assert.equal(results[0].lat, 25.59);

    // Second call hits cache
    const req2 = createMockReq({ url: "/api/geocode?q=Patna" });
    const res2 = createMockRes();
    await geocodeHandler(req2, res2);
    assert.equal(res2.headers["X-Cache"], "HIT");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
