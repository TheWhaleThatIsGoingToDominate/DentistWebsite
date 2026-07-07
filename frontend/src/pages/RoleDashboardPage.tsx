import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  FileText,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  PanelTop,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCog,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type SupportedRole = 'DOCTOR' | 'OWNER' | 'RECEPTIONIST' | 'MANAGER'

type DashboardItem = {
  title: string
  text: string
  meta?: string
}

type RoleConfig = {
  role: SupportedRole
  label: string
  eyebrow: string
  title: string
  summary: string
  accent: string
  icon: LucideIcon
  primaryAction: string
  secondaryAction: string
  nav: string[]
  metrics: DashboardItem[]
  focusPanels: DashboardItem[]
  permissions: string[]
  restricted: string[]
  practicalPermissions: string[]
  carefulActions?: string[]
}

const supportedRoles: SupportedRole[] = ['DOCTOR', 'OWNER', 'RECEPTIONIST', 'MANAGER']

const ROLE_CONFIG: Record<SupportedRole, RoleConfig> = {
  DOCTOR: {
    role: 'DOCTOR',
    label: 'Doctor',
    eyebrow: 'Clinical workspace',
    title: 'Treatment, documentation, and assigned patients',
    summary:
      'A focused clinical dashboard for appointments, patient context, treatment plans, and doctor-approved documentation drafts.',
    accent: 'Clinical notes',
    icon: Stethoscope,
    primaryAction: 'Open clinical note draft',
    secondaryAction: 'Request blocked time',
    nav: ['Appointments', 'Patients', 'Documentation', 'Schedule'],
    metrics: [
      { title: 'Today', text: '8 appointments', meta: '2 require documentation' },
      { title: 'Clinical notes', text: '5 drafts', meta: 'Doctor review required' },
      { title: 'Follow-ups', text: '3 patients', meta: 'This week' },
    ],
    focusPanels: [
      { title: "Today's appointments", text: 'View assigned patients, booking notes, and appointment status.', meta: 'Own schedule only' },
      { title: 'AI clinical note draft', text: 'Turn rough notes into a structured dental note before final approval.', meta: 'Review required' },
      { title: 'Treatment plan', text: 'Record diagnosis, procedures, follow-up instructions, and prescription notes.', meta: 'Patient record ready' },
      { title: 'Blocked time request', text: 'Request unavailable time for owner or manager approval.', meta: 'Limited schedule control' },
    ],
    permissions: [
      'View own appointments',
      'View assigned patient basic info',
      'View patient booking notes',
      'View patient history and previous visits',
      'Mark appointment as completed',
      'Mark patient as no-show if allowed',
      'Add clinical notes',
      'Edit own notes before final approval',
      'Finalize/sign clinical documentation',
      'View finalized documentation for own patients',
      'Create treatment plans',
      'Add diagnosis/procedure details',
      'Add follow-up instructions',
      'Add prescription/instruction notes',
    ],
    practicalPermissions: [
      'Enter rough notes',
      'Generate clinical note AI draft',
      'Edit AI-generated note',
      'Approve/save final note',
      'Regenerate draft before saving',
      'Attach note to appointment/patient record',
      'View own daily/weekly schedule',
      'Request blocked time',
    ],
    restricted: [
      'Create/delete employees',
      'Change employee roles',
      'Change clinic settings',
      'View all financial reports',
      'Delete patient records',
      'Delete finalized clinical notes',
      "Manage all doctors' schedules",
      'Owner-only analytics',
    ],
  },
  OWNER: {
    role: 'OWNER',
    label: 'Owner',
    eyebrow: 'Full platform control',
    title: 'Business command center with optional doctor mode',
    summary:
      'The highest-level workspace for clinic settings, employees, schedules, bookings, services, and business intelligence.',
    accent: 'Full access',
    icon: BriefcaseBusiness,
    primaryAction: 'Create employee account',
    secondaryAction: 'Open doctor mode',
    nav: ['Overview', 'Employees', 'Clinic', 'Reports'],
    metrics: [
      { title: 'Bookings', text: '42 this week', meta: 'All doctors' },
      { title: 'Employees', text: '9 active', meta: '4 roles configured' },
      { title: 'Clinic settings', text: 'Ready', meta: 'Services, slots, hours' },
    ],
    focusPanels: [
      { title: 'Employee management', text: 'Create, edit, disable, reactivate, and assign roles to staff accounts.', meta: 'Owner-only' },
      { title: 'Clinic operations', text: 'Manage profile, services, prices, working days, hours, and slots.', meta: 'Clinic-wide' },
      { title: 'All bookings and records', text: 'View booking statuses, patient records, doctor schedules, and manual bookings.', meta: 'Full visibility' },
      { title: 'Doctor workspace', text: 'Support owner-doctor accounts that can also treat patients and finalize notes.', meta: 'Owner doctor profile' },
    ],
    permissions: [
      'Full access to the platform',
      'Create employee accounts',
      'Edit employee accounts',
      'Disable/reactivate employee accounts',
      'Assign roles',
      'Change employee permissions',
      'Manage clinic profile/settings',
      'Manage clinic services',
      'Manage service prices',
      'Manage doctors',
      'Manage working days/hours',
      'Manage appointment slots',
      'Block/unblock slots',
      'View all bookings',
      'Create bookings manually',
      'Reschedule/cancel bookings',
      'Change booking statuses',
      'View all patient records',
      'View all doctor schedules',
      'View audit/activity logs',
      'View reports/analytics',
      'Manage subscription/billing',
      'Export data',
    ],
    practicalPermissions: [
      'Appear as a doctor in the schedule when enabled',
      'Have appointments assigned to owner-doctor profile',
      'Add clinical notes if also doctor',
      'Use AI note draft if also doctor',
      'Finalize/sign clinical documentation if also doctor',
      'Create receptionist, doctor, and manager accounts',
    ],
    carefulActions: [
      'Deleting employees',
      'Deleting patient records',
      'Deleting finalized clinical notes',
      'Changing clinic-wide settings',
      'Viewing financial reports',
      'Exporting patient data',
    ],
    restricted: [
      'Sensitive owner actions require extra confirmation',
      'Critical business actions should be reviewed carefully',
    ],
  },
  RECEPTIONIST: {
    role: 'RECEPTIONIST',
    label: 'Receptionist',
    eyebrow: 'Front desk operations',
    title: 'Bookings, slots, patient contact, and daily reception flow',
    summary:
      'A practical front-desk dashboard for booking operations, patient communication notes, and appointment status updates.',
    accent: 'Bookings desk',
    icon: CalendarCheck,
    primaryAction: 'Create manual booking',
    secondaryAction: 'Search booking reference',
    nav: ['Calendar', 'Slots', 'Bookings', 'Follow-up'],
    metrics: [
      { title: 'Today', text: '16 bookings', meta: '4 pending confirmation' },
      { title: 'Open slots', text: '9 available', meta: 'Next 48 hours' },
      { title: 'Follow-ups', text: '6 calls', meta: 'WhatsApp notes' },
    ],
    focusPanels: [
      { title: 'Booking calendar', text: 'View available, booked, and blocked slots in the daily schedule.', meta: 'Front desk view' },
      { title: 'Manual booking creation', text: 'Create, edit, reschedule, cancel, and update booking statuses.', meta: 'Patient-facing operations' },
      { title: 'Patient communication', text: 'Add non-clinical notes, call follow-ups, and WhatsApp reminders.', meta: 'No clinical notes' },
      { title: 'Reference recovery', text: 'Support booking confirmation and reference recovery workflows.', meta: 'Owner-controlled' },
    ],
    permissions: [
      'View booking calendar',
      'View available slots',
      'View blocked/booked slots',
      'Create bookings manually',
      'Edit bookings',
      'Reschedule bookings',
      'Cancel bookings',
      'Change booking status: scheduled, arrived, completed if allowed, cancelled, no-show',
      'Search by patient name, phone number, booking reference, and date',
      'View basic patient information',
      'Add/edit non-clinical booking notes',
      'Add call/WhatsApp follow-up notes',
      'Manage available/blocked slots if owner allows',
      'Print or share booking confirmation',
      'Help patient recover booking reference if owner allows',
    ],
    practicalPermissions: [
      'View booking list and calendar',
      'Create patient bookings',
      'Edit booking details',
      'Cancel bookings when needed',
      'Update appointment status',
      'Manage available and blocked slots',
      'View basic patient information',
      'Add reception notes',
    ],
    restricted: [
      'Create employee accounts',
      'Change employee roles',
      'Change clinic settings',
      'View financial reports unless allowed',
      'Delete patient records',
      'Delete finalized clinical notes',
      'Edit clinical notes',
      'Use AI clinical note generation',
      'Access all system settings',
      'Export all patient data',
      'Employee management tools',
      'Clinical note access',
      'Clinical note editing',
      'Clinic settings management',
      'Financial reports',
    ],
  },
  MANAGER: {
    role: 'MANAGER',
    label: 'Manager',
    eyebrow: 'Clinic operations',
    title: 'Owner-lite control for daily clinic management',
    summary:
      'A clinic operations dashboard for schedules, booking flow, staff coordination, services allowed by owner, and operational reports.',
    accent: 'Runs the day',
    icon: UsersRound,
    primaryAction: 'Review daily operations',
    secondaryAction: 'Manage doctor schedule',
    nav: ['Operations', 'Schedules', 'Staff', 'Reports'],
    metrics: [
      { title: 'Clinic flow', text: 'On track', meta: 'Daily checklist' },
      { title: 'No-shows', text: '2 today', meta: 'Daily trends' },
      { title: 'Staff activity', text: '18 updates', meta: 'Activity review' },
    ],
    focusPanels: [
      { title: 'Clinic operations overview', text: 'Track all bookings, slots, doctor schedules, and front desk workflow.', meta: 'Operational control' },
      { title: "All doctors' calendars", text: 'View and coordinate schedules without owner-only permissions.', meta: 'No owner override' },
      { title: 'Patient follow-up notes', text: 'Handle complaints, follow-up notes, and future assignment to doctors.', meta: 'Non-clinical' },
      { title: 'Reports and activity', text: 'Review no-show stats, cancellation trends, and staff activity logs.', meta: 'Operations review' },
    ],
    permissions: [
      'View all bookings',
      'Create/edit/reschedule/cancel bookings',
      'Change booking statuses',
      'Manage all appointment slots',
      'Block/unblock slots',
      'Manage doctor schedules',
      "View all doctors' calendars",
      'Manage receptionist workflow',
      'View basic patient information',
      'View operational reports',
      'View no-shows/cancellations stats',
      'View staff activity logs',
      'Manage services if owner allows',
      'Manage working hours if owner allows',
      'Handle patient complaints/follow-up notes',
      'Assign bookings to doctors',
      'Manage daily clinic operations',
    ],
    practicalPermissions: [
      'View all clinic bookings',
      'Manage booking operations',
      'Manage appointment slots',
      'Manage doctor schedules',
      'View basic patient information',
      'Review operational reports',
      'Review staff activity',
      'Coordinate reception staff',
      'Manage services when allowed',
      'Manage working hours when allowed',
    ],
    restricted: [
      'Delete owner account',
      'Change owner password',
      'Change owner role',
      'Access platform subscription/payment ownership',
      'Delete finalized clinical records',
      'Finalize clinical notes',
      'Override doctor signatures',
      'Export all patient/clinical data without owner permission',
      'Owner account management',
      'Owner permission changes',
      'Clinical record deletion',
      'Doctor note finalization',
      'Subscription ownership controls',
      'Full data export',
    ],
  },
}

