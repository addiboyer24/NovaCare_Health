const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const CLIENT_ID = "novacare-demo-client-id";
const CLIENT_SECRET = "novacare-demo-client-secret";
const ACCESS_TOKEN = "novacare-demo-key-2026";

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory store of issued authorization codes: code -> { clientId, redirectUri, scope, expiresAt }
const authCodes = new Map();

function renderConsentPage({ clientId, redirectUri, state, scope }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>NovaCare Mock OAuth - Authorize</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f4f6f8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #fff; padding: 32px 36px; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); max-width: 380px; width: 100%; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #555; font-size: 14px; line-height: 1.5; }
    .scope { background: #f0f2f4; border-radius: 6px; padding: 10px 12px; font-size: 13px; margin: 16px 0; }
    button { width: 100%; padding: 10px 0; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; margin-top: 8px; }
    .allow { background: #1f73b7; color: #fff; }
    .deny { background: #eee; color: #333; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize application</h1>
    <p><strong>${clientId}</strong> is requesting access to your NovaCare mock account.</p>
    <div class="scope">Requested scope: ${scope || "(none specified)"}</div>
    <form method="POST" action="/authorize/decision">
      <input type="hidden" name="client_id" value="${clientId}" />
      <input type="hidden" name="redirect_uri" value="${redirectUri}" />
      <input type="hidden" name="state" value="${state || ""}" />
      <input type="hidden" name="scope" value="${scope || ""}" />
      <button class="allow" type="submit" name="decision" value="allow">Allow</button>
      <button class="deny" type="submit" name="decision" value="deny">Deny</button>
    </form>
  </div>
</body>
</html>`;
}

// GET /authorize?response_type=code&client_id=...&redirect_uri=...&scope=...&state=...
// Shows a consent screen. On approval, /authorize/decision redirects back to
// redirect_uri with ?code=...&state=...
router.get("/authorize", (req, res) => {
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    state = "",
    scope = "",
    response_type: responseType = "code",
  } = req.query;

  if (responseType !== "code") {
    return res.status(400).json({
      error: "unsupported_response_type",
      message: "Only response_type=code is supported.",
    });
  }

  if (!redirectUri) {
    return res.status(400).json({
      error: "invalid_request",
      message: "redirect_uri is required.",
    });
  }

  if (clientId !== CLIENT_ID) {
    return res.status(401).json({
      error: "unauthorized_client",
      message: `Unknown client_id '${clientId}'.`,
    });
  }

  return res.status(200).send(renderConsentPage({ clientId, redirectUri, state, scope }));
});

// POST /authorize/decision
// Body: { client_id, redirect_uri, state, scope, decision } — submitted by the
// consent form. Issues a single-use authorization code and redirects back to
// the caller's redirect_uri.
router.post("/authorize/decision", (req, res) => {
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    state = "",
    scope = "",
    decision,
  } = req.body || {};

  if (!redirectUri) {
    return res.status(400).json({
      error: "invalid_request",
      message: "redirect_uri is required.",
    });
  }

  const redirect = new URL(redirectUri);

  if (decision !== "allow") {
    redirect.searchParams.set("error", "access_denied");
    if (state) redirect.searchParams.set("state", state);
    return res.redirect(302, redirect.toString());
  }

  const code = crypto.randomBytes(16).toString("hex");
  authCodes.set(code, {
    clientId,
    redirectUri,
    scope,
    expiresAt: Date.now() + CODE_TTL_MS,
  });

  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);

  return res.redirect(302, redirect.toString());
});

// POST /token
// Body: { grant_type, code, redirect_uri, client_id, client_secret } for the
// authorization_code grant, or { grant_type: "refresh_token", refresh_token,
// client_id, client_secret } for a refresh. client_id/client_secret may also
// be supplied via HTTP Basic Auth instead of the body.
// Always issues the static demo token: novacare-demo-key-2026
router.post("/token", (req, res) => {
  let {
    grant_type: grantType,
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  } = req.body || {};

  const authHeader = req.headers["authorization"];
  if ((!clientId || !clientSecret) && authHeader && authHeader.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx !== -1) {
      clientId = decoded.slice(0, idx);
      clientSecret = decoded.slice(idx + 1);
    }
  }

  if (clientId !== CLIENT_ID || clientSecret !== CLIENT_SECRET) {
    return res.status(401).json({
      error: "invalid_client",
      message: "client_id/client_secret mismatch.",
    });
  }

  if (grantType === "authorization_code") {
    const entry = authCodes.get(code);

    if (!entry) {
      return res.status(400).json({
        error: "invalid_grant",
        message: "Unknown or already-used code.",
      });
    }
    if (Date.now() > entry.expiresAt) {
      authCodes.delete(code);
      return res.status(400).json({
        error: "invalid_grant",
        message: "Code expired.",
      });
    }
    if (redirectUri && entry.redirectUri !== redirectUri) {
      return res.status(400).json({
        error: "invalid_grant",
        message: "redirect_uri mismatch.",
      });
    }

    authCodes.delete(code); // codes are single-use
  } else if (grantType === "refresh_token") {
    if (!refreshToken) {
      return res.status(400).json({
        error: "invalid_request",
        message: "refresh_token is required.",
      });
    }
    // accept any non-empty refresh token for this mock
  } else {
    return res.status(400).json({
      error: "unsupported_grant_type",
      message: `grant_type '${grantType}' is not supported.`,
    });
  }

  return res.status(200).json({
    access_token: ACCESS_TOKEN,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "novacare-demo-refresh-token",
    scope: "demo",
  });
});

module.exports = router;