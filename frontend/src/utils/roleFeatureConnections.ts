export type RoleFeatureConnection = {
  connection_name: string
  connection_status: 'backend_not_ready' | 'frontend_only'
  required_data: string[]
  future_backend_work: string
}

export type RoleFeatureConnectionRole = 'owner' | 'doctor' | 'receptionist' | 'manager'

const ROLE_FEATURE_CONNECTIONS: Record<RoleFeatureConnectionRole, Record<string, RoleFeatureConnection>> = {
  owner: {
    'employee-dashboard': {
      connection_name: 'employee_work_review',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'employee_id', 'employee_role', 'account_status', 'staff_activity'],
      future_backend_work: 'Load employees, roles, account status, and staff activity.',
    },
    'doctor-mode': {
      connection_name: 'owner_doctor_mode',
      connection_status: 'frontend_only',
      required_data: ['token', 'owner_id', 'doctor_profile_status'],
      future_backend_work: 'Connect owner-doctor profile, schedule, and clinical tools when those features exist.',
    },
  },
  doctor: {
    'today-s-appointments': {
      connection_name: 'doctor_today_appointments',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'doctor_id', 'date', 'appointment_status'],
      future_backend_work: 'Load assigned appointments, patient summaries, booking notes, and status updates.',
    },
    'ai-clinical-note-draft': {
      connection_name: 'doctor_case_documentation',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'doctor_id', 'appointment_id', 'patient_id', 'rough_note_text'],
      future_backend_work: 'Create, regenerate, edit, approve, and save clinical note drafts.',
    },
    'treatment-plan': {
      connection_name: 'doctor_treatment_plan',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'doctor_id', 'patient_id', 'appointment_id', 'treatment_plan_fields'],
      future_backend_work: 'Load patient context and save diagnosis, procedure, follow-up, and prescription notes.',
    },
    'blocked-time-request': {
      connection_name: 'doctor_blocked_time_request',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'doctor_id', 'date', 'start_time', 'end_time', 'reason'],
      future_backend_work: 'Submit blocked-time requests and load manager or owner approval status.',
    },
  },
  receptionist: {
    'booking-calendar': {
      connection_name: 'receptionist_booking_calendar',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'date', 'slots', 'bookings', 'booking_status'],
      future_backend_work: 'Reuse existing slot and booking loaders before adding receptionist-specific filtering.',
    },
    'manual-booking-creation': {
      connection_name: 'receptionist_manual_booking',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'patient_name', 'phone_number', 'service', 'date', 'appointment_time', 'notes'],
      future_backend_work: 'Create staff-entered bookings with available slot lookup and booking save.',
    },
    'patient-communication': {
      connection_name: 'patient_communication_notes',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'patient_id', 'booking_reference', 'communication_channel', 'note_text', 'follow_up_status'],
      future_backend_work: 'Load and save non-clinical communication notes and follow-up tasks.',
    },
    'reference-recovery': {
      connection_name: 'booking_reference_recovery',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'phone_number', 'patient_name', 'date'],
      future_backend_work: 'Recover booking references using allowed patient details once the backend supports it.',
    },
  },
  manager: {
    'clinic-operations-overview': {
      connection_name: 'clinic_services_overview',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'date', 'bookings', 'slots', 'cancellations', 'no_shows'],
      future_backend_work: 'Load daily booking flow, slot utilization, and operational totals.',
    },
    'all-doctors-calendars': {
      connection_name: 'doctor_calendar_coordination',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'date_range', 'doctor_ids', 'schedule_assignments', 'blocked_slots'],
      future_backend_work: 'Load doctor calendars, assigned appointments, and schedule pressure.',
    },
    'patient-follow-up-notes': {
      connection_name: 'patient_follow_up_notes',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'patient_id', 'booking_reference', 'note_text', 'assigned_staff_id', 'follow_up_status'],
      future_backend_work: 'Load, save, assign, and complete patient follow-up notes.',
    },
    'reports-and-activity': {
      connection_name: 'reports_and_activity',
      connection_status: 'backend_not_ready',
      required_data: ['token', 'date_range', 'booking_totals', 'cancellation_totals', 'no_show_totals', 'staff_activity'],
      future_backend_work: 'Load report summaries, booking trends, no-show stats, and staff activity logs.',
    },
  },
}

export const FALLBACK_ROLE_FEATURE_CONNECTION: RoleFeatureConnection = {
  connection_name: 'feature_connection_unassigned',
  connection_status: 'backend_not_ready',
  required_data: ['token'],
  future_backend_work: 'Define the data contract before connecting this feature to backend functionality.',
}

export function getRoleFeatureConnection(role: string, slug: string): RoleFeatureConnection {
  if (role in ROLE_FEATURE_CONNECTIONS) {
    return ROLE_FEATURE_CONNECTIONS[role as RoleFeatureConnectionRole][slug] ?? FALLBACK_ROLE_FEATURE_CONNECTION
  }

  return FALLBACK_ROLE_FEATURE_CONNECTION
}

// TODO: Add real fetch helpers here only after the matching backend endpoints and response shapes exist.
