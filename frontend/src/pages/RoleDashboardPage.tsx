import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ListChecks,
  LockKeyhole,
  PanelTop,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCog,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SessionExpiryCountdown from '../components/SessionExpiryCountdown'
import { loadEmployeeSession } from '../utils/employeeAccess'

type SupportedRole = 'DOCTOR' | 'OWNER' | 'RECEPTIONIST' | 'MANAGER'

type DashboardItem = {
  title: string
  text: string
  meta?: string
  routeTitle?: string
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
      { title: 'Manage booking slots', routeTitle: 'Booking calendar', text: 'View available, booked, and blocked slots in the daily schedule.', meta: 'Front desk view' },
      { title: 'Manage bookings', routeTitle: 'Manual booking creation', text: 'Create, edit, reschedule, cancel, and update booking statuses.', meta: 'Patient-facing operations' },
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

function dashboardRoute() {
  return '/role-dashboard'
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function withPlaceholderRoute(role: SupportedRole, option: string) {
  return `/role-dashboard/${role.toLowerCase()}/${slugify(option)}`
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

function OwnerEntryCard({
  href,
  eyebrow,
  title,
  text,
  icon: Icon,
}: {
  href: string
  eyebrow: string
  title: string
  text: string
  icon: LucideIcon
}) {
  return (
    <a
      href={href}
      className="group relative block w-full min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-teal-100 bg-white p-6 text-ink shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-[#e7f0ef]"
    >
      <Icon className="absolute -right-5 -top-5 h-28 w-28 text-teal-100 transition-colors duration-300 group-hover:text-teal-200" />
      <div className="relative">
        <p className="break-words text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">{eyebrow}</p>
        <h2 className="mt-3 break-words font-display text-3xl leading-tight text-ink">{title}</h2>
        <p className="mt-3 max-w-xl break-words text-sm leading-6 text-slate-500">{text}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
          Open dashboard
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </a>
  )
}

function DoctorNoteDraftOption({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="group relative block w-full min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-teal-100 bg-white p-6 text-ink shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-[#e7f0ef]"
    >
      <Sparkles className="absolute -right-5 -top-5 h-28 w-28 text-teal-100" />
      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="break-words text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">Review required</p>
            <h2 className="mt-3 break-words font-display text-3xl leading-tight text-ink">AI clinical note draft</h2>
            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-500">
              Open the clinical note assistant to turn rough case notes into a structured draft before final approval.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-extrabold text-teal-700">
            <Sparkles className="h-4 w-4" />
            Doctor review required
          </span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#f5faf9] p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Rough note input</p>
            <p className="mt-3 rounded-xl border border-teal-100 bg-white p-3 text-sm leading-6 text-slate-500">
              pain upper right, cold sensitivity, deep caries 16, composite filling done
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Generated draft preview</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Chief complaint, findings, treatment, and follow-up plan prepared for doctor review.
            </p>
          </div>
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
          Open assistant
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </a>
  )
}

function OwnerServiceCard({
  title,
  text,
  meta,
  items,
  icon: Icon,
  tone = 'standard',
}: {
  title: string
  text?: string
  meta?: string
  items?: string[]
  icon: LucideIcon
  tone?: 'standard' | 'careful' | 'restricted'
}) {
  const toneStyles = {
    standard: 'border-white/10 bg-white/8',
    careful: 'border-gold-300/30 bg-gold-400/10',
    restricted: 'border-red-200/20 bg-red-200/10',
  }

  return (
    <article className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border p-6 text-white shadow-card ${toneStyles[tone]}`}>
      <Icon className="absolute -right-6 -top-6 h-32 w-32 text-white/10" />
      <div className="relative">
        {meta && <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-300">{meta}</p>}
        <h3 className="mt-2 font-display text-2xl leading-tight text-white">{title}</h3>
        {text && <p className="mt-3 break-words text-sm leading-6 text-white/65">{text}</p>}
        {items && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold leading-6 text-white/75">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function OwnerServicesSection({ config }: { config: RoleConfig }) {
  return (
    <section id="your-services" className="mt-10 w-full max-w-full rounded-[2rem] bg-ink p-6 text-white shadow-soft sm:p-8 lg:p-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-gold-300">Collected workspace</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-white sm:text-5xl">Your Services</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/60">
          Owner controls, clinic services, and sensitive actions are grouped here so the main workspace stays calm and focused.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {config.metrics.map((item, index) => (
          <OwnerServiceCard
            key={item.title}
            title={item.text}
            text={item.meta}
            meta={item.title}
            icon={[CalendarCheck, UsersRound, ShieldCheck][index]}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {config.focusPanels.map((item, index) => (
          <OwnerServiceCard
            key={item.title}
            title={item.title}
            text={item.text}
            meta={item.meta ?? `Service ${index + 1}`}
            icon={[UserCog, ListChecks, CalendarDays, Stethoscope][index]}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5">
        <OwnerServiceCard title={`${config.label} access included`} items={config.permissions} icon={ShieldCheck} />
        <OwnerServiceCard title="Daily tools included" items={config.practicalPermissions} icon={ListChecks} />
        {config.carefulActions && (
          <OwnerServiceCard title="High-risk owner actions separated" items={config.carefulActions} icon={AlertTriangle} tone="careful" />
        )}
        <OwnerServiceCard title="Not shown by default" items={config.restricted} icon={LockKeyhole} tone="restricted" />
      </div>
    </section>
  )
}

function getMetricIcon(index: number) {
  return [CalendarCheck, UsersRound, ShieldCheck][index] ?? ShieldCheck
}

function getFocusIcon(index: number) {
  return [UserCog, ListChecks, CalendarDays, Stethoscope][index] ?? ListChecks
}

function RoleServicesSection({ config }: { config: RoleConfig }) {
  return (
    <section id="your-services" className="mt-10 w-full max-w-full rounded-[2rem] bg-ink p-6 text-white shadow-soft sm:p-8 lg:p-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-gold-300">Collected workspace</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-white sm:text-5xl">Your Services</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/60">
          Role access, available tools, and service boundaries are grouped here so the main workspace stays focused.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {config.metrics.map((item, index) => (
          <OwnerServiceCard
            key={item.title}
            title={item.text}
            text={item.meta}
            meta={item.title}
            icon={getMetricIcon(index)}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5">
        <OwnerServiceCard title={`${config.label} access included`} items={config.permissions} icon={ShieldCheck} />
        <OwnerServiceCard title="Daily tools included" items={config.practicalPermissions} icon={ListChecks} />
        <OwnerServiceCard title="Not shown by default" items={config.restricted} icon={LockKeyhole} tone="restricted" />
      </div>
    </section>
  )
}

function RoleWorkSection({ config }: { config: RoleConfig }) {
  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      {config.focusPanels.map((item, index) => {
        const href = withPlaceholderRoute(config.role, item.routeTitle ?? item.title)

        if (config.role === 'DOCTOR' && item.title === 'AI clinical note draft') {
          return <DoctorNoteDraftOption key={item.title} href={href} />
        }

        return (
          <OwnerEntryCard
            key={item.title}
            href={href}
            eyebrow={item.meta ?? config.accent}
            title={item.title}
            text={item.text}
            icon={getFocusIcon(index)}
          />
        )
      })}
    </section>
  )
}

function CleanRoleDashboard({ config }: { config: RoleConfig }) {
  const Icon = config.icon

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5faf9]">
      <aside className="overflow-x-hidden border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <a href={dashboardRoute()} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-gold-300">
              <PanelTop className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold tracking-[0.22em] text-ink">AURORA</p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.26em] text-teal-600">Clinic platform</p>
            </div>
          </a>
          <SessionExpiryCountdown />
        </div>
      </aside>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="w-full max-w-full overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-300">
                  <Icon className="h-6 w-6" />
                </span>
                <Pill>{config.label}</Pill>
                <Pill>{config.accent}</Pill>
              </div>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">{config.eyebrow}</p>
              <h1 className="mt-3 max-w-4xl break-words font-display text-4xl leading-[1.05] text-ink sm:text-6xl">{config.title}</h1>
              <p className="mt-5 max-w-3xl break-words leading-7 text-slate-600">{config.summary}</p>
            </div>
            <div className="w-full max-w-full rounded-2xl border border-teal-100 bg-[#f5faf9] p-4 lg:w-72">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Secure workspace</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">This view is prepared for the signed-in {config.label.toLowerCase()}.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Role-specific tools stay near the top.</p>
            </div>
          </div>
        </div>

        <RoleWorkSection config={config} />

        <RoleServicesSection config={config} />
      </section>
    </main>
  )
}

function OwnerDashboard({ config }: { config: RoleConfig }) {
  const Icon = config.icon

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5faf9]">
      <aside className="border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <a href={dashboardRoute()} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-gold-300">
              <PanelTop className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold tracking-[0.22em] text-ink">AURORA</p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.26em] text-teal-600">Clinic platform</p>
            </div>
          </a>
          <SessionExpiryCountdown />
        </div>
      </aside>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="w-full max-w-full rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-300">
                  <Icon className="h-6 w-6" />
                </span>
                <Pill>{config.label}</Pill>
                <Pill>{config.accent}</Pill>
              </div>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">{config.eyebrow}</p>
              <h1 className="mt-3 max-w-4xl font-display text-4xl leading-[1.05] text-ink sm:text-6xl">Business command center</h1>
              <p className="mt-5 max-w-3xl break-words leading-7 text-slate-600">{config.summary}</p>
            </div>
            <div className="w-full max-w-full rounded-2xl border border-teal-100 bg-[#f5faf9] p-4 lg:w-72">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Secure workspace</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">This view is prepared for the signed-in clinic owner.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Sensitive actions stay grouped below for review.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <OwnerEntryCard
            href={withPlaceholderRoute(config.role, 'Employee dashboard')}
            eyebrow="Employee dashboard"
            title="Review a day's work in minutes."
            text="See employees, review work, manage staff-related actions, and keep the clinic overview in one focused place."
            icon={UserCog}
          />
          <OwnerEntryCard
            href={withPlaceholderRoute(config.role, 'Doctor mode')}
            eyebrow="Doctor mode"
            title="All your needs, in one place."
            text="Open doctor services, clinical documentation, treatment notes, and owner-doctor workflows without cluttering this page."
            icon={Stethoscope}
          />
        </div>

        <OwnerServicesSection config={config} />
      </section>
    </main>
  )
}

function RoleDashboard({ config }: { config: RoleConfig }) {
  if (config.role === 'OWNER') {
    return <OwnerDashboard config={config} />
  }

  return <CleanRoleDashboard config={config} />
}

export default function RoleDashboardPage() {
  const session = loadEmployeeSession()

  if (!session) {
    return (
      <AccessState
        badge="Access required"
        title="Sign in to continue"
        text="This area needs an active employee session. Please open it from the employee login flow."
      />
    )
  }

  return <RoleDashboard config={ROLE_CONFIG[session.role]} />
}
