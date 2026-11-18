import test from "node:test";
import assert from "node:assert/strict";
import geocodeHandler from "../../api/geocode.js";
import { createMockReq, createMockRes } from "./mock-http.js";
import { cache } from "../../api/_lib/cache.js";

test("GET /api/geocode validates method, origin, rate limits, and query length", async () => {
  // Method Not Allowed
  const postReq = createMockReq({ method: "POST", url: "/api/geocode?q=Patna" });
  const postRes = createMockRes();
  await geocodeHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 405);

  // Foreign origin
  const foreignReq = createMockReq({
    url: "/api/geocode?q=Patna",
    headers: { origin: "https://localhost.evil.com" },
  });
  const foreignRes = createMockRes();
  await geocodeHandler(foreignReq, foreignRes);
  assert.equal(foreignRes.statusCode, 403);

  // Too short (< 2 chars)
  const shortReq = createMockReq({ url: "/api/geocode?q=a" });
  const shortRes = createMockRes();
  await geocodeHandler(shortReq, shortRes);
  assert.equal(shortRes.statusCode, 400);

  // Too long (> 80 chars)
  const longReq = createMockReq({ url: `/api/geocode?q=${"x".repeat(85)}` });
  const longRes = createMockRes();
  await geocodeHandler(longReq, longRes);
  assert.equal(longRes.statusCode, 400);
});

test("GET /api/geocode handles rate limiting when quota exceeded", async () => {
  cache.setGeocode("delhi", []);
  const ip = "192.0.2.102";
  let lastStatus = 200;
  for (let i = 0; i < 70; i++) {
    const req = createMockReq({
      url: "/api/geocode?q=Delhi",
      headers: { "x-forwarded-for": ip },
    });
    const res = createMockRes();
    await geocodeHandler(req, res);
    lastStatus = res.statusCode;
  }
  assert.equal(lastStatus, 429);
});

test("GET /api/geocode normalizes results and populates cache", async () => {
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
        { name: "Gaya", admin2: "Magadh", country: "India" },
      ],
    }),
  });

  try {
    const req = createMockReq({ url: "/api/geocode?q=Patna" });
    const res = createMockRes();
    await geocodeHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["X-Cache"], "MISS");
    const results = JSON.parse(res.body);
    assert.equal(results.length, 2);
    assert.equal(results[0].name, "Patna");
    assert.equal(results[0].lat, 25.59);
    assert.equal(results[1].admin, "Magadh");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/geocode returns cached results on second request", async () => {
  const req = createMockReq({ url: "/api/geocode?q=Patna" });
  const res = createMockRes();
  await geocodeHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["X-Cache"], "HIT");
});

