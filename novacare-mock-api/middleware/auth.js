// middleware/auth.js
//
// Simulates OAuth 2.0 / SMART on FHIR bearer-token auth, simplified to a
// static shared-secret token for the purposes of this exercise. In
// production this mock API is standing in for Epic EHR, whose actual API
// requires a full OAuth2 client-credentials or SMART-on-FHIR flow.
//
// Any request missing the header, or presenting the wrong token, gets a
// 401. This is what your Action Flow / ZAF app's "API call failure due to
// bad auth" branch should exercise.
//
// The OAuth endpoints themselves (/authorize, /authorize/decision, /token)
// are exempt — they're how a client obtains a token in the first place,
// so they can't require one to be presented. The root path (/) is also
// exempt — it just serves a branded landing banner, not EHR data.

const API_KEY = process.env.API_KEY || "novacare-demo-key-2026";

const UNAUTHENTICATED_PATHS = [/^\/authorize(\/.*)?$/, /^\/token$/, /^\/$/];

function isExemptPath(path) {
  return UNAUTHENTICATED_PATHS.some((pattern) => pattern.test(path));
}

function requireAuth(req, res, next) {
  if (isExemptPath(req.path)) {
    return next();
  }

  const header = req.headers["authorization"] || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "unauthorized",
      message:
        "Missing or malformed Authorization header. Expected: 'Authorization: Bearer <token>'.",
    });
  }

  if (token !== API_KEY) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid API token.",
    });
  }

  next();
}

module.exports = { requireAuth, API_KEY };