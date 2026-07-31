const express = require("express");
const { patients, availableSlots } = require("../data/seed");

const router = express.Router();

// GET /patients/:id/appointments
// Returns the patient's upcoming appointments.
router.get("/patients/:id/appointments", (req, res) => {
  const patient = patients.find((p) => p.patient_id === req.params.id);

  if (!patient) {
    return res.status(404).json({
      error: "not_found",
      message: `No patient found with patient_id '${req.params.id}'.`,
    });
  }

  return res.status(200).json({
    patient_id: patient.patient_id,
    appointments: patient.appointments,
  });
});

// GET /appointments/available-slots?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// Returns available rescheduling slots, optionally filtered to a date range.

function isValidDateString(value) {
  // Must match YYYY-MM-DD exactly
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  // Must represent a real calendar date (rejects 2024-13-45, 2024-02-30, etc.)
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

router.get("/appointments/available-slots", (req, res) => {
  const { start_date, end_date } = req.query;

  if (start_date && !isValidDateString(start_date)) {
    return res.status(400).json({
      error: "start_date must be a valid date in YYYY-MM-DD format",
    });
  }

  if (end_date && !isValidDateString(end_date)) {
    return res.status(400).json({
      error: "end_date must be a valid date in YYYY-MM-DD format",
    });
  }

  if (start_date && end_date && start_date >= end_date) {
    return res.status(400).json({
      error: "start_date must be before end_date",
    });
  }

  let slots = availableSlots;
  if (start_date) {
    slots = slots.filter((s) => s.date >= start_date);
  }
  if (end_date) {
    slots = slots.filter((s) => s.date <= end_date);
  }
  return res.status(200).json({
    slots,
    count: slots.length,
  });
});

const { patients, availableSlots } = require("../data/seed");

// PUT /appointments/:id
// Body: { date, time } — the new date/time for the appointment.
// Reschedules the appointment (searches across all patients) and returns
// a confirmation payload.
router.put("/appointments/:id", (req, res) => {
  const { date, time } = req.body || {};
  if (!date || !time) {
    return res.status(400).json({
      error: "bad_request",
      message: "Both date and time are required to reschedule.",
    });
  }

  if (!isValidDateString(date)) {
    return res.status(400).json({
      error: "bad_request",
      message: "date must be a valid date in YYYY-MM-DD format.",
    });
  }

  let target = null;
  for (const patient of patients) {
    const appt = patient.appointments.find(
      (a) => a.appointment_id === req.params.id
    );
    if (appt) {
      target = appt;
      break;
    }
  }
  if (!target) {
    return res.status(404).json({
      error: "not_found",
      message: `No appointment found with appointment_id '${req.params.id}'.`,
    });
  }

  // Appointment must be in a reschedulable state
  if (target.status === "cancelled" || target.status === "completed") {
    return res.status(409).json({
      error: "invalid_appointment_state",
      message: `Appointment '${req.params.id}' is '${target.status}' and cannot be rescheduled.`,
    });
  }

  // The requested date/time must correspond to an actual open slot
  const slotIndex = availableSlots.findIndex(
    (s) => s.date === date && s.time === time
  );
  if (slotIndex === -1) {
    return res.status(409).json({
      error: "invalid_slot",
      message: `No available slot exists for ${date} at ${time}.`,
    });
  }

  target.date = date;
  target.time = time;
  target.status = "rescheduled";

  // Remove the now-booked slot so it can't be double-booked
  availableSlots.splice(slotIndex, 1);

  return res.status(200).json({
    confirmation: true,
    appointment: target,
  });
});

module.exports = router;
