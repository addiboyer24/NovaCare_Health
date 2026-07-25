# NovaCare Health — Mock Epic EHR API

A mock API simulating the Epic EHR system (patient identity verification,
appointments, rescheduling) for the NovaCare Health FDE exercise. Used by
your Action Builder flow (Part 2) and your ZAF sidebar app (Part 3).

## Endpoints

All endpoints except `/health` require an `Authorization: Bearer <API_KEY>`
header (default key: `novacare-demo-key-2026`, see `.env.example`).

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/verify-identity` | Body `{ patient_id, date_of_birth }` → `{ verified: true/false }` |
| GET | `/patients/:id/appointments` | Returns the patient's upcoming appointments |
| GET | `/appointments/available-slots` | Optional `?start_date=&end_date=` query params → available rescheduling slots |
| PUT | `/appointments/:id` | Body `{ date, time }` → reschedules and returns confirmation |
| GET | `/health` | Unauthenticated liveness check |

### Error responses

- **401** — missing/invalid `Authorization` header (any endpoint)
- **404** — unknown `patient_id` or `appointment_id`
- **400** — missing required fields, or malformed JSON body
- **429** — rate limit exceeded (mock enforces the 100 req/sec cap called out in the spec)
- **503** — simulated EHR downtime (see below)

### Simulating downtime for demo purposes

Two repeatable ways to trigger a `503`, for demoing your Action Flow /
ZAF error branches without needing an actual outage:

1. Header `X-Simulate-Error: 503` — works on any endpoint.
2. Magic ID `PAT-DOWN` (as `patient_id`) or `APT-DOWN` (as an appointment
   ID in the URL) — useful when your caller can't easily set custom headers.

## Seed data

3 patients (`PAT-001`, `PAT-002`, `PAT-003`), each with 2-3 upcoming
appointments, plus 8 available rescheduling slots spread across the next
two weeks. See `data/seed.js` for exact values (patient DOBs are in there
too — you'll need them to test `/verify-identity`).

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Server runs on `http://localhost:3000` by default.

## Test with curl

```bash
API=http://localhost:3000
KEY=novacare-demo-key-2026

# Health check (no auth)
curl $API/health

# 401 - no auth header
curl -i -X POST $API/verify-identity \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"PAT-001","date_of_birth":"1985-03-15"}'

# Verify identity - success
curl -X POST $API/verify-identity \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"PAT-001","date_of_birth":"1985-03-15"}'

# Verify identity - wrong DOB
curl -X POST $API/verify-identity \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"PAT-001","date_of_birth":"1999-01-01"}'

# 404 - unknown patient
curl -i -X POST $API/verify-identity \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"PAT-999","date_of_birth":"1985-03-15"}'

# Get appointments
curl -H "Authorization: Bearer $KEY" $API/patients/PAT-001/appointments

# Available slots (optionally filtered by date range)
curl -H "Authorization: Bearer $KEY" \
  "$API/appointments/available-slots?start_date=2026-08-01&end_date=2026-08-10"

# Reschedule
curl -X PUT $API/appointments/APT-101 \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-05","time":"9:00 AM"}'

# 503 - simulated downtime via header
curl -i -H "Authorization: Bearer $KEY" -H "X-Simulate-Error: 503" \
  $API/patients/PAT-001/appointments

# 503 - simulated downtime via magic patient id
curl -i -X POST $API/verify-identity \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"PAT-DOWN","date_of_birth":"1985-03-15"}'
```

## Deploying (Render — recommended)

A persistent deployment beats an ngrok tunnel: tunnels die, and you don't
want a connectivity scramble the morning of the interview.

1. Push this folder to a GitHub repo.
2. Go to [render.com](https://render.com) → **New** → **Web Service** →
   connect your repo.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Add environment variable `API_KEY` (and optionally `PORT`, though
   Render sets `PORT` automatically).
5. Deploy. Render gives you a stable URL like
   `https://novacare-mock-api.onrender.com`.
6. Note: Render's free tier spins down on inactivity and takes ~30-60s to
   wake on the next request. Hit `/health` a few minutes before your
   interview to warm it up.

### Alternative: Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from
   GitHub repo**.
2. Railway auto-detects Node and runs `npm install && npm start`.
3. Add the `API_KEY` environment variable in the service's **Variables** tab.
4. Generate a public domain under **Settings → Networking**.

### Alternative: Fly.io

```bash
fly launch --no-deploy   # answer prompts, skip Postgres/Redis
fly secrets set API_KEY=novacare-demo-key-2026
fly deploy
```

## Using this from Action Builder / ZAF

- Use the deployed base URL (e.g. `https://novacare-mock-api.onrender.com`)
  as the external API base in your Action Flow's HTTP request steps and
  in your ZAF app's `manifest.json` proxy config.
- Set the `Authorization: Bearer <API_KEY>` header in the proxy/flow
  config — never hardcode it in client-side ZAF app code.
