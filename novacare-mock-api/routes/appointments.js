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
router.get("/appointments/available-slots", (req, res) => {
  const { start_date, end_date } = req.query;

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

  target.date = date;
  target.time = time;
  target.status = "rescheduled";

  return res.status(200).json({
    confirmation: true,
    appointment: target,
  });
});

module.exports = router;
