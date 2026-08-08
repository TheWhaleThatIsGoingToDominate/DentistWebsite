export type EmployeeLoginCredentials = {
  username: string
  phone_number: string
  password: string
  tokenDuration: number
}

export type EmployeeRole = 'DOCTOR' | 'OWNER' | 'RECEPTIONIST' | 'MANAGER'

export type EmployeeAuthenticationResponse = {
  allowed: true
  expires_at: string
  role: EmployeeRole
}

export type EmployeeSession = {
  username: string
  phone_number: string
  expires_at: string
  role: EmployeeRole
}

export type EmployeeIdentityVerificationRequest = {
  username: string
  phone_number: string
}

export type EmployeeIdentityVerificationResponse = {
  username_format_valid: boolean
  phone_number_format_valid: boolean
  matched_employee: boolean
}

const EMPLOYEE_AUTH_BASE_URL = 'https://clinic-auth.vercel.app'
const EMPLOYEE_SESSION_STORAGE_KEY = 'aurora-employee-session'

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage
}

function isEmployeeSession(value: unknown): value is EmployeeSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const session = value as Partial<EmployeeSession>
  return (
    typeof session.username === 'string' &&
    typeof session.phone_number === 'string' &&
    typeof session.expires_at === 'string' &&
    !Number.isNaN(Date.parse(session.expires_at)) &&
    isEmployeeRole(session.role)
  )
}

function isEmployeeAuthenticationResponse(value: unknown): value is EmployeeAuthenticationResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const response = value as Partial<EmployeeAuthenticationResponse>
  return (
    response.allowed === true &&
    typeof response.expires_at === 'string' &&
    !Number.isNaN(Date.parse(response.expires_at)) &&
    isEmployeeRole(response.role)
  )
}

export function isEmployeeRole(value: unknown): value is EmployeeRole {
  return value === 'DOCTOR' || value === 'OWNER' || value === 'RECEPTIONIST' || value === 'MANAGER'
}

async function readEmployeeAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error('Employee authentication request failed')
  }

  return response.json() as Promise<T>
}

export async function verifyEmployeeIdentity(
  credentials: EmployeeIdentityVerificationRequest,
): Promise<EmployeeIdentityVerificationResponse> {
  const response = await fetch(`${EMPLOYEE_AUTH_BASE_URL}/employee/verify-details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  return readEmployeeAuthResponse<EmployeeIdentityVerificationResponse>(response)
}

export async function authenticateEmployeeAccess(
  credentials: EmployeeLoginCredentials,
): Promise<EmployeeAuthenticationResponse | null> {
  const response = await fetch(`${EMPLOYEE_AUTH_BASE_URL}/employee/auth`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: credentials.username,
      phone_number: credentials.phone_number,
      password: credentials.password,
      valid_time: credentials.tokenDuration,
    }),
  })

  if (response.status === 401 || response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Employee authentication request failed')
  }

  const payload: unknown = await response.json()
  if (!isEmployeeAuthenticationResponse(payload)) {
    throw new Error('The backend returned an invalid employee authentication response')
  }

  return payload
}

export async function checkEmployeeAccessKey(credentials: EmployeeLoginCredentials) {
  const data = await authenticateEmployeeAccess(credentials)
  return data?.allowed === true
}

export function saveEmployeeSession(session: EmployeeSession) {
  const storage = getSessionStorage()
  storage?.setItem(EMPLOYEE_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function loadEmployeeSession() {
  const storage = getSessionStorage()
  const rawSession = storage?.getItem(EMPLOYEE_SESSION_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    const parsedSession = JSON.parse(rawSession)
    if (!isEmployeeSession(parsedSession)) {
      storage?.removeItem(EMPLOYEE_SESSION_STORAGE_KEY)
      return null
    }

    const safeSession: EmployeeSession = {
      username: parsedSession.username,
      phone_number: parsedSession.phone_number,
      expires_at: parsedSession.expires_at,
      role: parsedSession.role,
    }
    const safeKeys = new Set(['username', 'phone_number', 'expires_at', 'role'])

    if (Object.keys(parsedSession).some((key) => !safeKeys.has(key))) {
      storage?.setItem(EMPLOYEE_SESSION_STORAGE_KEY, JSON.stringify(safeSession))
    }

    return safeSession
  } catch {
    storage?.removeItem(EMPLOYEE_SESSION_STORAGE_KEY)
    return null
  }
}

export function clearStoredEmployeeSession() {
  const storage = getSessionStorage()
  storage?.removeItem(EMPLOYEE_SESSION_STORAGE_KEY)
}

export async function clearEmployeeSessionInBackend(
  options: { keepalive?: boolean } = {},
) {
  try {
    const response = await fetch(`${EMPLOYEE_AUTH_BASE_URL}/employee/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      keepalive: options.keepalive,
    })

    return response.ok
  } catch {
    return false
  }
}

