import test from "node:test";
import assert from "node:assert/strict";
import {
  getGeminiClient,
  getModelName,
  setGeminiClient,
  generateGroundedContent,
} from "../../api/_lib/gemini.js";

test("getModelName returns default and respects environment override", () => {
  const origModel = process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_MODEL;
    assert.equal(getModelName(), "gemini-3.8-flash");

    process.env.GEMINI_MODEL = "gemini-test-custom";
    assert.equal(getModelName(), "gemini-test-custom");
  } finally {
    if (origModel !== undefined) process.env.GEMINI_MODEL = origModel;
    else delete process.env.GEMINI_MODEL;
  }
});

test("getGeminiClient handles missing API key, valid key, and injected client", () => {
  const origKey = process.env.GEMINI_API_KEY;
  try {
    setGeminiClient(null);
    delete process.env.GEMINI_API_KEY;
    assert.equal(getGeminiClient(), null);

    process.env.GEMINI_API_KEY = "   ";
    assert.equal(getGeminiClient(), null);

    process.env.GEMINI_API_KEY = "valid-test-key-123";
    const client = getGeminiClient();
    assert.ok(client);

    const mockInjected = { mock: true };
    setGeminiClient(mockInjected);
    assert.equal(getGeminiClient(), mockInjected);
  } finally {
    setGeminiClient(null);
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("generateGroundedContent returns valid JSON and respects jsonMode on/off", async () => {
  /** @type {any} */
  let capturedConfig = null;
  const mockAi = {
    models: {
      /** @param {any} param0 */
      generateContent: async ({ config }) => {
        capturedConfig = config;
        return { text: '{"status":"ok","value":42}' };
      },
    },
  };

  const resJson = await generateGroundedContent({
    prompt: "Return json",
    systemInstruction: "You are a helper",
    jsonMode: true,
    customClient: mockAi,
  });

  assert.equal(capturedConfig?.responseMimeType, "application/json");
  assert.equal(capturedConfig?.systemInstruction, "You are a helper");
  assert.deepEqual(JSON.parse(resJson || ""), { status: "ok", value: 42 });

  const resText = await generateGroundedContent({
    prompt: "Return text",
    jsonMode: false,
    customClient: mockAi,
  });
  assert.equal(capturedConfig?.responseMimeType, undefined);
  assert.ok(resText);
});

test("generateGroundedContent returns malformed JSON raw string cleanly", async () => {
  const mockAi = {
    models: {
      generateContent: async () => ({ text: '{"bad_json: missing_brace' }),
    },
  };

  const res = await generateGroundedContent({
    prompt: "Generate malformed",
    customClient: mockAi,
  });
  assert.equal(res, '{"bad_json: missing_brace');
  assert.throws(() => JSON.parse(res || ""), SyntaxError);
});

test("generateGroundedContent handles timeout, abort and SDK errors with null", async () => {
  const timeoutMock = {
    models: {
      generateContent: async () => new Promise((resolve) => setTimeout(resolve, 500)),
    },
  };

  const timeoutRes = await generateGroundedContent({
    prompt: "Will timeout",
    customClient: timeoutMock,
    timeoutMs: 15,
  });
  assert.equal(timeoutRes, null);

  const errorMock = {
    models: {
      generateContent: async () => {
        throw new Error("SDK quota exhausted (429)");
      },
    },
  };

  const errorRes = await generateGroundedContent({
    prompt: "Will error",
    customClient: errorMock,
  });
  assert.equal(errorRes, null);

  setGeminiClient(null);
  const origKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const noClientRes = await generateGroundedContent({ prompt: "No client" });
    assert.equal(noClientRes, null);
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
  }
});
