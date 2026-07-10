import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardList,
  FileText,
  ListChecks,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
  Stethoscope,
  UserCog,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type RoleKey = 'owner' | 'doctor' | 'receptionist' | 'manager'
type WorkSurface = 'assistant' | 'calendar' | 'form' | 'list' | 'search' | 'reports' | 'hub'

type FeaturePage = {
  title: string
  eyebrow: string
  description: string
  workArea: string
  later: string
  icon: LucideIcon
  surface: WorkSurface
  primaryAction: string
}

const ROLE_LABELS: Record<RoleKey, string> = {
  owner: 'Owner',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  manager: 'Manager',
}

const FEATURE_PAGES: Record<RoleKey, Record<string, FeaturePage>> = {
  owner: {
    'employee-dashboard': {
      title: 'Employee Dashboard',
      eyebrow: 'Owner workspace',
      description: 'A focused place to review employees, roles, staff activity, and employee-related actions.',
      workArea: 'Employee records will appear here once employee management data is connected.',
      later: 'Connect employee list, role changes, account status, and staff activity endpoints.',
      icon: UserCog,
      surface: 'list',
      primaryAction: 'Review employees',
    },
    'doctor-mode': {
      title: 'Doctor Mode',
      eyebrow: 'Owner doctor workspace',
      description: 'A practical entry point for owner-doctor work such as appointments, notes, and treatment planning.',
      workArea: 'Doctor tools for the owner profile will be grouped here.',
      later: 'Reuse doctor appointment, clinical note, and treatment plan data when those endpoints are ready.',
      icon: Stethoscope,
      surface: 'hub',
      primaryAction: 'Open doctor tools',
    },
  },
  doctor: {
    'today-s-appointments': {
      title: "Today's Appointments",
      eyebrow: 'Clinical schedule',
      description: 'Review assigned appointments, patient context, and the work that needs attention today.',
      workArea: 'Assigned appointment details will appear here when doctor schedule data is connected.',
      later: 'Connect appointment list, patient summary, booking notes, and appointment status updates.',
      icon: CalendarCheck,
      surface: 'calendar',
      primaryAction: 'Load appointments',
    },
    'ai-clinical-note-draft': {
      title: 'AI Clinical Note Draft',
      eyebrow: 'Documentation',
      description: 'Prepare a structured clinical note from rough case text before doctor review and approval.',
      workArea: 'The rough-note input and generated draft review area will live here.',
      later: 'Connect note generation, draft editing, approval, and save-to-record endpoints.',
      icon: Sparkles,
      surface: 'assistant',
      primaryAction: 'Generate draft',
    },
    'treatment-plan': {
      title: 'Treatment Plan',
      eyebrow: 'Patient care',
      description: 'Record diagnosis, procedure details, follow-up instructions, and treatment planning notes.',
      workArea: 'Treatment planning fields will appear here once patient record data is connected.',
      later: 'Connect patient lookup, diagnosis, procedure, prescription, and follow-up plan endpoints.',
      icon: ClipboardList,
      surface: 'form',
      primaryAction: 'Save treatment plan',
    },
    'blocked-time-request': {
      title: 'Blocked Time Request',
      eyebrow: 'Schedule request',
      description: 'Request unavailable time for review without changing the clinic schedule directly.',
      workArea: 'A request form for date, time range, and reason will be added here.',
      later: 'Connect request submission and approval status once manager or owner review exists.',
      icon: ListChecks,
      surface: 'form',
      primaryAction: 'Submit request',
    },
  },
  receptionist: {
    'booking-calendar': {
      title: 'Booking Calendar',
      eyebrow: 'Front desk',
      description: 'View the day schedule, available slots, booked slots, and appointment status from one work area.',
      workArea: 'The booking calendar and slot list will appear here when this page is connected.',
      later: 'Reuse existing slots and booking endpoints from the employee admin workflow.',
      icon: CalendarCheck,
      surface: 'calendar',
      primaryAction: 'Load calendar',
    },
    'manual-booking-creation': {
      title: 'Manual Booking Creation',
      eyebrow: 'Front desk',
      description: 'Create patient bookings from the staff workspace with the same clear flow used by the public booking page.',
      workArea: 'A staff booking form will be placed here.',
      later: 'Connect service, date, available slot, patient details, and booking save endpoints.',
      icon: FileText,
      surface: 'form',
      primaryAction: 'Create booking',
    },
    'patient-communication': {
      title: 'Patient Communication',
      eyebrow: 'Follow-up',
      description: 'Track non-clinical patient contact, call notes, WhatsApp follow-ups, and reminders.',
      workArea: 'Patient contact notes and follow-up tasks will appear here.',
      later: 'Connect communication notes and follow-up task endpoints.',
      icon: MessageSquareText,
      surface: 'form',
      primaryAction: 'Save note',
    },
    'reference-recovery': {
      title: 'Reference Recovery',
      eyebrow: 'Booking support',
      description: 'Help patients recover booking details using safe search information.',
      workArea: 'A secure recovery search form will be added here.',
      later: 'Connect search by allowed patient details once the backend supports recovery lookup.',
      icon: Search,
      surface: 'search',
      primaryAction: 'Find reference',
    },
  },
  manager: {
    'clinic-operations-overview': {
      title: 'Clinic Operations Overview',
      eyebrow: 'Daily operations',
      description: 'Review bookings, slots, doctor schedules, and front-desk workflow from an operational view.',
      workArea: 'Daily clinic status and operational summaries will appear here.',
      later: 'Reuse booking and slot data first, then add staff and doctor workflow summaries.',
      icon: BriefcaseBusiness,
      surface: 'reports',
      primaryAction: 'Load overview',
    },
    'all-doctors-calendars': {
      title: "All Doctors' Calendars",
      eyebrow: 'Schedule coordination',
      description: 'Coordinate doctor calendars and see schedule pressure without owner-only controls.',
      workArea: 'Doctor calendar views will appear here when assignment data is connected.',
      later: 'Connect doctor assignment, calendar filtering, and schedule coordination endpoints.',
      icon: Stethoscope,
      surface: 'calendar',
      primaryAction: 'Load calendars',
    },
    'patient-follow-up-notes': {
      title: 'Patient Follow-up Notes',
      eyebrow: 'Patient flow',
      description: 'Review patient complaints, follow-up notes, and operational patient handoffs.',
      workArea: 'Follow-up queues and note history will appear here.',
      later: 'Connect patient follow-up notes and assignment endpoints.',
      icon: MessageSquareText,
      surface: 'list',
      primaryAction: 'Load follow-ups',
    },
    'reports-and-activity': {
      title: 'Reports and Activity',
      eyebrow: 'Operations review',
      description: 'Review no-shows, cancellations, booking trends, and staff activity when data is available.',
      workArea: 'Operational reports and activity summaries will appear here.',
      later: 'Connect reporting totals, cancellation trends, no-show stats, and staff activity logs.',
      icon: UsersRound,
      surface: 'reports',
      primaryAction: 'Load reports',
    },
  },
}

const disabledActionClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50'

function formatSegment(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getFeaturePage(role: string, slug: string): FeaturePage {
  const fallbackTitle = formatSegment(slug || 'Workspace')

  if (role in FEATURE_PAGES) {
    const page = FEATURE_PAGES[role as RoleKey][slug]

    if (page) {
      return page
    }
  }

  return {
    title: fallbackTitle,
    eyebrow: 'Workspace',
    description: 'This work page is ready to receive a focused workflow when the feature details are confirmed.',
    workArea: 'No workflow is connected to this page yet.',
    later: 'Define the data source and actions for this option before connecting backend functionality.',
    icon: ListChecks,
    surface: 'hub',
    primaryAction: 'Prepare workflow',
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-label">
      {label}
      {children}
    </label>
  )
}

function TextInput({ placeholder, type = 'text' }: { placeholder: string; type?: string }) {
  return <input className="form-input" type={type} placeholder={placeholder} />
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-6">
      <Icon className="h-7 w-7 text-teal-600" />
      <h2 className="mt-4 font-display text-3xl text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  )
}

function DisabledAction({ children, icon: Icon }: { children: string; icon?: LucideIcon }) {
  return (
    <button type="button" disabled className={disabledActionClass}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

function AssistantSurface({ page, icon: Icon }: { page: FeaturePage; icon: LucideIcon }) {
  return (
    <div className="flex min-h-[560px] flex-col rounded-2xl border border-slate-100 bg-[#f5faf9] p-4 sm:p-5">
      <div className="flex-1 rounded-2xl border border-teal-100 bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">Generated response</p>
        <div className="mt-5 grid min-h-[280px] place-items-center rounded-2xl bg-[#f5faf9] p-6 text-center">
          <div className="max-w-md">
            <Icon className="mx-auto h-8 w-8 text-teal-600" />
            <h2 className="mt-4 font-display text-3xl text-ink">No draft generated yet</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Paste rough case notes below. The structured clinical note will appear here after the backend assistant is connected.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-teal-100 bg-white p-4">
        <Field label="Rough note or request">
          <textarea className="form-input min-h-28 resize-none" placeholder="Paste the clinical note, symptoms, treatment, and follow-up request here." />
        </Field>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold leading-5 text-slate-500">{page.workArea}</p>
          <DisabledAction icon={Send}>{page.primaryAction}</DisabledAction>
        </div>
      </div>
    </div>
  )
}

function CalendarSurface({ page, icon: Icon }: { page: FeaturePage; icon: LucideIcon }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border border-teal-100 bg-[#f5faf9] p-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Date">
          <input className="form-input" type="date" />
        </Field>
        <DisabledAction>{page.primaryAction}</DisabledAction>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {['Available work', 'Scheduled work', 'Needs attention'].map((label) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">{label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">Waiting for backend data.</p>
          </div>
        ))}
      </div>
      <EmptyState icon={Icon} title="No connected schedule yet" text={page.workArea} />
    </div>
  )
}

function FormSurface({ page, slug }: { page: FeaturePage; slug: string }) {
  const isManualBooking = slug === 'manual-booking-creation'
  const isBlockedTime = slug === 'blocked-time-request'
  const isCommunication = slug === 'patient-communication'

  return (
    <div className="grid gap-5 rounded-2xl border border-slate-100 bg-[#f5faf9] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={isManualBooking ? 'Patient name' : isBlockedTime ? 'Date' : isCommunication ? 'Patient or booking reference' : 'Patient lookup'}>
          <TextInput placeholder={isManualBooking ? 'Enter patient name' : isBlockedTime ? 'Select request date' : isCommunication ? 'Search patient or reference' : 'Search patient record'} type={isBlockedTime ? 'date' : 'text'} />
        </Field>
        <Field label={isManualBooking ? 'Phone number' : isBlockedTime ? 'Time range' : isCommunication ? 'Communication channel' : 'Appointment or case'}>
          <TextInput placeholder={isManualBooking ? 'Enter phone number' : isBlockedTime ? 'Start and end time' : isCommunication ? 'Call, WhatsApp, or front desk' : 'Select connected appointment'} />
        </Field>
      </div>
      <Field label={isCommunication ? 'Communication note' : isBlockedTime ? 'Reason' : isManualBooking ? 'Booking notes' : 'Clinical details'}>
        <textarea className="form-input min-h-32 resize-none" placeholder={page.workArea} />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold leading-5 text-slate-500">This form is frontend-only until the backend contract exists.</p>
        <DisabledAction>{page.primaryAction}</DisabledAction>
      </div>
    </div>
  )
}

function ListSurface({ page, icon: Icon }: { page: FeaturePage; icon: LucideIcon }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border border-teal-100 bg-[#f5faf9] p-5 md:grid-cols-[1fr_180px_auto] md:items-end">
        <Field label="Search">
          <TextInput placeholder="Search by name, role, patient, or reference" />
        </Field>
        <Field label="Status">
          <select className="form-input">
            <option>All statuses</option>
          </select>
        </Field>
        <DisabledAction>{page.primaryAction}</DisabledAction>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <div className="grid min-w-[620px] grid-cols-3 bg-[#f5faf9] px-4 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-teal-700">
          <span>Name</span>
          <span>Status</span>
          <span>Next action</span>
        </div>
        <div className="px-4 py-6 text-sm text-slate-500">{page.workArea}</div>
      </div>
      <EmptyState icon={Icon} title="No connected records yet" text="Records will appear here after the backend endpoint is ready." />
    </div>
  )
}

function SearchSurface({ page }: { page: FeaturePage }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border border-teal-100 bg-[#f5faf9] p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Phone number">
          <TextInput placeholder="Phone number used for booking" type="tel" />
        </Field>
        <Field label="Patient name or date">
          <TextInput placeholder="Optional recovery detail" />
        </Field>
        <DisabledAction icon={Search}>{page.primaryAction}</DisabledAction>
      </div>
      <EmptyState icon={Search} title="No recovery result yet" text={page.workArea} />
    </div>
  )
}

function ReportsSurface({ page, icon: Icon }: { page: FeaturePage; icon: LucideIcon }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border border-teal-100 bg-[#f5faf9] p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Start date">
          <input className="form-input" type="date" />
        </Field>
        <Field label="End date">
          <input className="form-input" type="date" />
        </Field>
        <DisabledAction>{page.primaryAction}</DisabledAction>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {['Bookings', 'Cancellations', 'No-shows'].map((label) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">{label}</p>
            <p className="mt-3 font-display text-3xl text-ink">--</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Backend data pending</p>
          </div>
        ))}
      </div>
      <EmptyState icon={Icon} title="No report loaded yet" text={page.workArea} />
    </div>
  )
}

function HubSurface({ page, icon: Icon }: { page: FeaturePage; icon: LucideIcon }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {['Primary workflow', 'Connected records'].map((label) => (
        <div key={label} className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-6">
          <Icon className="h-7 w-7 text-teal-600" />
          <h2 className="mt-4 font-display text-3xl text-ink">{label}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">{page.workArea}</p>
        </div>
      ))}
    </div>
  )
}

