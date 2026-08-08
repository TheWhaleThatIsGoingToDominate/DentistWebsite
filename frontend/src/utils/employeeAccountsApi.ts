import { clearStoredEmployeeSession, loadEmployeeSession } from './employeeAccess'

export type EmployeeAccountRole = 'RECEPTIONIST' | 'MANAGER' | 'DOCTOR'
export type ManagedEmployeeAccountRole = EmployeeAccountRole | 'OWNER'

export type CreateEmployeeAccountRequest = {
  name: string
  phone_number: string
  role: EmployeeAccountRole
}

export type CreatedEmployeeAccount = {
  account_id: string
  username: string
  phone_number: string
  role: EmployeeAccountRole
  status: string
}

export type CreateEmployeeAccountResponse = {
  created: boolean
  employee: CreatedEmployeeAccount
  activation_code: string
  activation_expires_at: string
}

export type CreatedAccountListItem = {
  employee_id: string
  username: string
  phone_number: string
  role: ManagedEmployeeAccountRole
  is_active: boolean
}

export type PendingAccountListItem = {
  account_id: string
  username: string
  phone_number: string
  role: ManagedEmployeeAccountRole
  status: string
  code_expiry_time: string | null
}

export type CreatedAccountProfile = CreatedAccountListItem & {
  status?: string
}

export type CreatedAccountReactivationState = {
  status: 'PENDING_VERIFICATION' | 'SETTING_UP_CREDENTIALS'
  code_expiry_time: string | null
}

export type PendingAccountProfile = {
  account_id: string
  username: string
  phone_number: string
  role: ManagedEmployeeAccountRole
  status: string
  code_expiry_time?: string | null
  setup_token_expiry_time?: string | null
  activation_expires_at?: string | null
  setup_expires_at?: string | null
}

export type CreatedAccountProfileResponse = {
  account: CreatedAccountProfile
  reactivation: CreatedAccountReactivationState | null
}

export type PendingAccountProfileResponse = {
  account: PendingAccountProfile
}

export type DeactivateEmployeeAccountResponse = {
  deactivated: true
  employee_id: string
  employee_status: 'INACTIVE'
}

export type StartEmployeeReactivationResponse = {
  reactivation_created: true
  employee_id: string
  reactivation_id: string
  reactivation_code: string
  reactivation_status: 'PENDING_VERIFICATION'
  code_expires_at: string
}

const EMPLOYEE_ACCOUNTS_BASE_URL = 'https://clinic-auth.vercel.app'

export class EmployeeAccountsRequestError extends Error {
  status: number | null
  kind: 'request' | 'network' | 'unexpected-response'

  constructor(
    message: string,
    options: {
      status?: number | null
      kind?: 'request' | 'network' | 'unexpected-response'
    } = {},
  ) {
    super(message)
    this.name = 'EmployeeAccountsRequestError'
    this.status = options.status ?? null
    this.kind = options.kind ?? 'request'
  }
}

function getErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : ''))
        .filter(Boolean)

      if (messages.length > 0) {
        return messages.join('. ')
      }
    }
  }

  if (status === 400) return 'The account details are invalid.'
  if (status === 401) return 'Your employee session is no longer authorized.'
  if (status === 403) return 'Only the clinic owner can create employee accounts.'
  if (status === 409) return 'An account with these details already exists.'
  return 'The employee account could not be created.'
}

function getManagementErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : ''))
        .filter(Boolean)

      if (messages.length > 0) {
        return messages.join('. ')
      }
    }
  }

  if (status === 401) return 'Your employee session has expired. Sign in again to continue.'
  if (status === 403) return 'Owner access is required to manage employee accounts.'
  if (status === 404) return 'The requested employee account was not found.'
  if (status === 400 || status === 422) return 'The employee account request is invalid.'
  if (status === 409) return 'This employee account is already inactive.'
  return 'Employee account information could not be loaded.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isManagedEmployeeAccountRole(value: unknown): value is ManagedEmployeeAccountRole {
  return value === 'OWNER' || value === 'RECEPTIONIST' || value === 'MANAGER' || value === 'DOCTOR'
}

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}

function isCreatedAccount(value: unknown): value is CreatedAccountListItem {
  if (!isRecord(value)) return false

  return (
    typeof value.employee_id === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone_number === 'string' &&
    isManagedEmployeeAccountRole(value.role) &&
    typeof value.is_active === 'boolean'
  )
}

function isPendingAccount(value: unknown): value is PendingAccountListItem {
  if (!isRecord(value)) return false

  return (
    typeof value.account_id === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone_number === 'string' &&
    isManagedEmployeeAccountRole(value.role) &&
    typeof value.status === 'string' &&
    isNullableString(value.code_expiry_time)
  )
}

function isPendingAccountProfile(value: unknown): value is PendingAccountProfile {
  if (!isRecord(value)) return false

  const optionalTimesAreValid = [
    value.code_expiry_time,
    value.setup_token_expiry_time,
    value.activation_expires_at,
    value.setup_expires_at,
  ].every((time) => time === undefined || isNullableString(time))

  return (
    typeof value.account_id === 'string' &&
    typeof value.username === 'string' &&
    typeof value.phone_number === 'string' &&
    isManagedEmployeeAccountRole(value.role) &&
    typeof value.status === 'string' &&
    optionalTimesAreValid
  )
}

function isCreatedAccountReactivationState(
  value: unknown,
): value is CreatedAccountReactivationState {
  if (!isRecord(value)) return false

  return (
    (value.status === 'PENDING_VERIFICATION' || value.status === 'SETTING_UP_CREDENTIALS') &&
    isNullableString(value.code_expiry_time)
  )
}

