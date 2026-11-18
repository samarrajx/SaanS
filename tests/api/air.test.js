import test from "node:test";
import assert from "node:assert/strict";
import airHandler from "../../api/air.js";
import { createMockReq, createMockRes } from "./mock-http.js";
import { cache } from "../../api/_lib/cache.js";

test("GET /api/air validates parameters, enforces methods and origin", async () => {
  // Method Not Allowed
  const postReq = createMockReq({ method: "POST", url: "/api/air?lat=25.59&lon=85.14" });
  const postRes = createMockRes();
  await airHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 405);

  // Forbidden Origin
  const evilReq = createMockReq({
    url: "/api/air?lat=25.59&lon=85.14",
    headers: { origin: "https://evil.attacker.com" },
  });
  const evilRes = createMockRes();
  await airHandler(evilReq, evilRes);
  assert.equal(evilRes.statusCode, 403);

  // Invalid coordinates
  const badReq = createMockReq({ url: "/api/air?lat=999&lon=85.14" });
  const badRes = createMockRes();
  await airHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
});

test("GET /api/air normalizes Open-Meteo response and exercises caching", async () => {
  cache.clear();
  const originalFetch = globalThis.fetch;

  // Mock upstream Open-Meteo response
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      hourly: {
        time: ["2026-11-18T00:00", "2026-11-18T01:00"],
        pm2_5: [180.4, 210.8],
        pm10: [290.2, 330.1],
      },
    }),
  });

  try {
    // First call: Cache MISS
    const req1 = createMockReq({ url: "/api/air?lat=25.59&lon=85.14" });
    const res1 = createMockRes();
    await airHandler(req1, res1);

    assert.equal(res1.statusCode, 200);
    assert.equal(res1.headers["X-Cache"], "MISS");
    const data1 = JSON.parse(res1.body);
    assert.equal(data1.pm25.length, 2);
    assert.equal(data1.pm25[0], 180.4);
    assert.ok(data1.meta.attribution.includes("CC BY 4.0"));

    // Second call: Cache HIT
    const req2 = createMockReq({ url: "/api/air?lat=25.59&lon=85.14" });
    const res2 = createMockRes();
    await airHandler(req2, res2);

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.headers["X-Cache"], "HIT");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/air returns 502 on upstream failure", async () => {
  cache.clear();
  const originalFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: false,
    status: 500,
  });

  try {
    const req = createMockReq({ url: "/api/air?lat=12.97&lon=77.59" });
    const res = createMockRes();
    await airHandler(req, res);
    assert.equal(res.statusCode, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/air validates coordinate boundary limits and handles non-numeric upstream data", async () => {
  cache.clear();

  // Test longitude out of bounds
  const badLonReq = createMockReq({ url: "/api/air?lat=28.61&lon=200" });
  const badLonRes = createMockRes();
  await airHandler(badLonReq, badLonRes);
  assert.equal(badLonRes.statusCode, 400);

  // Test non-numeric parameters
  const badCoordReq = createMockReq({ url: "/api/air?lat=abc&lon=xyz" });
  const emptyRes = createMockRes();
  await airHandler(badCoordReq, emptyRes);
  assert.equal(emptyRes.statusCode, 400);

  // Upstream with non-numeric / null values
  const originalFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      hourly: {
        time: ["2026-11-18T00:00", "2026-11-18T01:00"],
        pm2_5: [null, 99.45],
        pm10: [undefined, 180.22],
      },
    }),
  });

  try {
    const req = createMockReq({ url: "/api/air?lat=28.6139&lon=77.2090" });
    const res = createMockRes();
    await airHandler(req, res);
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.pm25[0], 0);
    assert.equal(data.pm25[1], 99.5);
    assert.equal(data.pm10[0], 0);
    assert.equal(data.pm10[1], 180.2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("characterisation: GET /api/air error responses (405, 403, 400)", async () => {
  // 405 Method Not Allowed
  const postReq = createMockReq({ method: "POST", url: "/api/air?lat=25.59&lon=85.14" });
  const postRes = createMockRes();
  await airHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 405);
  assert.equal(postRes.headers["Content-Type"], "application/json");
  assert.equal(postRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(postRes.body), { error: "Method Not Allowed", status: 405 });

  // 403 Forbidden Origin
  const originReq = createMockReq({
    url: "/api/air?lat=25.59&lon=85.14",
    headers: { origin: "https://unauthorized.domain.org" },
  });
  const originRes = createMockRes();
  await airHandler(originReq, originRes);
  assert.equal(originRes.statusCode, 403);
  assert.equal(originRes.headers["Content-Type"], "application/json");
  assert.equal(originRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(originRes.body), { error: "Forbidden Origin", status: 403 });

  // 400 Bad Request
  const badReq = createMockReq({ url: "/api/air?lat=120&lon=85.14" });
  const badRes = createMockRes();
  await airHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
  assert.equal(badRes.headers["Content-Type"], "application/json");
  assert.equal(badRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(badRes.body), {
    error: "Invalid coordinates. Latitude must be [-90, 90], longitude [-180, 180]",
    status: 400,
  });
});