const sampleAppointments = [
  { time: '09:00 AM', patient: 'Mariam Hassan', service: 'Composite restoration', status: 'In clinic' },
  { time: '10:30 AM', patient: 'Omar Adel', service: 'Consultation', status: 'Confirmed' },
  { time: '12:00 PM', patient: 'Nour Samir', service: 'Scaling', status: 'Documentation pending' },
]

const sampleTeam = [
  { name: 'Dr. Adam Karim', role: 'Doctor', state: 'Treating patients' },
  { name: 'Salma Nabil', role: 'Receptionist', state: 'Front desk' },
  { name: 'Youssef Ali', role: 'Manager', state: 'Operations' },
]

function getRoleFromQuery(value: string | null): SupportedRole | null {
  if (!value) {
    return null
  }

  const normalized = value.toUpperCase()
  return supportedRoles.includes(normalized as SupportedRole) ? normalized as SupportedRole : null
}

function withAccessQuery(token: string, role: SupportedRole, section: string) {
  const params = new URLSearchParams({ token, role, section })
  return `/role-dashboard?${params.toString()}`
}

function AccessState({
  title,
  text,
  badge,
}: {
  title: string
  text: string
  badge: string
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 py-10">
      <section className="w-full max-w-xl rounded-[1.5rem] bg-white p-8 shadow-soft">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-gold-300">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">{badge}</p>
        <h1 className="mt-3 font-display text-4xl text-ink">{title}</h1>
        <p className="mt-4 leading-7 text-slate-600">{text}</p>
        <a
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
        >
          Back to website
        </a>
      </section>
    </main>
  )
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-teal-100 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-teal-700 shadow-sm">
      {children}
    </span>
  )
}

