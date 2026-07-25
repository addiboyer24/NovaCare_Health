# NovaCare Health — AI Agent & Action Flow Configuration Blueprint

This is copy-paste-ready content for Part 1 (AI Agents Advanced) and a
step-by-step blueprint for Part 2 (Action Builder). Both live in Zendesk's
admin UI, so there's nothing to "run" here — this is what to type into
each screen, and why.

---

## Part 1 — AI Agent Use Cases

### Use case 1: Appointment Rescheduling

- **Category:** Scheduling
- **Description (for intent matching):** "Patient wants to change, move,
  reschedule, or cancel an upcoming appointment. Includes requests to see
  available times or switch to a different provider or date."
- **Resolution method:** Procedure with linked actions (calls your Action
  Flow from Part 2)
- **Pre-conditions:** Requires identity verification (patient ID + DOB)
  before any appointment data is looked up or changed — this must happen
  *before* the procedure calls the EHR, not after.
- **Hard escalation triggers:**
  - Identity verification fails twice
  - Patient wants to reschedule to a slot that doesn't exist / fully booked and requests a specific unavailable provider
  - Patient asks a clinical question mid-flow (e.g. "should I even keep this appointment given my symptoms")
- **Channel behavior:**
  - Chat: multi-turn conversation flow — collect patient ID → DOB → confirm identity → show slots → confirm
  - Email: since email is async, the AI agent replies asking for patient ID + DOB in one message, then proceeds once the patient responds; don't try to cram the whole flow into a single email round-trip

### Use case 2: Billing Inquiries

- **Category:** Billing
- **Description:** "Patient has a question about a charge, invoice, bill
  amount, payment method, autopay, refund, or receipt. Does not include
  disputes that require account-specific investigation."
- **Resolution method:** Generative reply from Help Center content (your
  3-4 Billing FAQ articles)
