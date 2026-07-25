// middleware/rateLimiter.js
//
// The exercise doc calls out that the real Epic EHR API is rate-limited to
// 100 requests/second. This is a minimal in-memory approximation (per
// server instance, not per-client) so the mock behaves realistically and
// gives you a 429 branch to talk through if asked "how would you handle
// rate limiting in production?" — a real implementation would use a
// distributed token bucket (e.g. Redis) keyed per OAuth client.

const WINDOW_MS = 1000;
const MAX_REQUESTS_PER_WINDOW = 100;

let windowStart = Date.now();
let requestCount = 0;

function rateLimiter(req, res, next) {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    requestCount = 0;
  }

  requestCount += 1;

  if (requestCount > MAX_REQUESTS_PER_WINDOW) {
    res.set("Retry-After", "1");
    return res.status(429).json({
      error: "rate_limited",
      message: "Rate limit of 100 requests/second exceeded. Retry shortly.",
    });
  }

  next();
}

module.exports = { rateLimiter };