function MetricCard({ item }: { item: DashboardItem }) {
  return (
    <article className="rounded-[1.25rem] border border-teal-100 bg-white p-5 shadow-card">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">{item.title}</p>
      <p className="mt-3 font-display text-3xl text-ink">{item.text}</p>
      {item.meta && <p className="mt-2 text-xs font-semibold text-slate-500">{item.meta}</p>}
    </article>
  )
}

function FocusCard({ item, index }: { item: DashboardItem; index: number }) {
  return (
    <article className="group rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-teal-200">
      <div className="flex items-center justify-between gap-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-sm font-extrabold text-teal-700">
          0{index + 1}
        </span>
        {item.meta && <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{item.meta}</span>}
      </div>
      <h3 className="mt-5 font-display text-2xl text-ink">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
    </article>
  )
}

function ListPanel({
  title,
  items,
  icon: Icon,
  tone = 'standard',
}: {
  title: string
  items: string[]
  icon: LucideIcon
  tone?: 'standard' | 'careful' | 'restricted'
}) {
  const styles = {
    standard: 'border-teal-100 bg-white',
    careful: 'border-gold-200 bg-gold-50',
    restricted: 'border-red-100 bg-red-50',
  }

  return (
    <section className={`rounded-[1.5rem] border p-6 shadow-card ${styles[tone]}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold-300">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="font-display text-2xl text-ink">{title}</h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-xl bg-white/75 px-3 py-3 text-sm font-semibold leading-6 text-slate-600">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function AppointmentsPanel() {
  return (
    <section className="rounded-[1.5rem] bg-ink p-6 text-white shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gold-300">Live workspace preview</p>
          <h2 className="mt-2 font-display text-3xl">Today at a glance</h2>
        </div>
        <Pill>Clinic schedule</Pill>
      </div>
      <div className="mt-6 grid gap-3">
        {sampleAppointments.map((appointment) => (
          <div key={`${appointment.time}-${appointment.patient}`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/8 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center">
            <p className="font-bold text-gold-300">{appointment.time}</p>
            <div>
              <p className="font-bold">{appointment.patient}</p>
              <p className="mt-1 text-sm text-white/55">{appointment.service}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75">{appointment.status}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function DocumentationPanel({ role }: { role: SupportedRole }) {
  const isDoctorLike = role === 'DOCTOR' || role === 'OWNER'

  return (
    <section className="rounded-[1.5rem] border border-teal-100 bg-white p-6 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">AI documentation preparation</p>
          <h2 className="mt-2 font-display text-3xl text-ink">
            {isDoctorLike ? 'Clinical note assistant' : 'Documentation access boundary'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {isDoctorLike
              ? 'Doctors can draft notes from rough text, then review, edit, and approve the final clinical record.'
              : 'This role can see operational patient context but should not generate or finalize clinical notes by default.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-extrabold text-teal-700">
          <Sparkles className="h-4 w-4" />
          Doctor review required
        </span>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl bg-[#f5faf9] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Rough note input</p>
          <p className="mt-4 min-h-28 rounded-xl border border-teal-100 bg-white p-4 text-sm leading-6 text-slate-500">
            pain upper right, cold sensitivity, deep caries 16, composite filling done, advised follow up
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Generated draft preview</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p><strong className="text-ink">Chief complaint:</strong> Upper right pain with cold sensitivity.</p>
            <p><strong className="text-ink">Findings:</strong> Deep caries noted on tooth 16.</p>
            <p><strong className="text-ink">Treatment:</strong> Composite restoration completed.</p>
            <p><strong className="text-ink">Plan:</strong> Follow-up advised if symptoms persist.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function TeamPanel() {
  return (
    <section className="rounded-[1.5rem] border border-teal-100 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">Team snapshot</p>
          <h2 className="mt-2 font-display text-3xl text-ink">Staff and roles</h2>
        </div>
        <UserCog className="h-7 w-7 text-teal-600" />
      </div>
      <div className="mt-6 grid gap-3">
        {sampleTeam.map((member) => (
          <div key={member.name} className="flex items-center justify-between gap-4 rounded-2xl bg-[#f5faf9] px-4 py-4">
            <div>
              <p className="font-bold text-ink">{member.name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{member.role}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-teal-700">{member.state}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function RoleDashboard({ config, token }: { config: RoleConfig; token: string }) {
  const Icon = config.icon

  return (
    <main className="min-h-screen bg-[#f5faf9]">
      <aside className="border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <a href={withAccessQuery(token, config.role, 'overview')} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-gold-300">
              <PanelTop className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold tracking-[0.22em] text-ink">AURORA</p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.26em] text-teal-600">Clinic platform</p>
            </div>
          </a>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {config.nav.map((item) => (
              <a
                key={item}
                href={withAccessQuery(token, config.role, item.toLowerCase())}
                className="shrink-0 rounded-full border border-teal-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-ink transition hover:border-teal-300 hover:bg-teal-50"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-300">
                    <Icon className="h-6 w-6" />
                  </span>
                  <Pill>{config.label}</Pill>
                  <Pill>{config.accent}</Pill>
                </div>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">{config.eyebrow}</p>
                <h1 className="mt-3 max-w-4xl font-display text-4xl leading-[1.05] text-ink sm:text-6xl">{config.title}</h1>
                <p className="mt-5 max-w-3xl leading-7 text-slate-600">{config.summary}</p>
              </div>
              <div className="rounded-2xl border border-teal-100 bg-[#f5faf9] p-4 lg:w-72">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Secure workspace</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">This view is prepared for the signed-in staff member.</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Access details stay hidden from the workspace.</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="min-h-12 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700">
                {config.primaryAction}
              </button>
              <button type="button" className="min-h-12 rounded-full border border-teal-200 bg-white px-6 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50">
                {config.secondaryAction}
              </button>
            </div>
          </div>

          <section className="rounded-[1.75rem] bg-ink p-6 text-white shadow-soft">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gold-300">Clinic responsibilities</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-white/70">
              <p><strong className="text-white">Owner</strong> owns the business.</p>
              <p><strong className="text-white">Manager</strong> runs the day.</p>
              <p><strong className="text-white">Receptionist</strong> handles bookings.</p>
              <p><strong className="text-white">Doctor</strong> handles treatment and clinical notes.</p>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {config.metrics.map((item) => <MetricCard key={item.title} item={item} />)}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-4">
          {config.focusPanels.map((item, index) => <FocusCard key={item.title} item={item} index={index} />)}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <AppointmentsPanel />
          <TeamPanel />
        </div>

        <div className="mt-8">
          <DocumentationPanel role={config.role} />
        </div>

        <div className="mt-8 grid gap-6">
          <ListPanel title={`${config.label} access included`} items={config.permissions} icon={ShieldCheck} />
          <ListPanel title="Daily tools included" items={config.practicalPermissions} icon={ListChecks} />
          {config.carefulActions && (
            <ListPanel title="High-risk owner actions separated" items={config.carefulActions} icon={AlertTriangle} tone="careful" />
          )}
          <ListPanel title="Not shown by default" items={config.restricted} icon={LockKeyhole} tone="restricted" />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            [CalendarDays, 'Responsive schedule areas'],
            [FileText, 'Prepared work areas'],
            [MessageSquareText, 'Communication notes'],
            [Activity, 'Activity trail'],
          ].map(([IconItem, label]) => {
            const TileIcon = IconItem as LucideIcon
            return (
              <div key={label as string} className="rounded-2xl border border-teal-100 bg-white p-5 shadow-card">
                <TileIcon className="h-6 w-6 text-teal-600" />
                <p className="mt-4 font-bold text-ink">{label as string}</p>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default function RoleDashboardPage() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const rawRole = params.get('role')
  const role = getRoleFromQuery(rawRole)

  if (!token || !rawRole) {
    return (
      <AccessState
        badge="Access required"
        title="Invalid access link"
        text="This area needs a valid staff access link. Please open it from the employee login flow."
      />
    )
  }

  if (!role) {
    return (
      <AccessState
        badge="Unauthorized role"
        title="This role is not supported"
        text="This staff role is not available for this workspace. Please contact the clinic owner or manager."
      />
    )
  }

  return <RoleDashboard config={ROLE_CONFIG[role]} token={token} />
}
