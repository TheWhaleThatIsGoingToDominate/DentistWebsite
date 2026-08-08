import {
  clearStoredEmployeeSession,
  isEmployeeRole,
  loadEmployeeSession,
  type EmployeeRole,
} from './employeeAccess'

export type EmployeeProfileRole = EmployeeRole

export type EmployeeProfile = {
  employee_id: string
  username: string
  phone_number: string
  role: EmployeeProfileRole
  is_active: boolean
}

export type EmployeeWorkingHour = {
  employee_id: string
  day_of_week: number
  start_minute: number
  end_minute: number
  working_status: boolean
}

export type EmployeeProfileResponse = {
  profile: EmployeeProfile
  working_hours: EmployeeWorkingHour[]
}

const EMPLOYEE_PROFILE_BASE_URL = 'https://clinic-auth.vercel.app'
const FORBIDDEN_RESPONSE_KEYS = [
  'password',
  'hash',
  'salt',
  'lookup',
  'token',
  'activation_code',
  'reactivation_code',
]

export class EmployeeProfileRequestError extends Error {
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
    this.name = 'EmployeeProfileRequestError'
    this.status = options.status ?? null
    this.kind = options.kind ?? 'request'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key))
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey)
  if (!isRecord(value)) return false

  return Object.entries(value).some(([key, child]) => {
    const normalizedKey = key.toLowerCase()
    return (
      FORBIDDEN_RESPONSE_KEYS.some((forbiddenKey) => normalizedKey.includes(forbiddenKey)) ||
      containsForbiddenKey(child)
    )
  })
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isEmployeeProfile(value: unknown): value is EmployeeProfile {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['employee_id', 'username', 'phone_number', 'role', 'is_active'])) {
    return false
  }

  return (
    isNonEmptyString(value.employee_id) &&
    isNonEmptyString(value.username) &&
    isNonEmptyString(value.phone_number) &&
    isEmployeeRole(value.role) &&
    typeof value.is_active === 'boolean'
  )
}

function isEmployeeWorkingHour(
  value: unknown,
  employeeId: string,
): value is EmployeeWorkingHour {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, [
    'employee_id',
    'day_of_week',
    'start_minute',
    'end_minute',
    'working_status',
  ])) {
    return false
  }

  return (
    value.employee_id === employeeId &&
    Number.isInteger(value.day_of_week) &&
    Number(value.day_of_week) >= 0 &&
    Number(value.day_of_week) <= 6 &&
    Number.isInteger(value.start_minute) &&
    Number(value.start_minute) >= 0 &&
    Number(value.start_minute) <= 1439 &&
    Number.isInteger(value.end_minute) &&
    Number(value.end_minute) >= 1 &&
    Number(value.end_minute) <= 1440 &&
    Number(value.start_minute) < Number(value.end_minute) &&
    typeof value.working_status === 'boolean'
  )
}

function isEmployeeProfileResponse(value: unknown): value is EmployeeProfileResponse {
  if (!isRecord(value) || containsForbiddenKey(value)) return false
  if (!hasOnlyKeys(value, ['profile', 'working_hours'])) return false
  const profile = value.profile
  const workingHours = value.working_hours
  if (!isEmployeeProfile(profile) || !Array.isArray(workingHours)) return false

  if (!workingHours.every((hour) => isEmployeeWorkingHour(hour, profile.employee_id))) {
    return false
  }

  return profile.role !== 'OWNER' || workingHours.length === 0
}

function getErrorMessage(status: number, payload: unknown) {
  if (isRecord(payload) && typeof payload.detail === 'string') {
    return payload.detail
  }

  if (status === 401) return 'Your employee session has expired. Sign in again to continue.'
  if (status === 404) return 'Your profile or working-hours information could not be found.'
  if (status === 400 || status === 422) return 'The profile request is invalid.'
  return 'Your profile could not be loaded.'
}

function unexpectedResponse(): never {
  throw new EmployeeProfileRequestError(
    'The backend returned profile information in an unexpected format.',
    { kind: 'unexpected-response' },
  )
}

export async function loadCurrentEmployeeProfile(): Promise<EmployeeProfileResponse> {
  const session = loadEmployeeSession()

  if (!session) {
    throw new EmployeeProfileRequestError('An active employee session is required.', {
      status: 401,
    })
  }

  let response: Response

  try {
    response = await fetch(`${EMPLOYEE_PROFILE_BASE_URL}/employee/admin/employee/profile`, {
      method: 'GET',
      credentials: 'include',
    })
  } catch {
    throw new EmployeeProfileRequestError(
      'The backend could not be reached. Check your connection and try again.',
      { kind: 'network' },
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    if (response.ok) unexpectedResponse()
    payload = null
  }

  if (!response.ok) {
    if (response.status === 401) clearStoredEmployeeSession()
    throw new EmployeeProfileRequestError(getErrorMessage(response.status, payload), {
      status: response.status,
    })
  }

  if (!isEmployeeProfileResponse(payload)) unexpectedResponse()
  return payload
}
