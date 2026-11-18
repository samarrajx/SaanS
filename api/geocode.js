/**
 * @fileoverview GET /api/geocode
 * Proxies Open-Meteo Geocoding API with 24-hour LRU caching and length validation.
 */

import { z } from "zod";
import { verifyOrigin, checkRateLimit, sendJson, sendError } from "./_lib/security.js";
import { cache } from "./_lib/cache.js";

const GeocodeQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

/**
 * Normalizes Open-Meteo geocoding search results.
 * @param {{ results?: Array<Record<string, unknown>> } | null | undefined} raw
 * @returns {Array<{ name: string, admin: string, country: string, lat: number, lon: number, timezone: string }>}
 */
function normalizeGeocodeResults(raw) {
  if (!raw?.results || !Array.isArray(raw.results)) return [];

  return raw.results.slice(0, 5).map((/** @type {Record<string, unknown>} */ item) => ({
    name: typeof item.name === "string" ? item.name : "",
    admin:
      typeof item.admin1 === "string"
        ? item.admin1
        : typeof item.admin2 === "string"
          ? item.admin2
          : "",
    country: typeof item.country === "string" ? item.country : "",
    lat: Math.round((typeof item.latitude === "number" ? item.latitude : 0) * 100) / 100,
    lon: Math.round((typeof item.longitude === "number" ? item.longitude : 0) * 100) / 100,
    timezone: typeof item.timezone === "string" ? item.timezone : "Asia/Kolkata",
  }));
}

/**
 * Fetches location search from Open-Meteo Geocoding API.
 * @param {string} query
 * @returns {Promise<{ results?: Array<Record<string, unknown>> }>}
 */
async function fetchOpenMeteoGeocode(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Upstream geocoding returned ${response.status}`);
  }
  return response.json();
}

/**
 * Serverless handler for GET /api/geocode.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return sendError(res, 405, "Method Not Allowed");
  if (!verifyOrigin(req)) return sendError(res, 403, "Forbidden Origin");
  if (!checkRateLimit(req)) return sendError(res, 429, "Too Many Requests");

  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const parseResult = GeocodeQuerySchema.safeParse({ q: url.searchParams.get("q") });

  if (!parseResult.success) {
    return sendError(res, 400, "Query parameter 'q' must be between 2 and 80 characters");
  }

  const queryKey = parseResult.data.q.toLowerCase();
  const cached = cache.getGeocode(queryKey);
  if (cached) {
    return sendJson(res, 200, cached, {
      "X-Cache": "HIT",
      "Cache-Control": "public, max-age=86400",
    });
  }

  try {
    const rawData = await fetchOpenMeteoGeocode(queryKey);
    const normalized = normalizeGeocodeResults(rawData);
    cache.setGeocode(queryKey, normalized);
    return sendJson(res, 200, normalized, {
      "X-Cache": "MISS",
      "Cache-Control": "public, max-age=86400",
    });
  } catch (_err) {
    return sendError(res, 502, "Failed to retrieve location search results");
  }
}
