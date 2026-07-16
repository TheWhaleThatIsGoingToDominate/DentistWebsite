export type EmployeeLoginCredentials = {
  username: string
  phone_number: string
  password: string
  tokenDuration: number
}

export type EmployeeRole = 'DOCTOR' | 'OWNER' | 'RECEPTIONIST' | 'MANAGER'

export type EmployeeAuthenticationResponse = {
  allowed?: boolean
  token?: string
  expires_at?: string
  role?: EmployeeRole
}

export type EmployeeSession = {
  username: string
  phone_number: string
  token: string
  tokenDuration: number
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
    typeof session.token === 'string' &&
    typeof session.tokenDuration === 'number' &&
    typeof session.expires_at === 'string' &&
    !Number.isNaN(Date.parse(session.expires_at)) &&
    isEmployeeRole(session.role)
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...credentials,
      valid_time: credentials.tokenDuration,
    }),
  })

  if (response.status === 401 || response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Employee authentication request failed')
  }

  return response.json() as Promise<EmployeeAuthenticationResponse>
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
    return isEmployeeSession(parsedSession) ? parsedSession : null
  } catch {
    return null
  }
}

export function clearStoredEmployeeSession() {
  const storage = getSessionStorage()
  storage?.removeItem(EMPLOYEE_SESSION_STORAGE_KEY)
}

export async function clearEmployeeSessionInBackend(
  session: EmployeeSession,
  options: { keepalive?: boolean } = {},
) {
  try {
    const response = await fetch(`${EMPLOYEE_AUTH_BASE_URL}/employee/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: session.username,
        phone_number: session.phone_number,
        token: session.token,
      }),
      keepalive: options.keepalive,
    })

    return response.ok
  } catch {
    return false
  }
}

