import test from "node:test";
import assert from "node:assert/strict";
import noticeHandler from "../../api/notice.js";
import { createMockReq, createMockRes } from "./mock-http.js";

test("POST /api/notice validates parameters and generates all 3 channels", async () => {
  // Invalid category
  const badReq = createMockReq({
    method: "POST",
    url: "/api/notice",
    body: { communityType: "rwa", category: "InvalidCategory" },
  });
  const badRes = createMockRes();
  await noticeHandler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);

  // Valid RWA request
  const validReq = createMockReq({
    method: "POST",
    url: "/api/notice",
    body: { communityType: "rwa", category: "Severe", language: "en" },
  });
  const validRes = createMockRes();
  await noticeHandler(validReq, validRes);

  assert.equal(validRes.statusCode, 200);
  const data = JSON.parse(validRes.body);
  assert.ok(data.whatsapp.includes("Air Quality Alert"));
  assert.ok(data.email.includes("Subject:"));
  assert.ok(data.noticeBoard.length > 5);
});
