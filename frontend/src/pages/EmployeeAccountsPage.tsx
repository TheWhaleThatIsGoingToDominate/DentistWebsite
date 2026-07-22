import { ArrowRight, UserCog, UserPlus, UsersRound } from 'lucide-react'
import OwnerAccountsPageShell from '../components/OwnerAccountsPageShell'

const options = [
  {
    title: 'Manage employee accounts',
    text: 'Review created and pending employee accounts from one owner workspace.',
    href: '/role-dashboard/owner/employee-accounts/manage',
    icon: UserCog,
  },
  {
    title: 'Create an employee account',
    text: 'Create secure access for a receptionist, manager, or doctor.',
    href: '/role-dashboard/owner/employee-accounts/create',
    icon: UserPlus,
  },
]

export default function EmployeeAccountsPage() {
  return (
    <OwnerAccountsPageShell backHref="/role-dashboard" backLabel="Back to Owner dashboard">
      <section className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white shadow-soft sm:p-8 lg:p-10">
        <UsersRound className="absolute -bottom-16 -right-10 h-64 w-64 text-white/5" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-gold-300">
                <UsersRound className="h-6 w-6" />
              </span>
              <span className="rounded-full border border-gold-300/35 bg-white/5 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-gold-300">
                Owner
              </span>
            </div>
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.24em] text-white">Owner workspace</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] text-gold-300 sm:text-6xl">Employee accounts</h1>
            <p className="mt-5 max-w-2xl leading-7 text-white/70">
              Create employee access and keep staff account work collected in one focused place.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-white/15 bg-white/5 p-5 lg:w-80">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-300">Account workspace</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Choose whether to create a new employee account or open the management workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-700">Primary work area</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {options.map(({ title, text, href, icon: Icon }) => (
            <a
              key={title}
              href={href}
              className="group relative overflow-hidden rounded-[1.25rem] border border-teal-100 bg-[#f5faf9] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-[#e7f0ef] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
            >
              <Icon className="absolute -right-5 -top-5 h-28 w-28 text-teal-100 transition group-hover:text-teal-200" />
              <div className="relative">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-6 font-display text-3xl leading-tight text-ink">{title}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
                  Open workspace
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </OwnerAccountsPageShell>
  )
}
