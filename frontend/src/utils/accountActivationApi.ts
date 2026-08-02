export type ActivateEmployeeAccountRequest = {
  name: string
  phone_number: string
  activation_code: string
}

type VerifiedEmployeeAccountResponse = {
  verified: true
  setup_token: string
  setup_token_expires_at: string
}

export type ActivateEmployeeAccountResponse =
  | (VerifiedEmployeeAccountResponse & {
      flow: 'ACTIVATION'
    })
  | (VerifiedEmployeeAccountResponse & {
      flow: 'REACTIVATION'
      reactivation_id: string
    })

export type WorkingHoursInterval = {
  day_of_week: number
  start_minute: number
  end_minute: number
  working_status: true
}

export type AddEmployeeCredentialsRequest = {
  old_username: string
  old_phone_number: string
  new_username: string
  new_phone_number: string
  new_password: string
  password_confirmation: string
  setup_token: string
  working_hours: WorkingHoursInterval[]
}

export type AddEmployeeCredentialsResponse = {
  activated: true
  working_hours_saved: true
}

export type RenewEmployeePasswordRequest = {
  reactivation_id: string
  setup_token: string
  new_password: string
  password_confirmation: string
}

export type RenewEmployeePasswordResponse = {
  reactivated: true
  employee_id: string
  employee_status: 'ACTIVE'
  reactivation_status: 'COMPLETED'
}

const ACCOUNT_ACTIVATION_BASE_URL = 'https://clinic-auth.vercel.app'

export class AccountActivationRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AccountActivationRequestError'
    this.status = status
  }
}

function getFallbackMessage(status: number) {
  if (status === 400) return 'The submitted account details are invalid.'
  if (status === 401) return 'The activation details or temporary setup token are invalid or expired.'
  if (status === 404) return 'The employee account could not be found.'
  if (status === 409) return 'The selected username and phone number are already in use.'
  if (status === 422) return 'Some required account information is missing or invalid.'
  if (status === 429) return 'Too many incorrect attempts. Ask the clinic owner for a new code.'
  return 'The account setup request could not be completed.'
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = getFallbackMessage(response.status)

    try {
      const payload = await response.json() as { detail?: unknown }

      if (typeof payload.detail === 'string') {
        message = payload.detail
      } else if (Array.isArray(payload.detail)) {
        const validationMessages = payload.detail
          .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : ''))
          .filter(Boolean)

        if (validationMessages.length > 0) {
          message = validationMessages.join('. ')
        }
      }
    } catch {
      // Use the status-specific fallback when the backend does not return JSON.
    }

    throw new AccountActivationRequestError(response.status, message)
  }

  return response.json() as Promise<T>
}

export async function activateEmployeeAccount(
  request: ActivateEmployeeAccountRequest,
): Promise<ActivateEmployeeAccountResponse> {
  const response = await fetch(`${ACCOUNT_ACTIVATION_BASE_URL}/employee/account/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return readResponse<ActivateEmployeeAccountResponse>(response)
}

export async function addEmployeeCredentials(
  request: AddEmployeeCredentialsRequest,
): Promise<AddEmployeeCredentialsResponse> {
  const response = await fetch(`${ACCOUNT_ACTIVATION_BASE_URL}/employee/account/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return readResponse<AddEmployeeCredentialsResponse>(response)
}

export async function renewEmployeePassword(
  request: RenewEmployeePasswordRequest,
): Promise<RenewEmployeePasswordResponse> {
  const response = await fetch(`${ACCOUNT_ACTIVATION_BASE_URL}/employee/account/reactivation/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return readResponse<RenewEmployeePasswordResponse>(response)
}
