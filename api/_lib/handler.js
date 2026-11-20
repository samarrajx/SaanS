/**
 * @fileoverview Shared API Handler Factory.
 * Consolidates HTTP method enforcement, origin validation, rate limiting,
 * body/query extraction, and Zod schema validation.
 */

import { verifyOrigin, checkRateLimit, readJsonBody, sendError } from "./security.js";

/**
 * Extracts numeric error status from unknown catch error.
 * @param {unknown} err
 * @returns {number}
 */
export function getErrorStatus(err) {
  if (err && typeof err === "object" && "status" in err && typeof err.status === "number") {
    return err.status;
  }
  return 400;
}

/**
 * Validates request preconditions: method, origin, and rate limiting.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {string[]} methods
 * @param {number | undefined} rateLimit
 * @returns {boolean} True if all checks pass
 */
function validatePreconditions(req, res, methods, rateLimit) {
  if (!methods.includes(req.method || "")) {
    sendError(res, 405, "Method Not Allowed");
    return false;
  }
  if (!verifyOrigin(req)) {
    sendError(res, 403, "Forbidden Origin");
    return false;
  }
  if (!checkRateLimit(req, rateLimit)) {
    sendError(res, 429, "Too Many Requests");
    return false;
  }
  return true;
}

/**
 * Extracts payload data from GET URL query or POST body.
 * @param {import("http").IncomingMessage} req
 * @param {(req: import("http").IncomingMessage) => Record<string, unknown>} [getQuery]
 * @returns {Promise<{ ok: boolean, data?: unknown, status?: number, error?: string }>}
 */
async function extractPayload(req, getQuery) {
  if (req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      return { ok: true, data: body };
    } catch (err) {
      return { ok: false, status: getErrorStatus(err), error: "Invalid JSON body" };
    }
  }

  if (getQuery) {
    return { ok: true, data: getQuery(req) };
  }

  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const queryObj = Object.fromEntries(url.searchParams.entries());
  return { ok: true, data: queryObj };
}

/**
 * Creates a standard serverless API route handler.
 *
 * @template {Record<string, unknown>} T
 * @param {Object} config
 * @param {string[]} config.methods
 * @param {import("zod").ZodType<T>} [config.schema]
 * @param {string} [config.schemaErrorMessage]
 * @param {number} [config.rateLimit]
 * @param {(req: import("http").IncomingMessage) => Record<string, unknown>} [config.getQuery]
 * @param {(context: {
 *   req: import("http").IncomingMessage,
 *   res: import("http").ServerResponse,
 *   data: T
 * }) => Promise<void> | void} config.run
 * @returns {(req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>}
 */
export function createHandler(config) {
  const { methods, schema, schemaErrorMessage, rateLimit, getQuery, run } = config;

  return async function handler(req, res) {
    if (!validatePreconditions(req, res, methods, rateLimit)) return;

    const extracted = await extractPayload(req, getQuery);
    if (!extracted.ok) {
      sendError(res, extracted.status || 400, extracted.error || "Bad Request");
      return;
    }

    let validData = extracted.data;
    if (schema) {
      const parsed = schema.safeParse(extracted.data);
      if (!parsed.success) {
        sendError(res, 400, schemaErrorMessage || "Validation failed");
        return;
      }
      validData = parsed.data;
    }

    await run({ req, res, data: /** @type {T} */ (validData) });
  };
}
