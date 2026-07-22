import { useState, type FormEvent } from 'react'
import { Check, CheckCircle2, Copy, UserPlus } from 'lucide-react'
import OwnerAccountsPageShell from '../components/OwnerAccountsPageShell'
import {
  createEmployeeAccount,
  type CreateEmployeeAccountResponse,
  type EmployeeAccountRole,
} from '../utils/employeeAccountsApi'

const EMPTY_FORM = {
  name: '',
  phone_number: '',
  role: '' as EmployeeAccountRole | '',
}

function formatExpiry(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function CreateEmployeeAccountPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [result, setResult] = useState<CreateEmployeeAccountResponse | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

  const normalizedName = form.name.trim()
  const normalizedPhone = form.phone_number.trim()
  const isNameValid = normalizedName.length > 0 && !/\s/.test(normalizedName)
  const isPhoneValid = /^01\d{9}$/.test(normalizedPhone)
  const isFormValid = isNameValid && isPhoneValid && form.role !== ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isFormValid || !form.role || isSubmitting) {
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const response = await createEmployeeAccount({
        name: normalizedName,
        phone_number: normalizedPhone,
        role: form.role,
      })
      setResult(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The employee account could not be created.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result.activation_code)
      setHasCopied(true)
    } catch {
      setHasCopied(false)
    }
  }

  if (result) {
    const details = [
      ['Account ID', result.employee.account_id],
      ['Username', result.employee.username],
      ['Phone number', result.employee.phone_number],
      ['Role', result.employee.role],
      ['Status', result.employee.status.split('_').join(' ')],
      ['Activation expires', formatExpiry(result.activation_expires_at)],
    ]

    return (
      <OwnerAccountsPageShell backHref="/role-dashboard/owner/employee-accounts" backLabel="Back to Employee accounts" maxWidth="form">
        <section className="mt-6 rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-9">
          <div className="flex flex-col gap-5 border-b border-teal-100 pb-7 sm:flex-row sm:items-start">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Account created</p>
              <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Employee access is ready</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                Give this temporary activation code to the employee so they can finish setting up their account.
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-gold-200 bg-[#fff9e8] p-5 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gold-600">Activation code</p>
            <p className="mt-3 break-all font-display text-5xl text-ink">{result.activation_code}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
            >
              {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {hasCopied ? 'Code copied' : 'Copy activation code'}
            </button>
          </div>

          <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl border border-slate-100 p-4">
                <dt className="font-bold text-slate-400">{label}</dt>
                <dd className="mt-1 break-words font-bold capitalize text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM)
              setResult(null)
              setHasCopied(false)
            }}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-teal-200 bg-white px-6 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50"
          >
            Create another account
          </button>
        </section>
      </OwnerAccountsPageShell>
    )
  }

  return (
    <OwnerAccountsPageShell backHref="/role-dashboard/owner/employee-accounts" backLabel="Back to Employee accounts" maxWidth="form">
      <section className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-10">
        <UserPlus className="absolute -right-8 -top-8 h-40 w-40 text-teal-50" />
        <div className="relative mx-auto max-w-2xl">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-gold-300">
              <UserPlus className="h-7 w-7" />
            </span>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">Owner workspace</p>
            <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Account Creation</h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-9 space-y-6 rounded-[1.5rem] border border-teal-100 bg-[#f5faf9] p-5 sm:p-7">
            <label className="form-label">
              Unique name
              <input
                className="form-input"
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="employeeusername"
                autoComplete="off"
                required
                aria-invalid={form.name.length > 0 && !isNameValid}
              />
            </label>

            <label className="form-label">
              Unique phone number
              <input
                className="form-input"
                type="tel"
                inputMode="numeric"
                value={form.phone_number}
                onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))}
                placeholder="01xxxxxxxxx"
                maxLength={11}
                autoComplete="off"
                required
                aria-invalid={form.phone_number.length > 0 && !isPhoneValid}
              />
            </label>

            <label className="form-label">
              Role
              <select
                className="form-input"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as EmployeeAccountRole | '' }))}
                required
              >
                <option value="" disabled>Select a role</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="MANAGER">Manager</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </label>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="mx-auto flex min-h-12 items-center justify-center rounded-full bg-ink px-8 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </OwnerAccountsPageShell>
  )
}