function FeatureWorkSurface({ page, slug }: { page: FeaturePage; slug: string }) {
  if (page.surface === 'assistant') {
    return <AssistantSurface page={page} icon={page.icon} />
  }

  if (page.surface === 'calendar') {
    return <CalendarSurface page={page} icon={page.icon} />
  }

  if (page.surface === 'form') {
    return <FormSurface page={page} slug={slug} />
  }

  if (page.surface === 'list') {
    return <ListSurface page={page} icon={page.icon} />
  }

  if (page.surface === 'search') {
    return <SearchSurface page={page} />
  }

  if (page.surface === 'reports') {
    return <ReportsSurface page={page} icon={page.icon} />
  }

  return <HubSurface page={page} icon={page.icon} />
}

export default function RolePlaceholderPage() {
  const segments = window.location.pathname.split('/').filter(Boolean)
  const roleSlug = segments[1] ?? 'role'
  const optionSlug = segments.slice(2).join('-') || 'workspace'
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const roleLabel = roleSlug in ROLE_LABELS ? ROLE_LABELS[roleSlug as RoleKey] : formatSegment(roleSlug)
  const page = getFeaturePage(roleSlug, optionSlug)
  const Icon = page.icon
  const dashboardParams = new URLSearchParams({ token, role: roleSlug.toUpperCase() })

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5faf9]">
      <section className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
        <a
          href={`/role-dashboard?${dashboardParams.toString()}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {roleLabel} dashboard
        </a>

        <div className="mt-6 rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-300">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="rounded-full border border-teal-100 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-teal-700 shadow-sm">
                  {roleLabel}
                </span>
              </div>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">{page.eyebrow}</p>
              <h1 className="mt-3 max-w-4xl break-words font-display text-4xl leading-[1.05] text-ink sm:text-6xl">{page.title}</h1>
              <p className="mt-5 max-w-3xl break-words leading-7 text-slate-600">{page.description}</p>
            </div>
            <div className="w-full max-w-full rounded-2xl border border-teal-100 bg-[#f5faf9] p-4 lg:w-72">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Work page</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">This page is prepared for a focused workflow.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Backend data is not connected here yet.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <section className="rounded-[1.5rem] bg-white p-6 shadow-card">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">Primary work area</p>
            <div className="mt-5">
              <FeatureWorkSurface page={page} slug={optionSlug} />
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
