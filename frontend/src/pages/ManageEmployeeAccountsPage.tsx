import { useState } from 'react'
import {
  ArrowLeft,
  Clock3,
  Info,
  RefreshCw,
  Search,
  UserCog,
  UserRound,
  UserRoundCog,
  UserRoundX,
} from 'lucide-react'
import OwnerAccountsPageShell from '../components/OwnerAccountsPageShell'

type AccountTab = 'created' | 'pending'
type AccountRole = 'RECEPTIONIST' | 'MANAGER' | 'DOCTOR'

type AccountPreview = {
  id: string
  username: string
  phone_number: string
  role: AccountRole
  status: string
  tab: AccountTab
  available_times?: string
  activation_expires_at?: string
}

// Temporary UI-only records. Replace this object with real list responses once those endpoints exist.
const TEMPORARY_UI_ONLY_ACCOUNTS: Record<AccountTab, AccountPreview[]> = {
  created: [
    {
      id: 'TEMP-UI-CREATED-001',
      username: 'sample.receptionist',
      phone_number: '01X XXX XXXXX',
      role: 'RECEPTIONIST',
      status: 'ACTIVE',
      tab: 'created',
      available_times: 'Sunday to Thursday, 09:00 to 17:00',
    },
    {
      id: 'TEMP-UI-CREATED-002',
      username: 'sample.doctor',
      phone_number: '01X XXX XXXXX',
      role: 'DOCTOR',
      status: 'INACTIVE',
      tab: 'created',
      available_times: 'Monday, Wednesday, and Thursday, 10:00 to 18:00',
    },
  ],
  pending: [
    {
      id: 'TEMP-UI-PENDING-001',
      username: 'sample.manager',
      phone_number: '01X XXX XXXXX',
      role: 'MANAGER',
      status: 'PENDING_ACTIVATION',
      tab: 'pending',
      activation_expires_at: 'UI sample: 30 minutes after issue',
    },
    {
      id: 'TEMP-UI-PENDING-002',
      username: 'sample.frontdesk',
      phone_number: '01X XXX XXXXX',
      role: 'RECEPTIONIST',
      status: 'SETTING_UP_CREDENTIALS',
      tab: 'pending',
      activation_expires_at: 'UI sample: setup in progress',
    },
  ],
}

