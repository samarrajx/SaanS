/**
 * @fileoverview GET /api/air
 * Proxies Open-Meteo CAMS air quality forecasts with coordinate rounding,
 * in-memory cell caching, and required CC BY 4.0 / CAMS attribution.
 */

import { z } from "zod";
import { sendJson, sendError } from "./_lib/security.js";
import { createHandler } from "./_lib/handler.js";
import { cache } from "./_lib/cache.js";

// Validation schema for query parameters
const AirQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const ATTRIBUTION_TEXT = "CAMS ENSEMBLE data provider and Open-Meteo (CC BY 4.0)";
const RESOLUTION_NOTE = "Area model estimate (~25-45 km), not a street-level monitor reading";

/**
 * Normalizes Open-Meteo upstream JSON to Saans HourlySeries structure.
 * @param {{ hourly?: { time?: string[], pm2_5?: unknown[], pm10?: unknown[] } } | null | undefined} raw
 * @returns {import("../web/js/types.js").HourlySeries}
 */
function normalizeUpstreamAir(raw) {
  const times = raw?.hourly?.time || [];
  const pm25 = raw?.hourly?.pm2_5 || [];
  const pm10 = raw?.hourly?.pm10 || [];

  return {
    times,
    pm25: pm25.map((/** @type {unknown} */ v) =>
      typeof v === "number" ? Math.round(v * 10) / 10 : 0
    ),
    pm10: pm10.map((/** @type {unknown} */ v) =>
      typeof v === "number" ? Math.round(v * 10) / 10 : 0
    ),
    meta: {
      model: "CAMS ENSEMBLE",
      resolutionNote: RESOLUTION_NOTE,
      fetchedAt: new Date().toISOString(),
      attribution: ATTRIBUTION_TEXT,
    },
  };
}

/**
 * Fetches air quality data from Open-Meteo with timeout.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ hourly?: { time?: string[], pm2_5?: unknown[], pm10?: unknown[] } }>}
 */
async function fetchOpenMeteoAir(lat, lon) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set("hourly", "pm2_5,pm10");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Upstream air API returned ${response.status}`);
  }
  return response.json();
}

/**
 * Serverless handler for GET /api/air.
 */
export default createHandler({
  methods: ["GET"],
  schema: AirQuerySchema,
  schemaErrorMessage: "Invalid coordinates. Latitude must be [-90, 90], longitude [-180, 180]",
  run: async ({ res, data }) => {
    const latRounded = Math.round(data.lat * 100) / 100;
    const lonRounded = Math.round(data.lon * 100) / 100;
    const cacheKey = `${latRounded},${lonRounded}`;

    const cached = cache.getAir(cacheKey);
    if (cached) {
      return sendJson(res, 200, cached, {
        "X-Cache": "HIT",
        "Cache-Control": "public, max-age=1800",
      });
    }

    try {
      const rawData = await fetchOpenMeteoAir(latRounded, lonRounded);
      const normalized = normalizeUpstreamAir(rawData);
      cache.setAir(cacheKey, normalized);
      return sendJson(res, 200, normalized, {
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=1800",
      });
    } catch (_err) {
      return sendError(res, 502, "Failed to retrieve upstream air quality data");
    }
  },
});