- **Escalation:** Confidence-based — if the AI agent's retrieval
  confidence is low (question doesn't clearly map to an article), or the
  patient explicitly disputes a specific charge on their account, escalate
  to a human billing specialist. Generic "how does autopay work" stays
  with the AI; "I was charged $340 twice on March 3rd, fix it" escalates
  (account-specific, not FAQ-answerable).
- **Channel behavior:**
  - Chat: real-time generative reply, offer follow-up questions
  - Email: generative reply with article links inline; watch for
    multi-intent threads (e.g. a billing question + a scheduling question
    in the same email) and split into two identified intents

### Use case 3: Clinical Device Troubleshooting

- **Category:** Clinical Support
- **Description:** "Patient has an issue with a medical device — glucose
  monitor, blood pressure cuff, or similar — including pairing, syncing,
  error codes, battery, or 'my device isn't working' type requests."
- **Resolution method:** **None — hard escalation only.** The AI agent
  should not attempt generative replies or conversation flows here, even
  if KB articles exist on the topic. Configure this use case with a hard
  escalation rule with no autonomous resolution path.
- **Why:** This is the patient-safety constraint from the scenario — the
  AI must never give clinical guidance or device troubleshooting
  autonomously. Frame it as "detect and route," not "answer."
- **Escalation:** Always routes to the Clinical Support specialist group,
  regardless of confidence. Context transferred: device type mentioned
  (if any), full conversation transcript, and "clinical_device" intent tag.
- **Channel behavior:** Identical on chat and email — immediate handoff,
  no attempt to resolve either way. On chat, the AI agent should send a
  brief acknowledgment ("connecting you with a clinical specialist") before
  handoff so the patient isn't left waiting with no response.

### Use case 4: Insurance Verification

- **Category:** Insurance
- **Description:** "Patient wants to verify their coverage, confirm
  insurance is on file, update insurance information, or ask about
  pre-authorization for an upcoming visit."
- **Resolution method:** Procedure with linked action — calls an external
  API to check coverage status (in your real build, this would be a
  second mock endpoint; the exercise's 4 required endpoints don't include
  one, so you can either stub a 5th endpoint on your mock API, or scope
  this use case's procedure to just collect the necessary info and hand
  off, noting in the interview that the real integration point would be
  an Epic FHIR `Coverage` resource lookup).
- **Escalation:** If verification returns "not found" or "inactive," hand
  off to a human for manual verification rather than telling the patient
  they have no coverage — that's a sensitive, high-stakes message that
  should have a human check it first.
- **Channel behavior:**
  - Chat: real-time verification with immediate result
  - Email: generative reply confirming receipt + "we'll verify and follow
    up within 24 hours" since verification may take a beat

### Escalation & handoff rules (global)

- **Group routing:** Clinical Device Troubleshooting → "Clinical
  Specialists" group. Everything else that escalates → "Tier 2 Support."
- **Context transfer on every handoff:** conversation summary (last 3-5
  turns), identified intent, patient ID (if collected), and any
  structured data already gathered (e.g. proposed new appointment slot).
  The receiving agent should never have to ask "so what's this about?"

---

## Part 2 — Action Flow: Appointment Rescheduling

### Trigger

Ticket-based trigger, firing when both are true:
- Tag `intent:appointment_reschedule` is present (set by the AI agent's
  procedure when it identifies this intent)
- Custom field `Patient ID` is populated (non-empty)

(Alternative: trigger directly from the AI agent procedure's linked
action, if your sandbox's Action Builder version supports procedure-level
triggers — check which is available and use that one; it's cleaner than
a ticket-condition trigger since it skips a round-trip through ticket
fields.)

### Step-by-step flow

**Step 1 — Identity Verification**
- HTTP request: `POST {api_base_url}/verify-identity`
- Headers: `Authorization: Bearer <API_KEY>`
- Body: `{ "patient_id": "{{ticket.custom_field_patient_id}}", "date_of_birth": "{{collected.dob}}" }`
  (DOB collected by the AI agent conversation flow before handing off to
  this Action Flow — don't make the Action Flow itself prompt for it if
  your platform's procedure step already gathered it upstream.)
- **Branch: verified == true** → Step 2
- **Branch: verified == false** → Error path A (see below)
- **Branch: HTTP status 404** → Error path A (patient not found — treat
  same as failed verification, don't reveal *why* it failed to the AI/patient)
- **Branch: HTTP status 401/503/timeout** → Error path B (system unavailable)

**Step 2 — Appointment Lookup**
- HTTP request: `GET {api_base_url}/patients/{{ticket.custom_field_patient_id}}/appointments`
- **Branch: appointments array non-empty** → Step 3
- **Branch: appointments array empty** → Error path C (no appointment to reschedule)
- **Branch: HTTP status 503/timeout** → Error path B

**Step 3 — Present Available Slots**
- HTTP request: `GET {api_base_url}/appointments/available-slots?start_date={{today}}&end_date={{today+14d}}`
- Output slots to the conversation for patient selection (chat: as quick
  replies / buttons; email: as a numbered list asking the patient to reply
  with their choice)
- **Branch: slots array non-empty** → wait for patient selection → Step 4
- **Branch: slots array empty** → Error path D (fully booked)

**Step 4 — Confirm and Update**
- Wait for patient's slot selection (or cancellation)
- **Branch: patient confirms** → HTTP request: `PUT {api_base_url}/appointments/{{original_appointment_id}}`
  with body `{ "date": "{{selected.date}}", "time": "{{selected.time}}" }`
- **Branch: patient cancels mid-flow** → Error path E (graceful exit, no ticket error, just close out politely)
- **Branch: PUT succeeds (confirmation: true)** → Step 5
- **Branch: PUT fails (503/timeout)** → Error path F (partial failure — lookup succeeded, reschedule didn't)

**Step 5 — Ticket Update**
- Add internal note: "Appointment {{appointment_id}} rescheduled from
  {{old_date}} {{old_time}} to {{new_date}} {{new_time}} via AI Agent +
  Action Flow. Patient identity verified at {{timestamp}}."
- Update tags: remove `intent:appointment_reschedule`, add `reschedule:completed`
- Set ticket status per your workflow (e.g. Solved, or Pending if you want an agent to confirm)

### Error paths

| Path | Trigger | Patient-facing message | Ticket/agent action |
|---|---|---|---|
| A — Identity failed | verify-identity returns false or 404 | "We couldn't verify your identity with the information provided. A team member will follow up shortly." | Tag `escalation:identity_failed`, route to Tier 2, internal note with what was attempted (not why it failed, to avoid coaching bad actors) |
| B — EHR unavailable | Any step returns 503/timeout | "Our scheduling system is temporarily unavailable. We'll have someone reach out to help you reschedule." | Tag `escalation:system_unavailable`, route to Tier 2, internal note with the failed step name and timestamp |
| C — No appointment found | appointments array empty | "I don't see an upcoming appointment on file to reschedule. Let me connect you with someone who can help." | Route to Tier 2, note "no appointment found for patient_id X" |
| D — Fully booked | slots array empty | "There are no open slots in the next two weeks. A scheduling specialist will follow up with more options." | Route to Tier 2, note "no slots in range" |
| E — Patient cancels | mid-flow cancellation | "No problem — reach out anytime if you'd like to reschedule." | No escalation; just close the flow, tag `reschedule:abandoned`, no error framing |
| F — Partial failure | lookup succeeded, PUT failed | "We found your appointment but hit an issue confirming the new time. A team member will finish this for you." | Route to Tier 2, internal note with **both** the found appointment AND the attempted new slot so the agent doesn't have to re-ask the patient anything |

### Variable passing notes

- Carry `patient_id`, `dob` (if you must — consider whether it needs to
  persist past Step 1 or can be discarded after verification, for data
  minimization), the original `appointment_id`, and the `selected_slot`
  forward through each step as flow variables.
- On any escalation, dump the current variable state into the internal
  note so a human picking up the ticket has full context without asking
  the patient to repeat anything — this is called out explicitly in the
  exercise doc as something they're evaluating.

---

## Talking points for interview day

- **Why hard-escalate clinical device questions instead of letting KB
  articles answer them:** patient safety — a wrong troubleshooting step
  on a glucose monitor has real consequences; FAQ mismatches on billing
  don't carry the same risk.
- **Why verify identity before *any* EHR call, not just before writes:**
  HIPAA/PHI handling — even a read (appointment lookup) exposes PHI, so
  the gate belongs before Step 1, not just before the reschedule write in
  Step 4.
- **Why the identity-failure message doesn't say *what* failed:** avoids
  giving an attacker a signal about which piece (ID vs. DOB) was wrong —
  same principle as generic "invalid username or password" messaging.