function formatStatus(status: string) {
  return status.split('_').join(' ').toLowerCase()
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  const isInactive = status === 'INACTIVE'
  const tone = isActive
    ? 'border-teal-200 bg-teal-50 text-teal-700'
    : isInactive
      ? 'border-slate-200 bg-slate-100 text-slate-600'
      : 'border-gold-200 bg-[#fff9e8] text-gold-600'

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${tone}`}>
      {formatStatus(status)}
    </span>
  )
}

function AccountRow({ account, onOpen }: { account: AccountPreview; onOpen: () => void }) {
  return (
    <article className="flex min-w-0 items-center gap-4 rounded-2xl border border-teal-100 bg-white p-4 transition duration-200 hover:border-teal-300 hover:bg-teal-50/40 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100 sm:p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f5faf9] text-teal-700">
        <UserRound className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words font-bold text-ink">{account.username}</h3>
          <StatusPill status={account.status} />
        </div>
        <p className="mt-1 break-words text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          {account.role} | {account.phone_number}
        </p>
        {account.tab === 'pending' && account.activation_expires_at && (
          <p className="mt-2 text-xs text-slate-500">{account.activation_expires_at}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-teal-200 bg-white text-teal-700 transition hover:border-teal-400 hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
        aria-label={`View ${account.username} account information`}
        title="View account information"
      >
        <Info className="h-5 w-5" />
      </button>
    </article>
  )
}

function DisabledAction({
  label,
  tone = 'standard',
  icon: Icon,
}: {
  label: string
  tone?: 'standard' | 'danger' | 'gold'
  icon: typeof UserRoundCog
}) {
  const toneClass = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-400'
    : tone === 'gold'
      ? 'border-gold-200 bg-[#fff9e8] text-gold-600'
      : 'border-teal-100 bg-[#f5faf9] text-slate-400'

  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 text-sm font-bold disabled:cursor-not-allowed ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">Coming soon</span>
    </button>
  )
}

function AccountDetails({ account, onBack }: { account: AccountPreview; onBack: () => void }) {
  const isCreated = account.tab === 'created'
  const isInactive = account.status === 'INACTIVE'

  return (
    <div className="mt-5 rounded-[1.5rem] border border-teal-100 bg-white p-5 sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink transition hover:border-teal-300 hover:bg-teal-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {isCreated ? 'Created' : 'Pending'} accounts
      </button>

      <div className="mt-8 text-center">
        <div className="mx-auto grid h-32 w-32 place-items-center rounded-full border-4 border-teal-100 bg-slate-50 text-teal-700 shadow-inner">
          <UserRound className="h-16 w-16" strokeWidth={1.5} />
        </div>
        <p className="mt-6 break-all text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{account.id}</p>
        <h2 className="mt-3 break-words font-display text-4xl text-ink">{account.username}</h2>
        <p className="mt-2 text-sm font-extrabold uppercase tracking-[0.14em] text-teal-700">{account.role}</p>
        <div className="mt-3"><StatusPill status={account.status} /></div>
        <span className="mt-4 inline-flex rounded-full border border-gold-200 bg-[#fff9e8] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gold-600">
          Temporary UI example
        </span>
      </div>

      <section className="mt-9 border-t border-teal-100 pt-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Personal information</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-4">
            <dt className="text-xs font-bold text-slate-400">Phone number</dt>
            <dd className="mt-2 font-bold text-ink">{account.phone_number}</dd>
          </div>
          {isCreated && account.available_times && (
            <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-4">
              <dt className="text-xs font-bold text-slate-400">Available times</dt>
              <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{account.available_times}</dd>
            </div>
          )}
          {!isCreated && account.activation_expires_at && (
            <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-4">
              <dt className="text-xs font-bold text-slate-400">Activation expiry</dt>
              <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{account.activation_expires_at}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-8 border-t border-teal-100 pt-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Account actions</p>
            <p className="mt-2 text-sm text-slate-500">These controls are prepared visually and do not call the backend.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {isCreated ? (
            <>
              <DisabledAction label="Update role or details" icon={UserRoundCog} />
              <DisabledAction
                label={isInactive ? 'Reactivate account' : 'Deactivate account'}
                icon={UserRoundX}
                tone={isInactive ? 'standard' : 'danger'}
              />
            </>
          ) : (
            <>
              <DisabledAction label="Regenerate activation code" icon={RefreshCw} tone="gold" />
              <DisabledAction label="Manage pending state" icon={Clock3} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default function ManageEmployeeAccountsPage() {
  const [activeTab, setActiveTab] = useState<AccountTab>('created')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<AccountPreview | null>(null)

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const visibleAccounts = TEMPORARY_UI_ONLY_ACCOUNTS[activeTab].filter((account) =>
    account.username.toLowerCase().includes(normalizedSearch),
  )

  const changeTab = (tab: AccountTab) => {
    setActiveTab(tab)
    setSearchTerm('')
    setSelectedAccount(null)
  }

  return (
    <OwnerAccountsPageShell backHref="/role-dashboard/owner/employee-accounts" backLabel="Back to Employee accounts">
      <section className="mt-6 rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 border-b border-teal-100 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">Owner workspace</p>
            <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Manage employee accounts</h1>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-gold-300">
            <UserCog className="h-7 w-7" />
          </span>
        </div>

        <div className="mt-7 rounded-[1.5rem] border border-teal-100 bg-[#f5faf9] p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Primary work area</p>
            <span className="rounded-full border border-gold-200 bg-[#fff9e8] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gold-600">
              Temporary UI examples | No backend requests
            </span>
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl border border-teal-100 bg-white p-2 sm:grid-cols-2" role="tablist" aria-label="Employee account lists">
            {(['created', 'pending'] as AccountTab[]).map((tab) => {
              const isActive = tab === activeTab
              return (
                <button
                  key={tab}
                  id={`${tab}-accounts-tab`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab}-accounts-panel`}
                  onClick={() => changeTab(tab)}
                  className={`min-h-12 rounded-xl px-5 text-sm font-bold transition ${isActive ? 'bg-ink text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-teal-50 hover:text-ink'}`}
                >
                  {tab === 'created' ? 'Created accounts' : 'Pending accounts'}
                </button>
              )
            })}
          </div>

          <div
            id={`${activeTab}-accounts-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-accounts-tab`}
          >
            {selectedAccount ? (
              <AccountDetails account={selectedAccount} onBack={() => setSelectedAccount(null)} />
            ) : (
              <div className="mt-5">
                <div className="rounded-2xl border border-teal-100 bg-white p-4 sm:p-5">
                  <label className="form-label" htmlFor="employee-account-search">Search by username</label>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="employee-account-search"
                        type="search"
                        className="form-input pl-12"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Username"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      disabled={searchTerm.length === 0}
                      className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear search
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {visibleAccounts.length > 0 ? (
                    visibleAccounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onOpen={() => setSelectedAccount(account)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-teal-100 bg-white px-5 py-12 text-center">
                      <Search className="mx-auto h-7 w-7 text-teal-600" />
                      <p className="mt-4 font-display text-3xl text-ink">No employees to show</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </OwnerAccountsPageShell>
  )
}
