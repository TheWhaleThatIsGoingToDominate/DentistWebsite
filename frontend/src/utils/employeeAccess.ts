export type EmployeeLoginCredentials = {
  username: string
  phone_number: string
  password: string
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

export async function checkEmployeeAccessKey(credentials: EmployeeLoginCredentials) {
  const response = await fetch(`${EMPLOYEE_AUTH_BASE_URL}/employee/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  return data.allowed === true
}

