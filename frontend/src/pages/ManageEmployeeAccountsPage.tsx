import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Info,
  Loader2,
  RefreshCw,
  Search,
  UserCog,
  UserRound,
  UserRoundCog,
  UserRoundX,
} from 'lucide-react'
import OwnerAccountsPageShell from '../components/OwnerAccountsPageShell'
import {
  EmployeeAccountsRequestError,
  loadCreatedEmployeeAccounts,
  loadCreatedEmployeeProfile,
  loadPendingEmployeeAccounts,
  loadPendingEmployeeProfile,
  type CreatedAccountListItem,
  type CreatedAccountProfile,
  type ManagedEmployeeAccountRole,
  type PendingAccountListItem,
  type PendingAccountProfile,
} from '../utils/employeeAccountsApi'

type AccountTab = 'created' | 'pending'

type AccountPreview = {
  id: string
  username: string
  phone_number: string
  role: ManagedEmployeeAccountRole
  status: string
  tab: AccountTab
  activation_expires_at?: string | null
  setup_expires_at?: string | null
}

type ProfileTarget = Pick<AccountPreview, 'id' | 'tab' | 'username'>

const EMPTY_ACCOUNTS: Record<AccountTab, AccountPreview[]> = {
  created: [],
  pending: [],
}

const EMPTY_FLAGS: Record<AccountTab, boolean> = {
  created: false,
  pending: false,
}

const EMPTY_ERRORS: Record<AccountTab, Error | null> = {
  created: null,
  pending: null,
}

function mapCreatedAccount(account: CreatedAccountListItem | CreatedAccountProfile): AccountPreview {
  return {
    id: account.employee_id,
    username: account.username,
    phone_number: account.phone_number,
    role: account.role,
    status: account.is_active ? 'ACTIVE' : 'INACTIVE',
    tab: 'created',
  }
}

function mapPendingAccount(account: PendingAccountListItem | PendingAccountProfile): AccountPreview {
  return {
    id: account.account_id,
    username: account.username,
    phone_number: account.phone_number,
    role: account.role,
    status: account.status,
    tab: 'pending',
    activation_expires_at:
      'activation_expires_at' in account
        ? account.activation_expires_at ?? account.code_expiry_time
        : account.code_expiry_time,
    setup_expires_at:
      'setup_expires_at' in account
        ? account.setup_expires_at ?? account.setup_token_expiry_time
        : null,
  }
}

function formatStatus(status: string) {
  return status.split('_').join(' ').toLowerCase()
}