function isDeactivateEmployeeAccountResponse(
  value: unknown,
): value is DeactivateEmployeeAccountResponse {
  if (!isRecord(value)) return false

  return (
    value.deactivated === true &&
    typeof value.employee_id === 'string' &&
    value.employee_status === 'INACTIVE'
  )
}

function isStartEmployeeReactivationResponse(
  value: unknown,
): value is StartEmployeeReactivationResponse {
  if (!isRecord(value)) return false

  return (
    value.reactivation_created === true &&
    typeof value.employee_id === 'string' &&
    typeof value.reactivation_id === 'string' &&
    typeof value.reactivation_code === 'string' &&
    value.reactivation_status === 'PENDING_VERIFICATION' &&
    typeof value.code_expires_at === 'string'
  )
}

function unexpectedResponse(): never {
  throw new EmployeeAccountsRequestError(
    'The backend returned employee account information in an unexpected format.',
    { kind: 'unexpected-response' },
  )
}

async function requestOwnerAccountData(
  path: string,
  method: 'GET' | 'POST' = 'GET',
): Promise<unknown> {
  const session = loadEmployeeSession()

  if (!session || session.role !== 'OWNER') {
    throw new EmployeeAccountsRequestError('An active owner session is required.', { status: 401 })
  }

  let response: Response

  try {
    response = await fetch(`${EMPLOYEE_ACCOUNTS_BASE_URL}${path}`, {
      method,
      credentials: 'include',
    })
  } catch {
    throw new EmployeeAccountsRequestError(
      'The backend could not be reached. Check your connection and try again.',
      { kind: 'network' },
    )
  }

  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    if (response.ok) unexpectedResponse()
  }

  if (!response.ok) {
    if (response.status === 401) clearStoredEmployeeSession()
    throw new EmployeeAccountsRequestError(
      getManagementErrorMessage(response.status, payload),
      { status: response.status },
    )
  }

  return payload
}

export async function createEmployeeAccount(
  account: CreateEmployeeAccountRequest,
): Promise<CreateEmployeeAccountResponse> {
  const session = loadEmployeeSession()

  if (!session || session.role !== 'OWNER') {
    throw new Error('An active owner session is required.')
  }

  const response = await fetch(`${EMPLOYEE_ACCOUNTS_BASE_URL}/owner/createAccount`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(account),
  })

  if (!response.ok) {
    if (response.status === 401) clearStoredEmployeeSession()
    let payload: unknown = null

    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    throw new Error(getErrorMessage(response.status, payload))
  }

  return response.json() as Promise<CreateEmployeeAccountResponse>
}

export async function loadCreatedEmployeeAccounts(): Promise<CreatedAccountListItem[]> {
  const payload = await requestOwnerAccountData('/owner/accounts/created')

  if (!Array.isArray(payload) || !payload.every(isCreatedAccount)) {
    unexpectedResponse()
  }

  return payload
}

export async function loadPendingEmployeeAccounts(): Promise<PendingAccountListItem[]> {
  const payload = await requestOwnerAccountData('/owner/accounts/pending')

  if (!Array.isArray(payload) || !payload.every(isPendingAccount)) {
    unexpectedResponse()
  }

  return payload
}

export async function loadCreatedEmployeeProfile(
  employeeId: string,
): Promise<CreatedAccountProfileResponse> {
  const payload = await requestOwnerAccountData(
    `/owner/accounts/created/${encodeURIComponent(employeeId)}`,
  )

  if (!isRecord(payload) || !isCreatedAccount(payload.account)) {
    unexpectedResponse()
  }

  if (
    payload.reactivation !== null &&
    !isCreatedAccountReactivationState(payload.reactivation)
  ) {
    unexpectedResponse()
  }

  return {
    account: payload.account,
    reactivation: payload.reactivation,
  }
}

export async function loadPendingEmployeeProfile(
  accountId: string,
): Promise<PendingAccountProfileResponse> {
  const payload = await requestOwnerAccountData(
    `/owner/accounts/pending/${encodeURIComponent(accountId)}`,
  )

  if (!isRecord(payload) || !isPendingAccountProfile(payload.account)) {
    unexpectedResponse()
  }

  return { account: payload.account }
}

export async function deactivateEmployeeAccount(
  employeeId: string,
): Promise<DeactivateEmployeeAccountResponse> {
  const normalizedEmployeeId = employeeId.trim()

  if (!normalizedEmployeeId) {
    throw new EmployeeAccountsRequestError('A valid employee ID is required.', { status: 400 })
  }

  const payload = await requestOwnerAccountData(
    `/owner/account/deactivate?employee_id=${encodeURIComponent(normalizedEmployeeId)}`,
    'POST',
  )

  if (!isDeactivateEmployeeAccountResponse(payload)) {
    unexpectedResponse()
  }

  return payload
}

export async function startEmployeeReactivation(
  employeeId: string,
): Promise<StartEmployeeReactivationResponse> {
  const normalizedEmployeeId = employeeId.trim()

  if (!normalizedEmployeeId) {
    throw new EmployeeAccountsRequestError('A valid employee ID is required.', { status: 400 })
  }

  const payload = await requestOwnerAccountData(
    `/owner/account/reactivation/start?employee_id=${encodeURIComponent(normalizedEmployeeId)}`,
    'POST',
  )

  if (!isStartEmployeeReactivationResponse(payload)) {
    unexpectedResponse()
  }

  return payload
}
