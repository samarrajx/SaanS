import test from "node:test";
import assert from "node:assert/strict";
import planHandler from "../../api/plan.js";
import { createMockReq, createMockRes } from "./mock-http.js";
import { setGeminiClient } from "../../api/_lib/gemini.js";

const VALID_PLAN_PAYLOAD = {
  location: { lat: 25.59, lon: 85.14, name: "Patna, Bihar" },
  household: { members: [{ id: "1", label: "Self", ageGroup: "adult", sensitive: false }] },
  home: { type: "flat", tightness: "average", windowsUsually: "mixed", cookingFuel: "lpg" },
  lifestyle: { commute: [{ mode: "car", distanceKm: 15, daysPerWeek: 5 }], budgetBand: "low" },
  language: "en",
};

test("POST /api/plan validates method, origin, rate limits, and payload integrity", async () => {
  // Method check
  const getReq = createMockReq({ method: "GET", url: "/api/plan" });
  const getRes = createMockRes();
  await planHandler(getReq, getRes);
  assert.equal(getRes.statusCode, 405);

  // Foreign origin
  const foreignReq = createMockReq({
    method: "POST",
    url: "/api/plan",
    headers: { origin: "https://localhost.evil.com" },
    body: VALID_PLAN_PAYLOAD,
  });
  const foreignRes = createMockRes();
  await planHandler(foreignReq, foreignRes);
  assert.equal(foreignRes.statusCode, 403);

  // Malformed JSON body
  const malformedReq = createMockReq({ method: "POST", url: "/api/plan", body: "{ invalid" });
  const malformedRes = createMockRes();
  await planHandler(malformedReq, malformedRes);
  assert.equal(malformedRes.statusCode, 400);

  // Oversized payload (> 32KB)
  const oversizeReq = createMockReq({
    method: "POST",
    url: "/api/plan",
    body: "x".repeat(33000),
  });
  const oversizeRes = createMockRes();
  await planHandler(oversizeReq, oversizeRes);
  assert.equal(oversizeRes.statusCode, 413);

  // Missing location
  const badReq = createMockReq({ method: "POST", url: "/api/plan", body: {} });
  const badRes = createMockRes();
  await planHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
});

test("POST /api/plan handles rate limiting when quota exceeded", async () => {
  const ip = "192.0.2.103";
  let lastStatus = 200;
  for (let i = 0; i < 70; i++) {
    const req = createMockReq({
      method: "POST",
      url: "/api/plan",
      headers: { "x-forwarded-for": ip },
      body: VALID_PLAN_PAYLOAD,
    });
    const res = createMockRes();
    await planHandler(req, res);
    lastStatus = res.statusCode;
  }
  assert.equal(lastStatus, 429);
});

test("POST /api/plan generates full plan using fallback when Gemini key absent", async () => {
  setGeminiClient(null);
  const req = createMockReq({
    method: "POST",
    url: "/api/plan",
    body: VALID_PLAN_PAYLOAD,
  });
  const res = createMockRes();

  await planHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Cache-Control"], "no-store");
  const data = JSON.parse(res.body);
  assert.ok(data.summary);
  assert.ok(data.headlineNAQI);
  assert.ok(data.dayPlan.length >= 4);
  assert.ok(data.topActions.length === 3);
  assert.ok(data.caveat);
});

test("POST /api/plan handles upstream air fetch success and fallback cleanly", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Upstream fetch success
    /** @type {any} */ (globalThis).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        hourly: {
          time: ["2026-11-18T00:00", "2026-11-18T01:00"],
          pm2_5: [150, 160],
          pm10: [250, 270],
        },
      }),
    });
    const successReq = createMockReq({
      method: "POST",
      url: "/api/plan",
      body: VALID_PLAN_PAYLOAD,
    });
    const successRes = createMockRes();
    await planHandler(successReq, successRes);
    assert.equal(successRes.statusCode, 200);

    // Upstream fetch error (!ok)
    /** @type {any} */ (globalThis).fetch = async () => ({
      ok: false,
      status: 500,
    });
    const errReq = createMockReq({
      method: "POST",
      url: "/api/plan",
      body: VALID_PLAN_PAYLOAD,
    });
    const errRes = createMockRes();
    await planHandler(errReq, errRes);
    assert.equal(errRes.statusCode, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/plan adopts Gemini AI narrative when generated", async () => {
  try {
    setGeminiClient({
      models: {
        generateContent: async () => ({
          text: "AI custom grounded narrative for today's air quality.",
        }),
      },
    });

    const req = createMockReq({
      method: "POST",
      url: "/api/plan",
      body: VALID_PLAN_PAYLOAD,
    });
    const res = createMockRes();
    await planHandler(req, res);

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.summary, "AI custom grounded narrative for today's air quality.");
  } finally {
    setGeminiClient(null);
  }
});