test("characterisation: GET /api/air rate limit response (429)", async () => {
  cache.clear();
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ hourly: { time: [], pm2_5: [], pm10: [] } }),
  });
  try {
    const ip = "192.0.2.199";
    let rateRes = createMockRes();
    for (let i = 0; i < 65; i++) {
      const r = createMockReq({
        url: "/api/air?lat=25.59&lon=85.14",
        headers: { "x-forwarded-for": ip },
      });
      rateRes = createMockRes();
      await airHandler(r, rateRes);
    }
    assert.equal(rateRes.statusCode, 429);
    assert.equal(rateRes.headers["Content-Type"], "application/json");
    assert.equal(rateRes.headers["Cache-Control"], "no-store");
    assert.deepEqual(JSON.parse(rateRes.body), { error: "Too Many Requests", status: 429 });
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("characterisation: GET /api/air cache MISS and HIT (200)", async () => {
  cache.clear();
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      hourly: {
        time: ["2026-11-18T00:00"],
        pm2_5: [150.2],
        pm10: [250.4],
      },
    }),
  });

  try {
    const okReq1 = createMockReq({ url: "/api/air?lat=25.59&lon=85.14" });
    const okRes1 = createMockRes();
    await airHandler(okReq1, okRes1);
    assert.equal(okRes1.statusCode, 200);
    assert.equal(okRes1.headers["Content-Type"], "application/json");
    assert.equal(okRes1.headers["Cache-Control"], "public, max-age=1800");
    assert.equal(okRes1.headers["X-Cache"], "MISS");
    const body1 = JSON.parse(okRes1.body);
    assert.deepEqual(body1.times, ["2026-11-18T00:00"]);
    assert.deepEqual(body1.pm25, [150.2]);
    assert.deepEqual(body1.pm10, [250.4]);

    const okReq2 = createMockReq({ url: "/api/air?lat=25.59&lon=85.14" });
    const okRes2 = createMockRes();
    await airHandler(okReq2, okRes2);
    assert.equal(okRes2.statusCode, 200);
    assert.equal(okRes2.headers["X-Cache"], "HIT");
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("characterisation: GET /api/air upstream failure (502)", async () => {
  cache.clear();
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({ ok: false, status: 500 });
  try {
    const failReq = createMockReq({ url: "/api/air?lat=25.59&lon=85.14" });
    const failRes = createMockRes();
    await airHandler(failReq, failRes);
    assert.equal(failRes.statusCode, 502);
    assert.equal(failRes.headers["Content-Type"], "application/json");
    assert.equal(failRes.headers["Cache-Control"], "no-store");
    assert.deepEqual(JSON.parse(failRes.body), {
      error: "Failed to retrieve upstream air quality data",
      status: 502,
    });
  } finally {
    globalThis.fetch = origFetch;
  }
});
