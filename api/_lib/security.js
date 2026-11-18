/**
 * @fileoverview API Security Utilities.
 * Implements strict Origin verification, payload size bounding,
 * in-memory rate limiting, and safe JSON response helpers.
 */

// Security constants
const MAX_BODY_BYTES = 32768; // 32 KB hard payload limit
const DEFAULT_RATE_LIMIT = 60; // Max requests per window
const RATE_WINDOW_MS = 60000; // 1 minute sliding window
const HTTP_BAD_REQUEST = 400; // Client syntax error
const _HTTP_FORBIDDEN = 403; // Origin rejected
const HTTP_PAYLOAD_TOO_LARGE = 413; // Body cap exceeded
const _HTTP_TOO_MANY_REQUESTS = 429; // Rate limit exceeded

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateLimitMap = new Map();

/**
 * Checks if the request Origin is strictly permitted.
 * Only allows exact match against the Host header, localhost, or 127.0.0.1.
 * Reject suffix matches like `localhost.evil.com`.
 *
 * @param {import("http").IncomingMessage} req
 * @returns {boolean}
 */
export function verifyOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Direct GET or same-origin without Origin header

  try {
    const originUrl = new URL(origin);
    const hostHeader = req.headers.host || "";
    const expectedHost = hostHeader.split(":")[0];

    const isLocalhost = originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";
    const isSelfHost = Boolean(expectedHost && originUrl.hostname === expectedHost);

    return isLocalhost || isSelfHost;
  } catch {
    return false;
  }
}

/**
 * Checks per-IP in-memory rate limit for the serverless instance.
 *
 * @param {import("http").IncomingMessage} req
 * @param {number} [limit=60]
 * @returns {boolean} True if within limit
 */
export function checkRateLimit(req, limit = DEFAULT_RATE_LIMIT) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Reads and parses JSON body up to 32 KB.
 *
 * @param {import("http").IncomingMessage} req
 * @returns {Promise<any>}
 */
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let byteLength = 0;

    req.on("data", (chunk) => {
      byteLength += chunk.length;
      if (byteLength > MAX_BODY_BYTES) {
        req.destroy();
        reject(Object.assign(new Error("Payload too large"), { status: HTTP_PAYLOAD_TOO_LARGE }));
        return;
      }
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Malformed JSON"), { status: HTTP_BAD_REQUEST }));
      }
    });

    req.on("error", (err) => reject(err));
  });
}

/**
 * Sends a structured JSON error response.
 *
 * @param {import("http").ServerResponse} res
 * @param {number} status
 * @param {string} message
 * @returns {void}
 */
export function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ error: message, status }));
}

/**
 * Sends a structured JSON success response.
 *
 * @param {import("http").ServerResponse} res
 * @param {number} status
 * @param {any} data
 * @param {Record<string, string>} [headers={}]
 * @returns {void}
 */
export function sendJson(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  for (const [k, v] of Object.entries(headers)) {
    res.setHeader(k, v);
  }
  res.end(JSON.stringify(data));
}
