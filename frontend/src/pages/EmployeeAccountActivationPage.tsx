import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  UserRoundCheck,
} from 'lucide-react'
import {
  AccountActivationRequestError,
  activateEmployeeAccount,
  addEmployeeCredentials,
} from '../utils/accountActivationApi'
import {
  authenticateEmployeeAccess,
  isEmployeeRole,
  saveEmployeeSession,
} from '../utils/employeeAccess'

type OnboardingHandoff = {
  old_username: string
  old_phone_number: string
  setup_token: string
  setup_token_expires_at: string
}

type RestoredHandoff = {
  handoff: OnboardingHandoff | null
  expired: boolean
}

const ONBOARDING_STORAGE_KEY = 'aurora-employee-onboarding'
const employeePhonePattern = /^01\d{9}$/
const sessionDurationOptions = [
  { label: '1m', value: 1 },
  { label: '0.5h', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
]

function readStoredHandoff(): RestoredHandoff {
  const rawHandoff = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY)

  if (!rawHandoff) {
    return { handoff: null, expired: false }
  }

  try {
    const handoff = JSON.parse(rawHandoff) as Partial<OnboardingHandoff>
    const isComplete =
      typeof handoff.old_username === 'string' &&
      typeof handoff.old_phone_number === 'string' &&
      typeof handoff.setup_token === 'string' &&
      typeof handoff.setup_token_expires_at === 'string'
    const expiryTime = isComplete ? Date.parse(handoff.setup_token_expires_at as string) : Number.NaN

    if (!isComplete || Number.isNaN(expiryTime) || expiryTime <= Date.now()) {
      window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY)
      return { handoff: null, expired: true }
    }

    return { handoff: handoff as OnboardingHandoff, expired: false }
  } catch {
    window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY)
    return { handoff: null, expired: true }
  }
}

function saveHandoff(handoff: OnboardingHandoff) {
  window.sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(handoff))
}

function clearHandoff() {
  window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY)
}

