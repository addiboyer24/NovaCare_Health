const express = require("express");
const { patients } = require("../data/seed");

const router = express.Router();

// POST /verify-insurance
// Body: { patient_id, date_of_birth }
router.post("/verify-insurance", (req, res) => {
  const { patient_id, date_of_birth } = req.body || {};

  if (!patient_id || !date_of_birth) {
    return res.status(400).json({
      error: "bad_request",
      message: "Both patient_id and date_of_birth are required.",
    });
  }

  const patient = patients.find((p) => p.patient_id === patient_id);

  if (!patient) {
    return res.status(404).json({
      error: "not_found",
      message: `No patient found with patient_id '${patient_id}'.`,
    });
  }

  // Verify identity before returning insurance information
  if (patient.dob !== date_of_birth) {
    return res.status(401).json({
      error: "identity_verification_failed",
      message: "Patient identity could not be verified.",
    });
  }

  return res.status(200).json({
    patient_id: patient.patient_id,
    insurance: {
      plan_name: patient.insurance.plan_name,
      group_number: patient.insurance.group_number,
      coverage_status: patient.insurance.coverage_status,
      pre_authorization_required:
        patient.insurance.pre_authorization_required,
    },
  });
});

module.exports = router;