import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Loader2,
  LockKeyhole,
  Pencil,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import SessionExpiryCountdown from '../components/SessionExpiryCountdown'
import { loadEmployeeSession } from '../utils/employeeAccess'
import {
  EmployeeProfileRequestError,
  loadCurrentEmployeeProfile,
  type EmployeeProfileResponse,
  type EmployeeWorkingHour,
} from '../utils/employeeProfileApi'

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function formatMinutes(minutesAfterMidnight: number) {
  const normalizedMinutes = minutesAfterMidnight === 1440 ? 0 : minutesAfterMidnight
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}

function AccessState() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 py-10">
      <section className="w-full max-w-xl rounded-[1.5rem] bg-white p-8 shadow-soft">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-gold-300">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">Access required</p>
        <h1 className="mt-3 font-display text-4xl text-ink">Sign in to view your profile</h1>
        <p className="mt-4 leading-7 text-slate-600">This page needs an active employee session.</p>
        <a
          href="/employee-admin"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
        >
          Employee sign in
        </a>
      </section>
    </main>
  )
}

function LoadingState() {
  return (
    <div className="mt-6 rounded-[1.5rem] border border-teal-100 bg-white px-5 py-16 text-center" role="status">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
      <p className="mt-4 font-bold text-ink">Loading your profile...</p>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const status = error instanceof EmployeeProfileRequestError ? error.status : null
  const isUnauthorized = status === 401
  const isNotFound = status === 404

  return (
    <div className="mt-6 rounded-[1.5rem] border border-red-100 bg-white px-5 py-12 text-center" role="alert">
      <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
      <h1 className="mt-4 font-display text-4xl text-ink">
        {isUnauthorized ? 'Session expired' : isNotFound ? 'Profile unavailable' : 'Unable to load your profile'}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">{error.message}</p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {isUnauthorized ? (
          <a
            href="/employee-admin"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            Return to sign in
          </a>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
        <a
          href="/role-dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink transition hover:border-teal-300 hover:bg-teal-50"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  )
}

function WorkingHoursRow({ hour }: { hour: EmployeeWorkingHour }) {
  return (
    <div className="rounded-md border border-teal-100 bg-[#f5faf9] px-3 py-2">
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-400">Day</p>
          <p className="mt-0.5 text-sm font-bold text-ink">{DAY_NAMES[hour.day_of_week]}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-400">Start</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{formatMinutes(hour.start_minute)}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-400">End</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{formatMinutes(hour.end_minute)}</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${
          hour.working_status
            ? 'bg-teal-100 text-teal-700'
            : 'bg-slate-200 text-slate-600'
        }`}>
          {hour.working_status ? 'Working' : 'Not working'}
        </span>
      </div>
    </div>
  )
}

function ProfileContent({ data }: { data: EmployeeProfileResponse }) {
  const { profile } = data
  const sortedWorkingHours = useMemo(
    () => [...data.working_hours].sort((left, right) => left.day_of_week - right.day_of_week),
    [data.working_hours],
  )

  return (
    <article className="mt-6 rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-soft sm:p-8">
      <div className="text-center">
        <div className="mx-auto grid h-32 w-32 place-items-center rounded-full border-4 border-teal-100 bg-slate-50 text-teal-700 shadow-inner">
          <UserRound className="h-16 w-16" strokeWidth={1.5} />
        </div>
        <p className="mt-6 break-all text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          {profile.employee_id}
        </p>
        <h1 className="mt-3 break-words font-display text-4xl text-ink">{profile.username}</h1>
        <p className="mt-2 text-sm font-extrabold uppercase tracking-[0.14em] text-teal-700">{profile.role}</p>
      </div>

      <section className="mt-9 border-t border-teal-100 pt-7">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Personal information</h2>
        <dl className="mt-5">
          <div className="rounded-xl border border-slate-100 bg-[#f5faf9] p-4">
            <dt className="text-xs font-bold text-slate-400">Phone number</dt>
            <dd className="mt-2 font-bold text-ink">{profile.phone_number}</dd>
          </div>
        </dl>

        {profile.role !== 'OWNER' && (
          <div className="mt-6">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Working hours</h3>
            {sortedWorkingHours.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {sortedWorkingHours.map((hour) => (
                  <WorkingHoursRow key={`${hour.employee_id}-${hour.day_of_week}`} hour={hour} />
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-teal-100 bg-[#f5faf9] px-4 py-3 text-sm font-semibold text-slate-500">
                No working hours saved
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8 border-t border-teal-100 pt-7">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Security</h2>
        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-100 bg-[#f5faf9] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-teal-700">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">Password</p>
              <p className="mt-1 text-sm font-bold text-ink">Hidden for security</p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 w-full cursor-not-allowed flex-wrap items-center justify-center gap-2 rounded-full border border-teal-100 bg-white px-4 text-sm font-bold text-slate-400 sm:w-auto sm:shrink-0"
          >
            <Pencil className="h-4 w-4" />
            Edit credentials
            <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-gold-700">
              Coming soon
            </span>
          </button>
        </div>
      </section>
    </article>
  )
}

export default function EmployeeProfilePage() {
  const [session] = useState(loadEmployeeSession)
  const [data, setData] = useState<EmployeeProfileResponse | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setData(await loadCurrentEmployeeProfile())
    } catch (requestError) {
      setData(null)
      setError(requestError instanceof Error ? requestError : new Error('Your profile could not be loaded.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) void loadProfile()
  }, [loadProfile, session])

  if (!session) return <AccessState />

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5faf9]">
      <section className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href="/role-dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </a>
          <SessionExpiryCountdown />
        </div>

        {isLoading && <LoadingState />}
        {!isLoading && error && <ErrorState error={error} onRetry={loadProfile} />}
        {!isLoading && !error && data && <ProfileContent data={data} />}
      </section>
    </main>
  )
}
