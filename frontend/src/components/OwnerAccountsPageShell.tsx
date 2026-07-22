import type { ReactNode } from 'react'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import SessionExpiryCountdown from './SessionExpiryCountdown'
import { loadEmployeeSession } from '../utils/employeeAccess'

type OwnerAccountsPageShellProps = {
  backHref: string
  backLabel: string
  children: ReactNode
  maxWidth?: 'wide' | 'form'
}

function AccessState() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 py-10">
      <section className="w-full max-w-xl rounded-[1.5rem] bg-white p-8 shadow-soft">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-gold-300">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">Access required</p>
        <h1 className="mt-3 font-display text-4xl text-ink">Sign in to continue</h1>
        <p className="mt-4 leading-7 text-slate-600">This owner workspace needs an active employee session.</p>
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

export default function OwnerAccountsPageShell({
  backHref,
  backLabel,
  children,
  maxWidth = 'wide',
}: OwnerAccountsPageShellProps) {
  const session = loadEmployeeSession()

  if (!session) {
    return <AccessState />
  }

  if (session.role !== 'OWNER') {
    window.location.replace('/role-dashboard')
    return null
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5faf9]">
      <section className={`mx-auto w-full px-5 py-8 lg:px-8 lg:py-10 ${maxWidth === 'form' ? 'max-w-5xl' : 'max-w-7xl'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </a>
          <SessionExpiryCountdown />
        </div>
        {children}
      </section>
    </main>
  )
}