test("GET /api/geocode handles empty results and upstream failure cleanly", async () => {
  cache.clear();
  const originalFetch = globalThis.fetch;

  try {
    // Empty results
    /** @type {any} */ (globalThis).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const emptyReq = createMockReq({ url: "/api/geocode?q=Nowhere" });
    const emptyRes = createMockRes();
    await geocodeHandler(emptyReq, emptyRes);
    assert.equal(emptyRes.statusCode, 200);
    assert.deepEqual(JSON.parse(emptyRes.body), []);

    // Upstream 500 error
    /** @type {any} */ (globalThis).fetch = async () => ({
      ok: false,
      status: 500,
    });
    const errReq = createMockReq({ url: "/api/geocode?q=FailCity" });
    const errRes = createMockRes();
    await geocodeHandler(errReq, errRes);
    assert.equal(errRes.statusCode, 502);

    // Upstream network throw
    /** @type {any} */ (globalThis).fetch = async () => {
      throw new Error("Network timeout");
    };
    const throwReq = createMockReq({ url: "/api/geocode?q=TimeoutCity" });
    const throwRes = createMockRes();
    await geocodeHandler(throwReq, throwRes);
    assert.equal(throwRes.statusCode, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("characterisation: GET /api/geocode error responses (405, 403, 400)", async () => {
  // 405 Method Not Allowed
  const postReq = createMockReq({ method: "POST", url: "/api/geocode?q=Patna" });
  const postRes = createMockRes();
  await geocodeHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 405);
  assert.equal(postRes.headers["Content-Type"], "application/json");
  assert.equal(postRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(postRes.body), { error: "Method Not Allowed", status: 405 });

  // 403 Forbidden Origin
  const originReq = createMockReq({
    url: "/api/geocode?q=Patna",
    headers: { origin: "https://unauthorized.domain.org" },
  });
  const originRes = createMockRes();
  await geocodeHandler(originReq, originRes);
  assert.equal(originRes.statusCode, 403);
  assert.equal(originRes.headers["Content-Type"], "application/json");
  assert.equal(originRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(originRes.body), { error: "Forbidden Origin", status: 403 });

  // 400 Bad Request
  const badReq = createMockReq({ url: "/api/geocode?q=a" });
  const badRes = createMockRes();
  await geocodeHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
  assert.equal(badRes.headers["Content-Type"], "application/json");
  assert.equal(badRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(badRes.body), {
    error: "Query parameter 'q' must be between 2 and 80 characters",
    status: 400,
  });
});

test("characterisation: GET /api/geocode rate limit response (429)", async () => {
  cache.setGeocode("patna", []);
  const ip = "192.0.2.201";
  let rateRes = createMockRes();
  for (let i = 0; i < 65; i++) {
    const r = createMockReq({
      url: "/api/geocode?q=Patna",
      headers: { "x-forwarded-for": ip },
    });
    rateRes = createMockRes();
    await geocodeHandler(r, rateRes);
  }
  assert.equal(rateRes.statusCode, 429);
  assert.equal(rateRes.headers["Content-Type"], "application/json");
  assert.equal(rateRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(rateRes.body), { error: "Too Many Requests", status: 429 });
});

const MOCK_PATNA_GEOCODE = [
  {
    name: "Patna",
    admin1: "Bihar",
    country: "India",
    latitude: 25.5941,
    longitude: 85.1376,
    timezone: "Asia/Kolkata",
  },
];

test("characterisation: GET /api/geocode cache MISS and HIT (200)", async () => {
  cache.clear();
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ results: MOCK_PATNA_GEOCODE }),
  });

  try {
    const okReq1 = createMockReq({ url: "/api/geocode?q=Patna" });
    const okRes1 = createMockRes();
    await geocodeHandler(okReq1, okRes1);
    assert.equal(okRes1.statusCode, 200);
    assert.equal(okRes1.headers["Content-Type"], "application/json");
    assert.equal(okRes1.headers["Cache-Control"], "public, max-age=86400");
    assert.equal(okRes1.headers["X-Cache"], "MISS");
    const body1 = JSON.parse(okRes1.body);
    assert.deepEqual(body1, [
      {
        name: "Patna",
        admin: "Bihar",
        country: "India",
        lat: 25.59,
        lon: 85.14,
        timezone: "Asia/Kolkata",
      },
    ]);

    const okReq2 = createMockReq({ url: "/api/geocode?q=Patna" });
    const okRes2 = createMockRes();
    await geocodeHandler(okReq2, okRes2);
    assert.equal(okRes2.statusCode, 200);
    assert.equal(okRes2.headers["X-Cache"], "HIT");
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("characterisation: GET /api/geocode upstream failure (502)", async () => {
  cache.clear();
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({ ok: false, status: 500 });
  try {
    const failReq = createMockReq({ url: "/api/geocode?q=Patna" });
    const failRes = createMockRes();
    await geocodeHandler(failReq, failRes);
    assert.equal(failRes.statusCode, 502);
    assert.equal(failRes.headers["Content-Type"], "application/json");
    assert.equal(failRes.headers["Cache-Control"], "no-store");
    assert.deepEqual(JSON.parse(failRes.body), {
      error: "Failed to retrieve location search results",
      status: 502,
    });
  } finally {
    globalThis.fetch = origFetch;
  }
});
