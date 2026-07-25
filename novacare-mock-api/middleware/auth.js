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

const API_KEY = process.env.API_KEY || "novacare-demo-key-2026";

function requireAuth(req, res, next) {
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
