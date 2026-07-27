// data/seed.js
// Mock "Epic EHR" data store, held in memory. Resets on server restart —
// that's fine for a take-home demo; a real integration would sit behind
// Epic's actual FHIR R4 API.

const patients = [
  {
    patient_id: "PAT-001",
    dob: "1985-03-15",
    name: "Jane Smith",
     insurance: {
      plan_name: "BlueShield Gold PPO",
      group_number: "GRP-88213",
      coverage_status: "active",           // "active" | "inactive" | "not_found"
      pre_authorization_required: false,
    },
    appointments: [
      {
        appointment_id: "APT-101",
        date: "2026-08-04",
        time: "10:00 AM",
        provider: "Dr. Williams",
        type: "Follow-up",
        location: "Main Campus - Room 204",
        status: "confirmed",
      },
      {
        appointment_id: "APT-102",
        date: "2026-08-18",
        time: "2:30 PM",
        provider: "Dr. Patel",
        type: "Annual Physical",
        location: "Main Campus - Room 110",
        status: "confirmed",
      },
    ],
  },
  {
    patient_id: "PAT-002",
    dob: "1990-11-22",
    name: "Marcus Johnson",
    insurance: {
      plan_name: "UnitedHealthcare Silver HMO",
      group_number: "GRP-77421",
      coverage_status: "inactive",           // "active" | "inactive" | "not_found"
      pre_authorization_required: true,
    },
    appointments: [
      {
        appointment_id: "APT-201",
        date: "2026-07-29",
        time: "9:15 AM",
        provider: "Dr. Chen",
        type: "Telehealth Consult",
        location: "Virtual",
        status: "confirmed",
      },
      {
        appointment_id: "APT-202",
        date: "2026-08-10",
        time: "11:45 AM",
        provider: "Dr. Williams",
        type: "Follow-up",
        location: "North Clinic - Room 302",
        status: "confirmed",
      },
      {
        appointment_id: "APT-203",
        date: "2026-08-25",
        time: "3:00 PM",
        provider: "Dr. Nguyen",
        type: "Lab Review",
        location: "Main Campus - Room 118",
        status: "confirmed",
      },
    ],
  },
  {
    patient_id: "PAT-003",
    dob: "1978-06-30",
    name: "Aisha Rahman",
    insurance: {
      plan_name: "Aetna Bronze PPO",
      group_number: "GRP-66342",
      coverage_status: "not_found",           // "active" | "inactive" | "not_found"
      pre_authorization_required: false,
    },
    appointments: [
      {
        appointment_id: "APT-301",
        date: "2026-08-01",
        time: "1:00 PM",
        provider: "Dr. Patel",
        type: "Follow-up",
        location: "Main Campus - Room 204",
        status: "confirmed",
      },
      {
        appointment_id: "APT-302",
        date: "2026-08-14",
        time: "4:15 PM",
        provider: "Dr. Chen",
        type: "Telehealth Consult",
        location: "Virtual",
        status: "confirmed",
      },
    ],
  },
  {
    patient_id: "PAT-004",
    dob: "1995-02-08",
    name: "Sarah Kim",
    insurance: {
      plan_name: "Cigna PPO",
      group_number: "GRP-91045",
      coverage_status: "active",           // "active" | "inactive" | "not_found"
      pre_authorization_required: false,
    },
    appointments: [],
  },
];

// Available rescheduling slots — spread across the next two weeks,
// intentionally across multiple providers/locations.
const availableSlots = [
  { slot_id: "SLOT-01", date: "2026-07-27", time: "9:00 AM", provider: "Dr. Williams", location: "Main Campus - Room 204" },
  { slot_id: "SLOT-02", date: "2026-07-27", time: "1:30 PM", provider: "Dr. Patel", location: "Main Campus - Room 110" },
  { slot_id: "SLOT-03", date: "2026-07-29", time: "10:15 AM", provider: "Dr. Chen", location: "Virtual" },
  { slot_id: "SLOT-04", date: "2026-07-30", time: "3:00 PM", provider: "Dr. Nguyen", location: "Main Campus - Room 118" },
  { slot_id: "SLOT-05", date: "2026-08-01", time: "11:00 AM", provider: "Dr. Williams", location: "North Clinic - Room 302" },
  { slot_id: "SLOT-06", date: "2026-08-03", time: "2:45 PM", provider: "Dr. Patel", location: "Main Campus - Room 110" },
  { slot_id: "SLOT-07", date: "2026-08-05", time: "9:30 AM", provider: "Dr. Chen", location: "Virtual" },
  { slot_id: "SLOT-08", date: "2026-08-06", time: "4:00 PM", provider: "Dr. Nguyen", location: "Main Campus - Room 118" },
  { slot_id: "SLOT-09", date: "2026-08-07", time: "8:30 AM", provider: "Dr. Patel", location: "Main Campus - Room 110" },
  { slot_id: "SLOT-10", date: "2026-08-08", time: "1:00 PM", provider: "Dr. Chen", location: "Virtual" },
  { slot_id: "SLOT-11", date: "2026-08-10", time: "10:45 AM", provider: "Dr. Williams", location: "North Clinic - Room 302" },
  { slot_id: "SLOT-12", date: "2026-08-11", time: "3:30 PM", provider: "Dr. Nguyen", location: "Main Campus - Room 118" },
  { slot_id: "SLOT-13", date: "2026-08-12", time: "9:00 AM", provider: "Dr. Patel", location: "Main Campus - Room 110" },
  { slot_id: "SLOT-14", date: "2026-08-13", time: "11:30 AM", provider: "Dr. Chen", location: "Virtual" },
  { slot_id: "SLOT-15", date: "2026-08-14", time: "2:15 PM", provider: "Dr. Williams", location: "Main Campus - Room 204" },
];

module.exports = { patients, availableSlots };