function StatusMessage({ tone, children }: { tone: 'error' | 'success' | 'neutral'; children: string }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'neutral' ? Clock3 : AlertCircle
  const toneClass = tone === 'success'
    ? 'border-teal-100 bg-teal-50 text-teal-800'
    : tone === 'neutral'
      ? 'border-gold-200 bg-[#fff9e8] text-ink'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-bold leading-6 ${toneClass}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export default function EmployeeAccountActivationPage() {
  const [restoredState] = useState(readStoredHandoff)
  const [handoff, setHandoff] = useState<OnboardingHandoff | null>(restoredState.handoff)
  const [hasExpiredHandoff, setHasExpiredHandoff] = useState(restoredState.expired)
  const [oldUsername, setOldUsername] = useState('')
  const [oldPhoneNumber, setOldPhoneNumber] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  // TODO: Add Work hours to the credentials request and response types once backend support exists.
  const [workHours, setWorkHours] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [tokenDuration, setTokenDuration] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activatedButNotSignedIn, setActivatedButNotSignedIn] = useState(false)

  const normalizedOldUsername = oldUsername.trim()
  const normalizedOldPhone = oldPhoneNumber.trim()
  const normalizedNewUsername = newUsername.trim()
  const normalizedNewPhone = newPhoneNumber.trim()
  const isActivationValid =
    normalizedOldUsername.length > 0 &&
    !/\s/.test(normalizedOldUsername) &&
    employeePhonePattern.test(normalizedOldPhone) &&
    activationCode.trim().length > 0
  const passwordsMatch = password.length > 0 && password === passwordConfirmation
  const areCredentialsValid =
    normalizedNewUsername.length > 0 &&
    !/\s/.test(normalizedNewUsername) &&
    employeePhonePattern.test(normalizedNewPhone) &&
    workHours.trim().length > 0 &&
    passwordsMatch &&
    tokenDuration !== ''

  const handleActivation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isActivationValid || isSubmitting) return

    setError('')
    setIsSubmitting(true)

    try {
      const response = await activateEmployeeAccount({
        name: normalizedOldUsername,
        phone_number: normalizedOldPhone,
        activation_code: activationCode.trim(),
      })

      if (!response.verified || !response.setup_token || Number.isNaN(Date.parse(response.setup_token_expires_at))) {
        throw new Error('The backend returned an invalid setup-token response.')
      }

      const nextHandoff: OnboardingHandoff = {
        old_username: normalizedOldUsername,
        old_phone_number: normalizedOldPhone,
        setup_token: response.setup_token,
        setup_token_expires_at: response.setup_token_expires_at,
      }

      saveHandoff(nextHandoff)
      setHandoff(nextHandoff)
      setActivationCode('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Account activation could not be verified.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!handoff || !areCredentialsValid || isSubmitting) return

    if (Date.parse(handoff.setup_token_expires_at) <= Date.now()) {
      clearHandoff()
      setHandoff(null)
      setHasExpiredHandoff(true)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const credentialsResponse = await addEmployeeCredentials({
        old_username: handoff.old_username,
        old_phone_number: handoff.old_phone_number,
        new_username: normalizedNewUsername,
        new_phone_number: normalizedNewPhone,
        new_password: password,
        password_confirmation: passwordConfirmation,
        setup_token: handoff.setup_token,
      })

      if (!credentialsResponse.activated) {
        throw new Error('The backend did not confirm account activation.')
      }

      clearHandoff()
      setHandoff(null)

      try {
        const authentication = await authenticateEmployeeAccess({
          username: normalizedNewUsername,
          phone_number: normalizedNewPhone,
          password,
          tokenDuration,
        })

        if (
          authentication?.allowed !== true ||
          !authentication.token ||
          !authentication.expires_at ||
          Number.isNaN(Date.parse(authentication.expires_at)) ||
          !isEmployeeRole(authentication.role)
        ) {
          throw new Error('Automatic sign-in did not return a valid employee session.')
        }

        saveEmployeeSession({
          username: normalizedNewUsername,
          phone_number: normalizedNewPhone,
          token: authentication.token,
          tokenDuration,
          expires_at: authentication.expires_at,
          role: authentication.role,
        })

        window.location.href = '/role-dashboard'
      } catch {
        setPassword('')
        setPasswordConfirmation('')
        setActivatedButNotSignedIn(true)
      }
    } catch (requestError) {
      if (requestError instanceof AccountActivationRequestError && requestError.status === 401) {
        clearHandoff()
        setHandoff(null)
        setHasExpiredHandoff(true)
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Credentials could not be added.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (activatedButNotSignedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 py-10">
        <section className="w-full max-w-xl rounded-[1.75rem] bg-white p-7 text-center shadow-soft sm:p-9">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-100 text-teal-700">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Account activated</p>
          <h1 className="mt-3 font-display text-4xl text-ink">Continue from employee sign in</h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Your credentials were saved, but automatic sign-in did not complete. Work hours were not saved.
          </p>
          <a href="/employee-admin" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-bold text-white transition hover:bg-teal-700">
            Go to employee sign in
          </a>
        </section>
      </main>
    )
  }

  if (hasExpiredHandoff) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 py-10">
        <section className="w-full max-w-xl rounded-[1.75rem] bg-white p-7 shadow-soft sm:p-9">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fff9e8] text-gold-600">
            <Clock3 className="h-7 w-7" />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-gold-600">Setup session expired</p>
          <h1 className="mt-3 font-display text-4xl text-ink">A new activation code is required</h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            The temporary setup token is no longer available. Do not reuse the previous activation code; ask the clinic owner for a new one.
          </p>
          <a href="/employee-admin" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-bold text-white transition hover:bg-teal-700">
            Back to employee sign in
          </a>
        </section>
      </main>
    )
  }

  const isCredentialsStep = handoff !== null

  return (
    <main className="min-h-screen bg-[#f5faf9] px-5 py-8 sm:py-10">
      <section className="mx-auto w-full max-w-3xl">
        <a href="/employee-admin" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-teal-300 hover:bg-teal-50">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </a>

        <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-10">
          <UserRoundCheck className="absolute -right-8 -top-8 h-40 w-40 text-teal-50" />
          <div className="relative text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-gold-300">
              {isCredentialsStep ? <KeyRound className="h-7 w-7" /> : <UserRoundCheck className="h-7 w-7" />}
            </span>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">Employee onboarding</p>
            <h1 className="mt-3 font-display text-5xl text-ink sm:text-6xl">Welcome!</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              {isCredentialsStep
                ? 'Choose the credentials you will use for secure employee access.'
                : 'Verify the pending account created for you by the clinic owner.'}
            </p>
          </div>

          <div className="relative mt-8 grid gap-2 rounded-2xl border border-teal-100 bg-[#f5faf9] p-2 sm:grid-cols-2">
            <div className={`rounded-xl px-4 py-3 text-center text-xs font-extrabold uppercase tracking-[0.12em] ${!isCredentialsStep ? 'bg-ink text-white' : 'bg-teal-100 text-teal-700'}`}>
              1. Activate account
            </div>
            <div className={`rounded-xl px-4 py-3 text-center text-xs font-extrabold uppercase tracking-[0.12em] ${isCredentialsStep ? 'bg-ink text-white' : 'bg-white text-slate-400'}`}>
              2. Add credentials
            </div>
          </div>

          {!isCredentialsStep ? (
            <form onSubmit={handleActivation} className="relative mt-7 space-y-5 rounded-[1.5rem] border border-teal-100 bg-[#f5faf9] p-5 sm:p-7">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Step one</p>
                <h2 className="mt-2 font-display text-3xl text-ink">Activate account</h2>
              </div>
              <label className="form-label">
                Original username
                <input
                  className="form-input"
                  type="text"
                  value={oldUsername}
                  onChange={(event) => {
                    setOldUsername(event.target.value.replace(/\s/g, ''))
                    setError('')
                  }}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="form-label">
                Original phone number
                <input
                  className="form-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={oldPhoneNumber}
                  onChange={(event) => {
                    setOldPhoneNumber(event.target.value)
                    setError('')
                  }}
                  placeholder="01xxxxxxxxx"
                  autoComplete="tel"
                  required
                />
              </label>
              <label className="form-label">
                Activation code
                <input
                  className="form-input"
                  type="text"
                  value={activationCode}
                  onChange={(event) => {
                    setActivationCode(event.target.value)
                    setError('')
                  }}
                  autoComplete="one-time-code"
                  required
                />
              </label>
              {error && <StatusMessage tone="error">{error}</StatusMessage>}
              <button type="submit" disabled={!isActivationValid || isSubmitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Verifying account...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCredentials} className="relative mt-7 space-y-5 rounded-[1.5rem] border border-teal-100 bg-[#f5faf9] p-5 sm:p-7">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Step two</p>
                <h2 className="mt-2 font-display text-3xl text-ink">Add credentials</h2>
              </div>
              <label className="form-label">
                New username
                <input
                  className="form-input"
                  type="text"
                  value={newUsername}
                  onChange={(event) => {
                    setNewUsername(event.target.value.replace(/\s/g, ''))
                    setError('')
                  }}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="form-label">
                New phone number
                <input
                  className="form-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={newPhoneNumber}
                  onChange={(event) => {
                    setNewPhoneNumber(event.target.value)
                    setError('')
                  }}
                  placeholder="01xxxxxxxxx"
                  autoComplete="tel"
                  required
                />
              </label>
              <label className="form-label">
                Work hours
                <input
                  className="form-input"
                  type="text"
                  value={workHours}
                  onChange={(event) => setWorkHours(event.target.value)}
                  placeholder="Sunday to Thursday, 9 AM to 5 PM"
                  required
                />
                <span className="normal-case tracking-normal text-slate-400">Required for this form. Work hours are not saved yet.</span>
              </label>
              <label className="form-label">
                Password
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="form-label">
                Confirm password
                <input
                  className="form-input"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => {
                    setPasswordConfirmation(event.target.value)
                    setError('')
                  }}
                  autoComplete="new-password"
                  required
                />
                {passwordConfirmation && !passwordsMatch && (
                  <span className="normal-case tracking-normal text-red-600">Passwords do not match.</span>
                )}
              </label>
              <label className="form-label">
                Stay signed in for:
                <select className="form-input" value={tokenDuration} onChange={(event) => setTokenDuration(event.target.value ? Number(event.target.value) : '')} required>
                  <option value="" disabled>Select a duration</option>
                  {sessionDurationOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <StatusMessage tone="neutral">Work hours stay on this page only until backend support is added.</StatusMessage>
              {error && <StatusMessage tone="error">{error}</StatusMessage>}
              <button type="submit" disabled={!areCredentialsValid || isSubmitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Activating account...' : 'Activate and sign in'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
