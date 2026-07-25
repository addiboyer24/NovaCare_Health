# NovaCare Health — AI Agent (Part 1) & Action Flow (Part 2) Blueprint v2

Updated to reflect what we've confirmed directly in your sandbox: this is
**not** one agent with a channel toggle — it's two separate AI agent
objects, "NovaCare Health AI Agent" appears to be shared naming, but
Messaging and Email are configured independently. Your Email agent's
"test" use case screenshot confirmed it supports **Procedure** as a reply
method (the newer agentic-email capability), so both agents below get the
same 4 use cases with full procedure support — no scoping down needed.

---

## Overview: Two Agent Objects

| | Messaging (Chat) Agent | Email Agent |
|---|---|---|
| AI type | Agentic AI (default, can't be changed) | Agentic AI — confirmed available on your instance via the Procedure tab |
| Interaction style | Real-time, multi-turn, live testing widget | Async, single-or-multi-intent threads, generative replies with links |
| Reply methods available | Dialogue, Procedure, Generative reply | Dialogue, Procedure, Generative reply |
| Build/test workflow | Manual dialogue/procedure builder + live chat preview | "Create procedure" — describe steps in plain language, like briefing a human agent, and it generates the procedure skeleton |

Build Messaging first (per our earlier discussion — full agentic toolset
guaranteed, fastest to iterate via live chat testing), prove the
procedure logic and Action Flow wiring end-to-end, then replicate the
same use case content into the Email agent.

---

## Messaging (Chat) AI Agent

### Use case 1: Appointment Rescheduling

- **Name:** `Appointment Rescheduling`
- **Description:** "Patient wants to change, move, reschedule, or cancel
  an upcoming appointment. Includes requests to see available times or
  switch to a different provider or date."
- **Category:** Scheduling
- **Reply method:** Procedure (multi-turn: collect ID → DOB → verify →
  look up appointment → present slots → confirm → update)
- **Escalation:** Identity verification fails twice; patient requests a
  specific unavailable provider; patient asks a clinical question
  mid-flow
- **Channel notes:** Build this as a true multi-turn conversation —
  collect one piece of info per turn (ID, then DOB, then slot choice)
  rather than asking for everything in one message. Use the live chat
  preview to test each branch as you build it.

### Use case 2: Billing Inquiries

- **Name:** `Billing Inquiries`
- **Description:** "Patient has a question about a charge, invoice, bill
  amount, payment method, autopay, refund, or receipt. Does not include
  disputes that require account-specific investigation."
- **Category:** Billing
- **Reply method:** Generative reply, sourced from your Billing FAQ
  Help Center articles
- **Escalation:** Low retrieval confidence, or the patient names a
  specific charge/dispute on their own account (that's investigative,
  not FAQ-answerable)
- **Channel notes:** Real-time generative reply; offer a natural
  follow-up question rather than a dead-end answer.

### Use case 3: Clinical Device Troubleshooting

- **Name:** `Clinical Device Troubleshooting`
- **Description:** "Patient has an issue with a medical device — glucose
  monitor, blood pressure cuff, or similar — including pairing, syncing,
  error codes, battery, or 'my device isn't working' type requests."
- **Category:** Clinical Support
- **Reply method:** Dialogue — configured to do nothing but escalate
  immediately. Do **not** wire this to generative reply even though
  clinical device KB articles exist; the AI should detect and route, not
  attempt to resolve.
- **Escalation:** Always, no confidence threshold — hard rule
- **Channel notes:** Send a brief acknowledgment ("connecting you with a
  clinical specialist") before handoff so the patient isn't left with a
  silent gap while the routing happens.

### Use case 4: Insurance Verification

- **Name:** `Insurance Verification`
- **Description:** "Patient wants to verify their coverage, confirm
  insurance is on file, update insurance information, or ask about
  pre-authorization for an upcoming visit."
- **Category:** Insurance
- **Reply method:** Procedure — calls an external action to check
  coverage status (see Part 2 note on a 5th mock endpoint, since the
  exercise's 4 required endpoints don't include coverage lookup)
- **Escalation:** Coverage check returns "not found" or "inactive" — hand
  off rather than telling the patient directly they have no coverage;
  that's a sensitive message a human should confirm first
- **Channel notes:** Real-time, immediate result once the check runs.

---

## Email AI Agent

Same 4 use cases, same names/descriptions/categories as above — reuse the
text verbatim so intent detection stays consistent across channels. What
changes is reply method framing and how you write the **procedure
description** (since your instance uses the "Create procedure" natural
language box, confirmed in your screenshot).

### Use case 1: Appointment Rescheduling

- **Reply method:** Procedure
- **Procedure description (paste into "Create procedure"):**

```
Before doing anything else, verify the patient's identity by collecting
their patient ID and date of birth and checking them against the EHR
system. If verification fails, do not proceed — apologize and hand off
to a human agent with a note that identity could not be verified.

Once verified, look up the patient's existing appointments in the EHR
system. If they have no upcoming appointment, let them know and hand off
to a human agent.

If they do have an appointment, retrieve available rescheduling slots
for the next two weeks and present them to the patient so they can pick
one.

If no slots are available in that window, apologize and hand off to a
human agent so they can offer more options.

Once the patient picks a new slot, confirm with them, then update the
appointment in the EHR system with the new date and time. If that update
fails, tell the patient a team member will finish the change for them,
and hand off with full context — the found appointment and the slot they
chose — so the agent doesn't have to ask them to repeat anything.

Once the reschedule is confirmed, add an internal note to the ticket
documenting the old and new appointment time, and tag the ticket as
completed.

Never attempt to reschedule an appointment without first verifying
identity, and never guess at appointment or slot data — always check the
EHR system directly.
```

- **Channel notes:** Since email is async, expect the generated
  procedure to ask for ID and DOB together in one message rather than
  turn-by-turn like chat — that's appropriate here; don't force a
  chat-style single-field-per-turn pattern onto email.

### Use case 2: Billing Inquiries

- **Reply method:** Generative reply — identical setup to Messaging,
  same Help Center source.
- **Channel notes:** Include article links inline in the reply. Watch
  for multi-intent threads (e.g., a billing question plus a scheduling
  question in the same email) — if your instance's use-case matching
  only fires one use case per conversation by default, check whether
  that's been adjusted; Zendesk has recently made the "one use case per
  conversation" limit configurable for email specifically, precisely
  because it was too restrictive for exactly this kind of multi-intent
  case.

### Use case 3: Clinical Device Troubleshooting

- **Reply method:** Dialogue, hard-escalation only — same as Messaging.
- **Channel notes:** Acknowledgment reply should set expectations for
  response time ("a clinical specialist will follow up") since email
  handoff isn't instant the way chat handoff is.

### Use case 4: Insurance Verification

- **Reply method:** Procedure
- **Procedure description (paste into "Create procedure"):**

```
When a patient asks about their insurance coverage, pre-authorization,
or wants to update their insurance information, check their coverage
status against the insurance verification system using their patient ID.

If coverage is confirmed active, let the patient know their coverage is
verified. If coverage is not found or shows inactive, do not tell the
patient directly that they have no coverage — instead, let them know a
team member will confirm their coverage details and follow up, then hand
off to a human agent with the check result attached.

If updating insurance information is requested, collect the new details
and hand off to a human agent to apply the update, since insurance data
changes should have a person confirm them.
```

- **Channel notes:** Set the expectation of a 24-hour follow-up in the
  reply, per the scenario's stated email SLA.

---

## Part 2 — Action Flow: Appointment Rescheduling

This section is largely channel-agnostic — one Action Flow (or one set of
Custom Actions reused by both agents' procedures) serves both Messaging
and Email, since both call the same mock API.

### Prerequisite: Custom Actions

Before building the flow, define 4 Custom Actions in Admin Center → Apps
and integrations → Actions → Custom actions (see prior message for exact
input/output mapping per endpoint). These are the reusable building
blocks both the Action Flow *and* each agent's procedure steps can call.

### Trigger

Ticket-based trigger, firing when both are true:
- Tag `intent:appointment_reschedule` is present
- Custom field `Patient ID` is populated

(Or invoked natively from the agent's procedure if your instance's
action-builder/AI-agent integration supports that path directly — worth
checking since it skips the ticket-tag round-trip.)

### Step-by-step flow

**Step 1 — Identity Verification**
- `POST {api_base_url}/verify-identity` with `patient_id`, `date_of_birth`
- Branch: verified → Step 2; not verified / 404 → Error path A; 401/503/timeout → Error path B

**Step 2 — Appointment Lookup**
- `GET {api_base_url}/patients/{patient_id}/appointments`
- Branch: appointments found → Step 3; empty → Error path C; 503/timeout → Error path B

**Step 3 — Present Available Slots**
- `GET {api_base_url}/appointments/available-slots?start_date=...&end_date=...`
- Branch: slots found → wait for selection → Step 4; empty → Error path D

**Step 4 — Confirm and Update**
- Branch: patient confirms → `PUT {api_base_url}/appointments/{appointment_id}`; patient cancels → Error path E
- Branch: update succeeds → Step 5; update fails (503/timeout) → Error path F

**Step 5 — Ticket Update**
- Internal note documenting old/new date+time, verification timestamp
- Update tags: remove `intent:appointment_reschedule`, add `reschedule:completed`

### Error paths

| Path | Trigger | Patient-facing message | Ticket/agent action |
|---|---|---|---|
| A — Identity failed | verify-identity false or 404 | "We couldn't verify your identity with the information provided. A team member will follow up shortly." | Tag `escalation:identity_failed`, route Tier 2, note what was attempted |
| B — EHR unavailable | Any step 503/timeout | "Our scheduling system is temporarily unavailable. We'll have someone reach out to help you reschedule." | Tag `escalation:system_unavailable`, route Tier 2, note failed step + timestamp |
| C — No appointment found | appointments empty | "I don't see an upcoming appointment on file to reschedule. Let me connect you with someone who can help." | Route Tier 2 |
| D — Fully booked | slots empty | "There are no open slots in the next two weeks. A scheduling specialist will follow up with more options." | Route Tier 2 |
| E — Patient cancels | mid-flow cancellation | "No problem — reach out anytime if you'd like to reschedule." | No escalation, tag `reschedule:abandoned` |
| F — Partial failure | lookup succeeded, update failed | "We found your appointment but hit an issue confirming the new time. A team member will finish this for you." | Route Tier 2, note both the found appointment AND attempted new slot |

### Variable passing

Carry `patient_id`, `dob` (consider discarding after Step 1 for data
minimization), original `appointment_id`, and `selected_slot` through
each step. On any escalation, dump current variable state into the
internal note so a human doesn't have to ask the patient to repeat
anything.

---

## Escalation & handoff rules (shared, both agents)

- **Group routing:** Clinical Device Troubleshooting → Clinical
  Specialists group. Everything else that escalates → Tier 2 Support.
- **Context transfer on every handoff:** conversation summary (last 3-5
  turns), identified intent, patient ID (if collected), and any
  structured data already gathered (e.g., proposed new appointment slot).

---

## Interview talking points

- **Why hard-escalate clinical device questions instead of letting KB
  articles answer them:** patient safety — a wrong troubleshooting step
  on a glucose monitor has real consequences; a billing FAQ mismatch
  doesn't carry the same risk.
- **Why verify identity before *any* EHR call, not just before writes:**
  HIPAA/PHI handling — even a read exposes PHI, so the gate belongs
  before Step 1, not just before the reschedule write in Step 4.
- **Why the identity-failure message doesn't say *what* failed:** avoids
  giving an attacker a signal about which piece (ID vs. DOB) was wrong.
- **Why two separate agent objects instead of one:** Zendesk's platform
  splits Messaging and Email as distinct AI agent configurations even
  though the underlying use case content is shared — worth noting as a
  platform constraint you designed around, not something you chose
  unnecessarily.