function formatExpiry(value?: string | null) {
  if (!value) return null

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString()
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

function AccountRow({
  account,
  disabled,
  onOpen,
}: {
  account: AccountPreview
  disabled: boolean
  onOpen: () => void
}) {
  const activationExpiry = formatExpiry(account.activation_expires_at)

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
        {account.tab === 'pending' && activationExpiry && (
          <p className="mt-2 text-xs text-slate-500">Activation expires: {activationExpiry}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-teal-200 bg-white text-teal-700 transition hover:border-teal-400 hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-wait disabled:opacity-50"
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
  const activationExpiry = formatExpiry(account.activation_expires_at)
  const setupExpiry = formatExpiry(account.setup_expires_at)

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
      </div>

      <section className="mt-9 border-t border-teal-100 pt-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Personal information</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-4">
            <dt className="text-xs font-bold text-slate-400">Phone number</dt>
            <dd className="mt-2 font-bold text-ink">{account.phone_number}</dd>
          </div>
          {!isCreated && activationExpiry && (
            <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-4">
              <dt className="text-xs font-bold text-slate-400">Activation expiry</dt>
              <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{activationExpiry}</dd>
            </div>
          )}
          {!isCreated && setupExpiry && (
            <div className="rounded-2xl border border-slate-100 bg-[#f5faf9] p-4">
              <dt className="text-xs font-bold text-slate-400">Credential setup expiry</dt>
              <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{setupExpiry}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-8 border-t border-teal-100 pt-7">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Account actions</p>
          <p className="mt-2 text-sm text-slate-500">These controls are not connected to the backend yet.</p>
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

function LoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white px-5 py-12 text-center" role="status">
      <Loader2 className="mx-auto h-7 w-7 animate-spin text-teal-600" />
      <p className="mt-4 font-bold text-ink">{label}</p>
    </div>
  )
}

function ErrorState({
  error,
  onRetry,
  onBack,
}: {
  error: Error
  onRetry: () => void
  onBack?: () => void
}) {
  const isUnauthorized = error instanceof EmployeeAccountsRequestError && error.status === 401

  return (
    <div className="rounded-2xl border border-red-100 bg-white px-5 py-10 text-center" role="alert">
      <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
      <p className="mt-4 font-display text-3xl text-ink">Unable to load account information</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">{error.message}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-100 bg-white px-5 text-sm font-bold text-ink transition hover:border-teal-300 hover:bg-teal-50"
          >
            Back to accounts
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-teal-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
        {isUnauthorized && (
          <a href="/employee-admin" className="text-sm font-bold text-teal-700 underline underline-offset-4">
            Return to sign in
          </a>
        )}
      </div>
    </div>
  )
}

export default function ManageEmployeeAccountsPage() {
  const [activeTab, setActiveTab] = useState<AccountTab>('created')
  const [searchTerm, setSearchTerm] = useState('')
  const [accountsByTab, setAccountsByTab] = useState(EMPTY_ACCOUNTS)
  const [loadedTabs, setLoadedTabs] = useState(EMPTY_FLAGS)
  const [loadingTabs, setLoadingTabs] = useState(EMPTY_FLAGS)
  const [listErrors, setListErrors] = useState<Record<AccountTab, Error | null>>(EMPTY_ERRORS)
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<AccountPreview | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<Error | null>(null)
  const profileRequestId = useRef(0)

  const loadAccounts = useCallback(async (tab: AccountTab) => {
    setLoadingTabs((current) => ({ ...current, [tab]: true }))
    setListErrors((current) => ({ ...current, [tab]: null }))

    try {
      const accounts = tab === 'created'
        ? (await loadCreatedEmployeeAccounts()).map(mapCreatedAccount)
        : (await loadPendingEmployeeAccounts()).map(mapPendingAccount)

      setAccountsByTab((current) => ({ ...current, [tab]: accounts }))
      setLoadedTabs((current) => ({ ...current, [tab]: true }))
    } catch (error) {
      setListErrors((current) => ({
        ...current,
        [tab]: error instanceof Error ? error : new Error('Employee accounts could not be loaded.'),
      }))
    } finally {
      setLoadingTabs((current) => ({ ...current, [tab]: false }))
    }
  }, [])

  useEffect(() => {
    if (!loadedTabs[activeTab] && !loadingTabs[activeTab] && !listErrors[activeTab]) {
      void loadAccounts(activeTab)
    }
  }, [activeTab, listErrors, loadedTabs, loadingTabs, loadAccounts])

  const loadProfile = async (target: ProfileTarget) => {
    const requestId = profileRequestId.current + 1
    profileRequestId.current = requestId
    setProfileTarget(target)
    setSelectedAccount(null)
    setProfileError(null)
    setIsProfileLoading(true)

    try {
      const response = target.tab === 'created'
        ? await loadCreatedEmployeeProfile(target.id)
        : await loadPendingEmployeeProfile(target.id)

      if (profileRequestId.current !== requestId) return

      setSelectedAccount(
        target.tab === 'created'
          ? mapCreatedAccount(response.account as CreatedAccountProfile)
          : mapPendingAccount(response.account as PendingAccountProfile),
      )
    } catch (error) {
      if (profileRequestId.current !== requestId) return
      setProfileError(error instanceof Error ? error : new Error('The employee profile could not be loaded.'))
    } finally {
      if (profileRequestId.current === requestId) setIsProfileLoading(false)
    }
  }

  const closeProfile = () => {
    profileRequestId.current += 1
    setProfileTarget(null)
    setSelectedAccount(null)
    setProfileError(null)
    setIsProfileLoading(false)
  }

  const changeTab = (tab: AccountTab) => {
    closeProfile()
    setActiveTab(tab)
    setSearchTerm('')
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const activeAccounts = accountsByTab[activeTab]
  const visibleAccounts = activeAccounts.filter((account) =>
    account.username.toLowerCase().includes(normalizedSearch),
  )
  const activeListError = listErrors[activeTab]
  const isActiveListLoading = loadingTabs[activeTab]

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
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">Primary work area</p>

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
            {profileTarget ? (
              <div className="mt-5">
                {isProfileLoading && <LoadingState label={`Loading ${profileTarget.username}'s profile...`} />}
                {!isProfileLoading && profileError && (
                  <ErrorState
                    error={profileError}
                    onBack={closeProfile}
                    onRetry={() => void loadProfile(profileTarget)}
                  />
                )}
                {!isProfileLoading && !profileError && selectedAccount && (
                  <AccountDetails account={selectedAccount} onBack={closeProfile} />
                )}
              </div>
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
                        disabled={isActiveListLoading}
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
                  {isActiveListLoading && <LoadingState label={`Loading ${activeTab} accounts...`} />}
                  {!isActiveListLoading && activeListError && (
                    <ErrorState error={activeListError} onRetry={() => void loadAccounts(activeTab)} />
                  )}
                  {!isActiveListLoading && !activeListError && loadedTabs[activeTab] && activeAccounts.length === 0 && (
                    <div className="rounded-2xl border border-teal-100 bg-white px-5 py-12 text-center">
                      <UserRound className="mx-auto h-7 w-7 text-teal-600" />
                      <p className="mt-4 font-display text-3xl text-ink">
                        No {activeTab} accounts yet
                      </p>
                    </div>
                  )}
                  {!isActiveListLoading && !activeListError && activeAccounts.length > 0 && visibleAccounts.length === 0 && (
                    <div className="rounded-2xl border border-teal-100 bg-white px-5 py-12 text-center">
                      <Search className="mx-auto h-7 w-7 text-teal-600" />
                      <p className="mt-4 font-display text-3xl text-ink">No employees to show</p>
                    </div>
                  )}
                  {!isActiveListLoading && !activeListError && visibleAccounts.map((account) => (
                    <AccountRow
                      key={`${account.tab}-${account.id}`}
                      account={account}
                      disabled={isProfileLoading}
                      onOpen={() => void loadProfile({ id: account.id, tab: account.tab, username: account.username })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </OwnerAccountsPageShell>
  )
}
