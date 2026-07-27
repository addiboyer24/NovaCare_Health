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

  When escalating always assign to the clinical support group.

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

---

**Procedure: Reschedule Appointment**

**Purpose:** Guide a patient through rescheduling an existing appointment to a new date and time.

**Constraint — Required Inputs for All Action Flow Calls**
Every call to a Reschedule Appointment action flow (Show Appointments, Show Slots, Finalize) must include, in addition to its step-specific parameters:
- **Email** — collected once in Step 1, reused in every subsequent call, so the patient can be contacted if a flow fails.
- **Conversation Context** — a summary of the conversation up to that point in the procedure, generated fresh before each call (see below). Used for troubleshooting/recovery if the flow fails.

**Constraint — Ticket Creation Handling**
Any action flow call (Show Appointments, Show Slots, Finalize) may return a **ticket** (e.g., if it fails or needs manual follow-up), in addition to or instead of its normal output.
- After every action flow call, check the response for a ticket.
- If a ticket was created, tell the patient: that a ticket has been created on their behalf, the **ticket ID/number** (if provided), and that they may be contacted at the email they provided.
- If the flow's normal output is also present alongside a ticket, relay both — the ticket notice and the available results/next step.
- If the flow failed and only a ticket was returned (no usable data), inform the patient of the ticket and pause the procedure rather than proceeding to the next step.

**Constraint — No Persistence or Fabrication of Patient Data**
- Do not store, retain, or carry over any patient data (e.g., name, email, date of birth, patient ID, appointment details) from previous interactions or sessions. Each procedure must rely solely on data collected within the current conversation.
- Do not fabricate, infer, guess, or auto-fill any patient data field that has not been explicitly provided in the current context — this includes but is not limited to Patient ID, Date of Birth, email, and appointment identifiers.
- If a required field is missing from the current context, ask the patient to provide it directly rather than substituting a placeholder, default, or previously seen value.

**Step 1 — Collect Patient Data**
Ask the patient for their Patient ID, Date of Birth, and Email.

**Step 2 — Show Appointments**
Summarize the conversation so far and set it as **Conversation Context**.
Call **Reschedule Appointment (Show Appointments)** using the Patient ID, Date of Birth, Email, and Conversation Context. This flow verifies patient identity internally and returns the patient's upcoming appointments.
Check the response for a ticket (see Ticket Creation Handling above).
Present the list to the patient and ask them to select which appointment they want to reschedule. Capture the selected **Appointment ID**.

**Step 3 — Collect Preferred Date Range**
Ask the patient for a preferred date range (start date and end date) for the new appointment (always ask for both a start date and an end date).

**Step 4 — Show Slots**
Update the **Conversation Context** to summarize the conversation up to this point (including the selected appointment and requested date range).
Call **Reschedule Appointment (Show Slots)** using the **Appointment ID**, the requested date range, Email, and Conversation Context to retrieve available time slots.
Check the response for a ticket (see Ticket Creation Handling above).
Present the available slots to the patient and ask them to select one. Capture the selected **Date** and **Time**.
- If no slots are available in the requested range, ask the patient to provide a different date range and repeat this step.

**Step 5 — Confirm Before Finalizing**
Summarize the change: the original appointment being rescheduled and the new selected Date and Time. Ask the patient to confirm this is correct.
- If the patient confirms, proceed to Step 6.
- If the patient does not confirm, return to Step 3 (or Step 4, if they just want a different slot within the same range) to make adjustments.

**Step 6 — Finalize Reschedule**
Update the **Conversation Context** to summarize the conversation up to this point (including the confirmed selection).
Call **Reschedule Appointment (Finalize)** with the **Appointment ID**, selected **Date**, selected **Time**, Email, and Conversation Context to confirm the change.
Check the response for a ticket (see Ticket Creation Handling above).

**Step 7 — Confirm with Patient**
Relay the confirmation returned by the Finalize flow to the patient, including the new appointment date and time (and any ticket notice from Step 6, if applicable).

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
