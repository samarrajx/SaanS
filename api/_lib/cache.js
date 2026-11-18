/**
 * @fileoverview In-memory TTL cache with LRU eviction for serverless instances.
 */

// Cache configuration constants
const AIR_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 200; // Max items per instance

/**
 * @typedef {Object} CacheItem
 * @property {any} value
 * @property {number} expiresAt
 */

/** @type {Map<string, CacheItem>} */
const airCache = new Map();

/** @type {Map<string, CacheItem>} */
const geocodeCache = new Map();

/**
 * Stores an item in cache, evicting oldest if capacity reached.
 * @param {Map<string, CacheItem>} map
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
function setWithEviction(map, key, value, ttlMs) {
  if (map.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Retrieves a non-expired cache value.
 * @param {Map<string, CacheItem>} map
 * @param {string} key
 * @returns {any | null}
 */
function getValid(map, key) {
  const item = map.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    map.delete(key);
    return null;
  }
  return item.value;
}

export const cache = {
  /**
   * @param {string} key
   * @returns {any | null}
   */
  getAir(key) {
    return getValid(airCache, key);
  },
  /**
   * @param {string} key
   * @param {any} value
   */
  setAir(key, value) {
    setWithEviction(airCache, key, value, AIR_CACHE_TTL_MS);
  },
  /**
   * @param {string} key
   * @returns {any | null}
   */
  getGeocode(key) {
    return getValid(geocodeCache, key);
  },
  /**
   * @param {string} key
   * @param {any} value
   */
  setGeocode(key, value) {
    setWithEviction(geocodeCache, key, value, GEOCODE_CACHE_TTL_MS);
  },
  clear() {
    airCache.clear();
    geocodeCache.clear();
  },
};
