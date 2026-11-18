// HTTP Status constants
const HTTP_OK = 200; // Success
const HTTP_METHOD_NOT_ALLOWED = 405; // Unsupported HTTP verb

/**
 * Health check endpoint for uptime and platform verification.
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = HTTP_METHOD_NOT_ALLOWED;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  res.statusCode = HTTP_OK;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      status: "ok",
      app: "Saans",
      timestamp: new Date().toISOString(),
    })
  );
}
