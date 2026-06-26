import type { AppointmentSlot } from '../context/ScheduleContext'

// Set this to your backend origin if it is different from the frontend origin.
const SCHEDULE_API_BASE_URL = ''

export type GenerateSlotsRequest = {
  date: string
  // Expected format: "09:30 AM" or "05:00 PM".
  start_time: string
  // Expected format: "09:30 AM" or "05:00 PM".
  end_time: string
  slot_length_minutes: number
}

export type GenerateSlotsResponse = {
  slots: AppointmentSlot[]
}

export type SaveSlotsRequest = {
  date: string
  slots: AppointmentSlot[]
}

export type SaveSlotsResponse = {
  success: boolean
  message?: string
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Schedule API request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function generateSlotsFromBackend(
  requestData: GenerateSlotsRequest,
): Promise<GenerateSlotsResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/api/schedule/generate-slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  return readJsonResponse<GenerateSlotsResponse>(response)
}

export async function saveSlotsToBackend(
  requestData: SaveSlotsRequest,
): Promise<SaveSlotsResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/api/schedule/save-slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  return readJsonResponse<SaveSlotsResponse>(response)
}
