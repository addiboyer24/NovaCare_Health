// middleware/simulateDowntime.js
//
// Real EHR integrations are not always up. This mock gives you two
// deliberate, repeatable ways to trigger a 503 so you can demo your
// Action Flow / ZAF app error handling without waiting on a real outage:
//
//   1. Header:  X-Simulate-Error: 503
//      Works on ANY endpoint. Handy when your tool lets you set headers
//      (e.g. Action Builder's HTTP request step, curl, Postman).
//
//   2. Magic values: patient_id "PAT-DOWN" or appointment_id "APT-DOWN"
//      Works even when a caller can't easily set custom headers — just
//      pass the magic ID in the URL/body like any other patient/appointment.
//
// Both simulate the same thing: the upstream EHR system timing out or
// returning a server error, which is realistic behavior for a
// rate-limited, third-party clinical system under load.

function simulateDowntime(req, res, next) {
  const headerTrigger = req.headers["x-simulate-error"];
  const idTrigger =
    req.params.id === "PAT-DOWN" ||
    req.params.id === "APT-DOWN" ||
    req.body?.patient_id === "PAT-DOWN";

  if (headerTrigger === "503" || idTrigger) {
    return res.status(503).json({
      error: "service_unavailable",
      message:
        "The Epic EHR system is temporarily unavailable. Please try again shortly.",
    });
  }

  next();
}

module.exports = { simulateDowntime };