test("characterisation: POST /api/plan bad method and forbidden origin (405, 403)", async () => {
  // 405 Method Not Allowed
  const getReq = createMockReq({ method: "GET", url: "/api/plan" });
  const getRes = createMockRes();
  await planHandler(getReq, getRes);
  assert.equal(getRes.statusCode, 405);
  assert.equal(getRes.headers["Content-Type"], "application/json");
  assert.equal(getRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(getRes.body), { error: "Method Not Allowed", status: 405 });

  // 403 Forbidden Origin
  const originReq = createMockReq({
    method: "POST",
    url: "/api/plan",
    headers: { origin: "https://unauthorized.domain.org" },
    body: VALID_PLAN_PAYLOAD,
  });
  const originRes = createMockRes();
  await planHandler(originReq, originRes);
  assert.equal(originRes.statusCode, 403);
  assert.equal(originRes.headers["Content-Type"], "application/json");
  assert.equal(originRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(originRes.body), { error: "Forbidden Origin", status: 403 });
});

test("characterisation: POST /api/plan oversize and invalid payload (413, 400)", async () => {
  // 413 Payload Too Large
  const oversizeReq = createMockReq({
    method: "POST",
    url: "/api/plan",
    body: "x".repeat(33000),
  });
  const oversizeRes = createMockRes();
  await planHandler(oversizeReq, oversizeRes);
  assert.equal(oversizeRes.statusCode, 413);
  assert.equal(oversizeRes.headers["Content-Type"], "application/json");
  assert.equal(oversizeRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(oversizeRes.body), { error: "Invalid JSON body", status: 413 });

  // 400 Validation Error
  const badReq = createMockReq({
    method: "POST",
    url: "/api/plan",
    body: { location: { lat: 100 } },
  });
  const badRes = createMockRes();
  await planHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
  assert.equal(badRes.headers["Content-Type"], "application/json");
  assert.equal(badRes.headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(badRes.body), {
    error: "Validation failed for plan input",
    status: 400,
  });
});

test("characterisation: POST /api/plan rate limit response (429)", async () => {
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ hourly: { time: [], pm2_5: [], pm10: [] } }),
  });
  try {
    const ip = "192.0.2.202";
    let rateRes = createMockRes();
    for (let i = 0; i < 65; i++) {
      const r = createMockReq({
        method: "POST",
        url: "/api/plan",
        headers: { "x-forwarded-for": ip },
        body: VALID_PLAN_PAYLOAD,
      });
      rateRes = createMockRes();
      await planHandler(r, rateRes);
    }
    assert.equal(rateRes.statusCode, 429);
    assert.equal(rateRes.headers["Content-Type"], "application/json");
    assert.equal(rateRes.headers["Cache-Control"], "no-store");
    assert.deepEqual(JSON.parse(rateRes.body), { error: "Too Many Requests", status: 429 });
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("characterisation: POST /api/plan success response (200)", async () => {
  const origFetch = globalThis.fetch;
  /** @type {any} */ (globalThis).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      hourly: {
        time: ["2026-11-18T00:00", "2026-11-18T01:00"],
        pm2_5: [150, 160],
        pm10: [250, 270],
      },
    }),
  });
  try {
    const okReq = createMockReq({
      method: "POST",
      url: "/api/plan",
      body: VALID_PLAN_PAYLOAD,
    });
    const okRes = createMockRes();
    await planHandler(okReq, okRes);
    assert.equal(okRes.statusCode, 200);
    assert.equal(okRes.headers["Content-Type"], "application/json");
    assert.equal(okRes.headers["Cache-Control"], "no-store");
    const data = JSON.parse(okRes.body);
    assert.ok(typeof data.summary === "string");
    assert.ok(typeof data.headlineNAQI === "object");
    assert.ok(Array.isArray(data.dayPlan));
    assert.ok(Array.isArray(data.topActions));
    assert.ok(typeof data.caveat === "string");
    assert.ok(typeof data.airMeta === "object");
  } finally {
    globalThis.fetch = origFetch;
  }
});
