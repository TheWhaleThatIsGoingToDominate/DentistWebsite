import type { AppointmentSlot } from '../context/ScheduleContext'

// Set this to your backend origin if it is different from the frontend origin.
const SCHEDULE_API_BASE_URL = 'https://clinic-auth.vercel.app'

export type GenerateSlotsRequest = {
  // Expected format: "09:30 AM" or "05:00 PM".
  startTime: string
  // Expected format: "09:30 AM" or "05:00 PM".
  endTime: string
  slotLength: number
}

export type GenerateSlotsResponse = {
  slots: AppointmentSlot[]
}

export type LoadSlotsResponse = AppointmentSlot[]

export type SaveSlotsRequest = {
  date: string
  slots: AppointmentSlot[]
}

export type SaveSlotsResponse = {
  saved: boolean
  count: number
}

export type UpdateSlotStatusResponse = AppointmentSlot

export type BookingRecord = {
  name: string
  phone_num: string
  service: string
  date: string
  appointment_time: string
  notes?: string
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
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  const slots = await readJsonResponse<AppointmentSlot[]>(response)
  return { slots }
}

export async function loadSlotsFromBackend(date: string): Promise<LoadSlotsResponse> {
  const searchParams = new URLSearchParams({ date })
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/slots?${searchParams.toString()}`, {
    method: 'GET',
  })

  return readJsonResponse<LoadSlotsResponse>(response)
}

export async function saveSlotsToBackend(
  requestData: SaveSlotsRequest,
): Promise<SaveSlotsResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/saveSlots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  return readJsonResponse<SaveSlotsResponse>(response)
}

export async function updateSlotStatusInBackend(
  slot: AppointmentSlot,
): Promise<UpdateSlotStatusResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/changeState`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(slot),
  })

  return readJsonResponse<UpdateSlotStatusResponse>(response)
}

export async function fetchBookingsFromBackend(): Promise<BookingRecord[]> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/bookings`, {
    method: 'GET',
  })

  return readJsonResponse<BookingRecord[]>(response)
}
