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
