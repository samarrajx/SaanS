import test from "node:test";
import assert from "node:assert/strict";
import noticeHandler from "../../api/notice.js";
import { createMockReq, createMockRes } from "./mock-http.js";
import { setGeminiClient } from "../../api/_lib/gemini.js";

const VALID_NOTICE_PAYLOAD = {
  communityType: "rwa",
  category: "Severe",
  language: "en",
};

test("POST /api/notice validates method, origin, rate limits, and payload integrity", async () => {
  // Method check
  const getReq = createMockReq({ method: "GET", url: "/api/notice" });
  const getRes = createMockRes();
  await noticeHandler(getReq, getRes);
  assert.equal(getRes.statusCode, 405);

  // Foreign origin
  const foreignReq = createMockReq({
    method: "POST",
    url: "/api/notice",
    headers: { origin: "https://localhost.evil.com" },
    body: VALID_NOTICE_PAYLOAD,
  });
  const foreignRes = createMockRes();
  await noticeHandler(foreignReq, foreignRes);
  assert.equal(foreignRes.statusCode, 403);

  // Malformed JSON
  const malformedReq = createMockReq({ method: "POST", url: "/api/notice", body: "{ invalid" });
  const malformedRes = createMockRes();
  await noticeHandler(malformedReq, malformedRes);
  assert.equal(malformedRes.statusCode, 400);

  // Oversized payload (> 32KB)
  const oversizeReq = createMockReq({
    method: "POST",
    url: "/api/notice",
    body: "x".repeat(33000),
  });
  const oversizeRes = createMockRes();
  await noticeHandler(oversizeReq, oversizeRes);
  assert.equal(oversizeRes.statusCode, 413);

  // Invalid category schema
  const badReq = createMockReq({
    method: "POST",
    url: "/api/notice",
    body: { communityType: "rwa", category: "InvalidCategory" },
  });
  const badRes = createMockRes();
  await noticeHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
});

test("POST /api/notice handles rate limiting when quota exceeded", async () => {
  const ip = "192.0.2.104";
  let lastStatus = 200;
  for (let i = 0; i < 70; i++) {
    const req = createMockReq({
      method: "POST",
      url: "/api/notice",
      headers: { "x-forwarded-for": ip },
      body: VALID_NOTICE_PAYLOAD,
    });
    const res = createMockRes();
    await noticeHandler(req, res);
    lastStatus = res.statusCode;
  }
  assert.equal(lastStatus, 429);
});

test("POST /api/notice generates baseline notice when Gemini absent or malformed", async () => {
  setGeminiClient(null);

  // Missing client fallback
  const validReq = createMockReq({
    method: "POST",
    url: "/api/notice",
    body: VALID_NOTICE_PAYLOAD,
  });
  const validRes = createMockRes();
  await noticeHandler(validReq, validRes);

  assert.equal(validRes.statusCode, 200);
  const data = JSON.parse(validRes.body);
  assert.ok(data.whatsapp.includes("Air Quality Alert"));
  assert.ok(data.email.includes("Subject:"));
  assert.ok(data.noticeBoard.length > 5);

  // Malformed JSON from Gemini fallback
  setGeminiClient({
    models: {
      generateContent: async () => ({ text: "{ malformed json" }),
    },
  });
  try {
    const malformedReq = createMockReq({
      method: "POST",
      url: "/api/notice",
      body: VALID_NOTICE_PAYLOAD,
    });
    const malformedRes = createMockRes();
    await noticeHandler(malformedReq, malformedRes);
    assert.equal(malformedRes.statusCode, 200);
    assert.ok(JSON.parse(malformedRes.body).whatsapp.includes("Air Quality Alert"));
  } finally {
    setGeminiClient(null);
  }
});

test("POST /api/notice adopts AI crafted circular when Gemini succeeds", async () => {
  try {
    setGeminiClient({
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            whatsapp: "🔔 *Urgent Community Clean Air Notice*",
            email: "Subject: Urgent Community Smog Action\n\nPlease seal windows.",
            noticeBoard: "WARNING: SEVERE SMOG CONDITIONS TODAY",
          }),
        }),
      },
    });

    const req = createMockReq({
      method: "POST",
      url: "/api/notice",
      body: VALID_NOTICE_PAYLOAD,
    });
    const res = createMockRes();
    await noticeHandler(req, res);

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.whatsapp, "🔔 *Urgent Community Clean Air Notice*");
    assert.equal(data.noticeBoard, "WARNING: SEVERE SMOG CONDITIONS TODAY");
  } finally {
    setGeminiClient(null);
  }
});
