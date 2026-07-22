import { loadEmployeeSession } from './employeeAccess'

export type EmployeeAccountRole = 'RECEPTIONIST' | 'MANAGER' | 'DOCTOR'

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

const EMPLOYEE_ACCOUNTS_BASE_URL = 'https://clinic-auth.vercel.app'

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

export async function createEmployeeAccount(
  account: CreateEmployeeAccountRequest,
): Promise<CreateEmployeeAccountResponse> {
  const session = loadEmployeeSession()

  if (!session || session.role !== 'OWNER') {
    throw new Error('An active owner session is required.')
  }

  const response = await fetch(`${EMPLOYEE_ACCOUNTS_BASE_URL}/owner/createAccount`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-Employee-Username': session.username,
      'X-Employee-Phone': session.phone_number,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(account),
  })

  if (!response.ok) {
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
