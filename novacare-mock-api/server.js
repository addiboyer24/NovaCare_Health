// server.js
//
// Mock "Epic EHR" API for the NovaCare Health exercise.
// Serves the 4 required endpoints for Action Builder (Part 2) and the
// ZAF sidebar app (Part 3).

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { requireAuth, API_KEY } = require("./middleware/auth");
const { simulateDowntime } = require("./middleware/simulateDowntime");
const { rateLimiter } = require("./middleware/rateLimiter");
const verifyIdentityRoutes = require("./routes/verifyIdentity");
const appointmentsRoutes = require("./routes/appointments");
const verifyInsuranceRoutes = require("./routes/verifyinsurance")
const oauth = require("./routes/oauth")

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // ZAF app proxy + Action Builder both call cross-origin
app.use(express.json());
app.use(morgan("dev"));

const NOVACARE_BANNER = `
 _   _                  ____                 _   _            _ _   _     
| \\ | | _____   ____ _ / ___|__ _ _ __ ___  | | | | ___  __ _| | |_| |__  
|  \\| |/ _ \\ \\ / / _\` | |   / _\` | '__/ _ \\ | |_| |/ _ \\/ _\` | | __| '_ \\ 
| |\\  | (_) \\ V / (_| | |__| (_| | | |  __/ |  _  |  __/ (_| | | |_| | | |
|_| \\_|\\___/ \\_/ \\__,_|\\____\\__,_|_|  \\___| |_| |_|\\___|\\__,_|_|\\__|_| |_|
                                                                          
`;

const SECURITY_BANNER = `
                 _______
                /       \\
               /  .---.  \\
               |  |   |  |
               |  '---'  |
              _|_________|_
             |             |
             |   .-----.   |
             |   |     |   |
             |   '-----'   |
             |_____________|

     +--------------------------------+
     |  SECURED WITH BOYER OAUTH 2.0   |
     +--------------------------------+
`;

// Root route — a branded landing banner, not part of the EHR API surface.
// Deliberately registered before auth/rate limiting/downtime simulation
// (and also explicitly exempted in middleware/auth.js) so hitting the
// bare URL in a browser or curl never returns a 401.
app.get("/", (req, res) => {
  res.type("text/plain").status(200).send(NOVACARE_BANNER + SECURITY_BANNER);
});

// Health check — not part of the spec, but useful for Render/Railway/Fly
// health checks and for a quick "is it alive" curl the morning of the
// interview. Deliberately not behind auth or rate limiting.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "novacare-mock-ehr-api" });
});

// Everything below simulates the real Epic EHR API surface, so it all
// goes through auth, rate limiting, and the downtime simulator.
app.use(rateLimiter);
app.use(requireAuth);
app.use(simulateDowntime);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(verifyIdentityRoutes);
app.use(appointmentsRoutes);
app.use(verifyInsuranceRoutes);
app.use(oauth);

// 404 fallback for anything not matched above.
app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    message: `No route for ${req.method} ${req.originalUrl}.`,
  });
});

// Generic error handler (e.g. malformed JSON body).
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "bad_request",
      message: "Malformed JSON body.",
    });
  }
  console.error(err);
  res.status(500).json({ error: "internal_error", message: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`NovaCare mock EHR API listening on port ${PORT}`);
  console.log(`API key (send as 'Authorization: Bearer <key>'): ${API_KEY}`);
});