// assets/app.js
//
// NovaCare Patient Appointments — ZAF v2 ticket sidebar app.
// Fetches appointment data from the mock Epic EHR API and displays it to
// the agent, with an "Add to Ticket" action that logs an internal note.

(function () {
  var client = ZAFClient.init();

  var els = {}; // populated on DOMContentLoaded
  var currentPatientId = null;
  var currentAppointments = null;
  var fieldIdCache = null;

  document.addEventListener("DOMContentLoaded", function () {
    els = {
      loading: document.getElementById("state-loading"),
      missingId: document.getElementById("state-missing-id"),
      error: document.getElementById("state-error"),
      empty: document.getElementById("state-empty"),
      loaded: document.getElementById("state-loaded"),
      errorMessage: document.getElementById("error-message"),
      patientIdDisplay: document.getElementById("patient-id-display"),
      appointmentsList: document.getElementById("appointments-list"),
      addConfirmation: document.getElementById("add-confirmation"),
      btnRetryMissing: document.getElementById("btn-retry-missing"),
      btnRetryError: document.getElementById("btn-retry-error"),
      btnRefresh: document.getElementById("btn-refresh"),
      btnAddToTicket: document.getElementById("btn-add-to-ticket"),
    };

    els.btnRetryMissing.addEventListener("click", loadAppointments);
    els.btnRetryError.addEventListener("click", loadAppointments);
    els.btnRefresh.addEventListener("click", loadAppointments);
    els.btnAddToTicket.addEventListener("click", addToTicket);
  });

  client.on("app.registered", function () {
    loadAppointments();
  });

  function showState(name) {
    ["loading", "missingId", "error", "empty", "loaded"].forEach(function (key) {
      els[key].classList.toggle("hidden", key !== name);
    });
  }

  // Reads the Patient ID field, using the field ID from installation
  // settings (see manifest.json: patient_id_field_id) rather than a
  // hardcoded value, so the app works regardless of which org's field ID
  // it's installed against.
  function getPatientIdFieldKey() {
    if (fieldIdCache) {
      return Promise.resolve(fieldIdCache);
    }
    return client.metadata().then(function (metadata) {
      var fieldId = metadata.settings.patient_id_field_id;
      fieldIdCache = "ticket.customField:custom_field_" + fieldId;
      return fieldIdCache;
    });
  }

  function loadAppointments() {
    showState("loading");
    els.addConfirmation.classList.add("hidden");

    getPatientIdFieldKey()
      .then(function (fieldKey) {
        return client.get(fieldKey).then(function (data) {
          return data[fieldKey];
        });
      })
      .then(function (patientId) {
        if (!patientId) {
          showState("missingId");
          return;
        }
        currentPatientId = patientId;
        return fetchAppointments(patientId);
      })
      .catch(function (err) {
        console.error("NovaCare app error:", err);
        showError("Something went wrong reading ticket data.");
      });
  }

  function fetchAppointments(patientId) {
    return client.metadata().then(function (metadata) {
      var baseUrl = metadata.settings.api_base_url;

      // The Authorization header is templated with {{setting.api_key}}.
      // ZAF resolves this server-side against the encrypted "secure"
      // parameter before the request goes out — the raw key is never
      // present in this JS or visible in dev tools network logs.
      return client
        .request({
          url: baseUrl + "/patients/" + encodeURIComponent(patientId) + "/appointments",
          type: "GET",
          secure: true,
          headers: {
            Authorization: "Bearer {{setting.api_key}}",
          },
        })
        .then(function (response) {
          var data = typeof response === "string" ? JSON.parse(response) : response;
          currentAppointments = data.appointments || [];
          renderAppointments(currentPatientId, currentAppointments);
        })
        .catch(function (err) {
          handleFetchError(err);
        });
    });
  }

  function handleFetchError(err) {
    var status = err && err.status;

    if (status === 404) {
      showError("No patient record found for this Patient ID. Check the ID and try again.");
    } else if (status === 401) {
      showError("The app's API credentials were rejected. Contact your admin to check the connection.");
    } else if (status === 503) {
      showError("The Epic EHR system is temporarily unavailable. Please try again shortly.");
    } else if (status === 429) {
      showError("Too many requests right now. Please wait a moment and retry.");
    } else {
      showError("Couldn't reach the Epic EHR system. Check your connection and retry.");
    }
  }

  function showError(message) {
    els.errorMessage.textContent = message;
    showState("error");
  }

  function renderAppointments(patientId, appointments) {
    if (!appointments || appointments.length === 0) {
      showState("empty");
      return;
    }

    els.patientIdDisplay.textContent = patientId;
    els.appointmentsList.innerHTML = "";

    appointments.forEach(function (appt) {
      var li = document.createElement("li");
      li.className = "appointment-card";
      li.innerHTML =
        '<div class="appointment-date">' + escapeHtml(appt.date) + " · " + escapeHtml(appt.time) + "</div>" +
        '<div class="appointment-detail">' + escapeHtml(appt.provider) + "</div>" +
        '<div class="appointment-detail">' + escapeHtml(appt.location) + "</div>" +
        '<span class="appointment-type-badge">' + escapeHtml(appt.type) + "</span>";
      els.appointmentsList.appendChild(li);
    });

    showState("loaded");
  }

  function addToTicket() {
    if (!currentAppointments || currentAppointments.length === 0) {
      return;
    }

    var lines = ["Patient " + currentPatientId + " — upcoming appointments (via NovaCare EHR app):"];
    currentAppointments.forEach(function (appt) {
      lines.push("• " + appt.date + " " + appt.time + " — " + appt.provider + ", " + appt.type + " (" + appt.location + ")");
    });
    var noteText = lines.join("\n");

    // Ensure the comment is added as an INTERNAL note, not a public reply —
    // patient appointment/health data should never go out on a public
    // ticket response. `ticket.comment.type` toggles the composer mode;
    // verify this invoke name against your sandbox's ZAF SDK version, as
    // Zendesk has changed comment-mode APIs across releases.
    client
      .invoke("ticket.comment.type", "internal")
      .then(function () {
        return client.invoke("ticket.comment.appendText", noteText);
      })
      .then(function () {
        els.addConfirmation.classList.remove("hidden");
      })
      .catch(function (err) {
        console.error("Failed to add note:", err);
        els.errorMessage.textContent = "Couldn't add the note to this ticket. Try again.";
        showState("error");
      });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
})();
