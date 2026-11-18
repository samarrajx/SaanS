import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createHandler, getErrorStatus } from "../../api/_lib/handler.js";
import { createMockReq, createMockRes } from "./mock-http.js";

test("createHandler enforces allowed HTTP methods", async () => {
  const handler = createHandler({
    methods: ["GET"],
    run: ({ res }) => {
      res.end("ok");
    },
  });

  const postReq = createMockReq({ method: "POST", url: "/api/test" });
  const postRes = createMockRes();
  await handler(postReq, postRes);

  assert.equal(postRes.statusCode, 405);
  assert.deepEqual(JSON.parse(postRes.body), { error: "Method Not Allowed", status: 405 });
});

test("createHandler enforces origin verification", async () => {
  const handler = createHandler({
    methods: ["POST"],
    run: ({ res }) => {
      res.end("ok");
    },
  });

  const badOriginReq = createMockReq({
    method: "POST",
    url: "/api/test",
    headers: { origin: "https://evil.unauthorized.com" },
  });
  const badOriginRes = createMockRes();
  await handler(badOriginReq, badOriginRes);

  assert.equal(badOriginRes.statusCode, 403);
  assert.deepEqual(JSON.parse(badOriginRes.body), { error: "Forbidden Origin", status: 403 });
});

test("createHandler enforces rate limiting", async () => {
  const handler = createHandler({
    methods: ["GET"],
    rateLimit: 2,
    run: ({ res }) => {
      res.end("ok");
    },
  });

  const ip = "192.0.2.222";
  const req1 = createMockReq({ url: "/api/test", headers: { "x-forwarded-for": ip } });
  const res1 = createMockRes();
  await handler(req1, res1);
  assert.equal(res1.statusCode, 200);

  const req2 = createMockReq({ url: "/api/test", headers: { "x-forwarded-for": ip } });
  const res2 = createMockRes();
  await handler(req2, res2);
  assert.equal(res2.statusCode, 200);

  const req3 = createMockReq({ url: "/api/test", headers: { "x-forwarded-for": ip } });
  const res3 = createMockRes();
  await handler(req3, res3);
  assert.equal(res3.statusCode, 429);
  assert.deepEqual(JSON.parse(res3.body), { error: "Too Many Requests", status: 429 });
});

test("createHandler handles POST payload errors: 413 and 400", async () => {
  const handler = createHandler({
    methods: ["POST"],
    run: ({ res }) => {
      res.end("ok");
    },
  });

  const oversizeReq = createMockReq({
    method: "POST",
    url: "/api/test",
    body: "x".repeat(33000),
  });
  const oversizeRes = createMockRes();
  await handler(oversizeReq, oversizeRes);
  assert.equal(oversizeRes.statusCode, 413);

  const malformedReq = createMockReq({ method: "POST", url: "/api/test", body: "{ bad" });
  const malformedRes = createMockRes();
  await handler(malformedReq, malformedRes);
  assert.equal(malformedRes.statusCode, 400);
});

test("createHandler validates Zod schema and custom error message", async () => {
  const handler = createHandler({
    methods: ["POST"],
    schema: z.object({ city: z.string().min(3) }),
    schemaErrorMessage: "Invalid city specified",
    run: ({ res, data }) => {
      res.end(JSON.stringify(data));
    },
  });

  const badReq = createMockReq({ method: "POST", url: "/api/test", body: { city: "ab" } });
  const badRes = createMockRes();
  await handler(badReq, badRes);
  assert.equal(badRes.statusCode, 400);
  assert.deepEqual(JSON.parse(badRes.body), { error: "Invalid city specified", status: 400 });

  const okReq = createMockReq({ method: "POST", url: "/api/test", body: { city: "Patna" } });
  const okRes = createMockRes();
  await handler(okReq, okRes);
  assert.equal(okRes.statusCode, 200);
  assert.deepEqual(JSON.parse(okRes.body), { city: "Patna" });
});

test("createHandler supports custom getQuery helper", async () => {
  const handler = createHandler({
    methods: ["GET"],
    getQuery: (req) => {
      const u = new URL(req.url || "", "http://localhost");
      return { tag: u.searchParams.get("tag")?.toUpperCase() };
    },
    run: ({ res, data }) => {
      res.end(JSON.stringify(data));
    },
  });

  const req = createMockReq({ method: "GET", url: "/api/test?tag=cleanair" });
  const res = createMockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { tag: "CLEANAIR" });
});

test("getErrorStatus extracts status code or defaults to 400", () => {
  assert.equal(getErrorStatus({ status: 413 }), 413);
  assert.equal(getErrorStatus({ status: 500 }), 500);
  assert.equal(getErrorStatus(new Error("Generic")), 400);
  assert.equal(getErrorStatus(null), 400);
  assert.equal(getErrorStatus(undefined), 400);
});
