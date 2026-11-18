import test from "node:test";
import assert from "node:assert/strict";
import planHandler from "../../api/plan.js";
import { createMockReq, createMockRes } from "./mock-http.js";

test("POST /api/plan validates inputs and method", async () => {
  // Method check
  const getReq = createMockReq({ method: "GET", url: "/api/plan" });
  const getRes = createMockRes();
  await planHandler(getReq, getRes);
  assert.equal(getRes.statusCode, 405);

  // Missing location
  const badReq = createMockReq({ method: "POST", url: "/api/plan", body: {} });
  const badRes = createMockRes();
  await planHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
});

test("POST /api/plan generates full plan using fallback when Gemini key absent", async () => {
  const req = createMockReq({
    method: "POST",
    url: "/api/plan",
    body: {
      location: { lat: 25.59, lon: 85.14, name: "Patna, Bihar" },
      household: { members: [{ id: "1", label: "Self", ageGroup: "adult", sensitive: false }] },
      home: { type: "flat", tightness: "average", windowsUsually: "mixed", cookingFuel: "lpg" },
      lifestyle: { commute: [{ mode: "car", distanceKm: 15, daysPerWeek: 5 }], budgetBand: "low" },
      language: "en",
    },
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
