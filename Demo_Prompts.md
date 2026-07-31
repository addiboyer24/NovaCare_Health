# NovaCare Health — Agent Test Cases

## Messaging Agent
https://static.zdassets.com/agent/assets/react/js/standalone.b9ec7570..html#key=033d7cbc-48f7-48d9-9a55-2737cc8b3ba4&botId=6a63ee9c570692b5fdb7c97b&dir=ltr&locale=en-us&origin=https%3A%2F%2Fnovacarehealth-53341.zendesk.com

### Billing Questions
- What payment methods can I use to pay my NovaCare Health bill?

### Device Troubleshooting
- My glucose monitor is making a strange noise when I use the lancet. Is that normal?

### Insurance Verification

**Happy Path**
- Prompt: Can you help me verify my insurance coverage before my appointment?
- Patient ID: `PAT-004`
- Date of Birth: `1995-02-08`

**Sad Path**
- Patient ID: `PAT-001`
- Date of Birth: `1996-04-25`

### Appointment Scheduling
- Prompt: I won’t be able to make my scheduled appointment. How can I reschedule?

**Happy Path**
- Patient ID: `PAT-002`
- Date of Birth: `1990-11-22`

**Sad Path**
- Patient ID: `PAT-004`
- Date of Birth: `1995-02-08`

---

## Email Agent

**Prerequisites:**
- Use `addison.boyer@mso.umt.edu` (⚠️ gotcha: if you use the same email as the agent, it won't send an automated reply)
- Send to: `support@novacarehealth-53341.zendesk.com`

### Billing Questions
- I need to speak with someone about a billing issue. What number do I call?

### Device Troubleshooting
- My blood pressure monitor stopped working and I’m concerned because I have a history of heart problems.

### Insurance Verification
Subject: Insurance Verification for Upcoming Appointment
- Prompt: Hello, I have an upcoming appointment with NovaCare Health and would like to confirm that my insurance information has been verified. Can you please help me verify my coverage?

- Patient ID: `PAT-004`
- Date of Birth: `1995-02-08`

### Appointment Scheduling
Request to Reschedule Appointment
- Hello, I need to reschedule my upcoming appointment. Can you please help me with changing the date or time?