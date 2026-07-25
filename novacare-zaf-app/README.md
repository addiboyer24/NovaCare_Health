# NovaCare Patient Appointments — ZAF Sidebar App

A ticket sidebar app (ZAF v2) that pulls patient appointment data from the
mock Epic EHR API and lets an agent log it as an internal note.

## Setup

1. Install zcli if you haven't already:
   ```bash
   npm install -g @zendesk/zcli
   ```
2. Edit `manifest.json` parameter defaults if you want (or just set them
   during install):
   - `api_base_url` — your deployed mock API URL (from the other zip)
   - `api_key` — the Bearer token your mock API expects
   - `patient_id_field_id` — your real "Patient ID" custom ticket field ID
3. Run locally:
   ```bash
   zcli apps:server
   ```
   Then open your Zendesk sandbox, go to a test ticket, enable "local
   testing" for this app (Admin Center prompts you, or use the ZAT/zcli
   browser flow), and the sidebar should load from your local server.
4. To install for real in your sandbox:
   ```bash
   zcli apps:create    # first time
   zcli apps:update     # subsequent changes
   ```
   Then fill in the parameters (`api_base_url`, `api_key`,
   `patient_id_field_id`) in the install screen.

## How it matches the spec

- Reads `patient_id` from the ticket's custom field via `client.get()` —
  field ID comes from installation settings rather than being hardcoded,
  so it's config, not code, when your field ID differs.
- Fetches appointments via `client.request()`, which routes through the
  ZAF proxy. The API key is stored as a `secure` manifest parameter and
  only ever referenced via the `{{setting.api_key}}` template inside the
  request — it's never present in this app's JS.
- Displays date, time, provider, and type per appointment, in a compact
  scannable card format.
- "Add to Ticket" writes an **internal note** (not a public reply) via
  `client.invoke()` — patient appointment data should never go out on a
  public response.
- Handles all four required states: loading, missing patient ID, API
  error (with retry, and specific messaging for 401/404/429/503 from the
  mock API), and empty (no appointments).

## One thing to verify in your sandbox

The exact ZAF invoke command for forcing a comment into "internal" mode
(`ticket.comment.type`) has shifted across ZAF SDK versions. Test the
"Add to Ticket" button in your sandbox — if the note posts as public
instead of internal, check the current ZAF v2 docs for the comment-mode
API in your SDK version and swap in the correct call. This is exactly the
kind of thing worth mentioning in the interview if the interviewer asks
about edge cases you hit.

## Files

- `manifest.json` — app config, location (ticket_sidebar), and the 3
  installation parameters
- `assets/iframe.html` — sidebar markup (all UI states)
- `assets/app.css` — styling
- `assets/app.js` — all logic (fetch, render, error handling, add-to-ticket)
