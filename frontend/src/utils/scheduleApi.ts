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

type PublicBookingSlot = {
  time: string
}

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
  phone_number: string
  service: string
  date: string
  appointment_time: string
  notes?: string
}

type BackendBookingRecord = {
  name: string
  'phone number'?: string
  phone_number?: string
  service: string
  date: string
  'appointment time'?: string
  appointment_time?: string
  notes?: string
}

export type SaveBookingRequest = BookingRecord

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

export async function loadPublicBookingSlotsFromBackend(date: string): Promise<LoadSlotsResponse> {
  const searchParams = new URLSearchParams({ date })
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/booking/slots?${searchParams.toString()}`, {
    method: 'GET',
  })

  const slots = await readJsonResponse<PublicBookingSlot[]>(response)
  return slots.map((slot) => ({ time: slot.time, status: 'available' }))
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

export async function fetchBookingsFromBackend(date: string): Promise<BookingRecord[]> {
  const searchParams = new URLSearchParams({ date })
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/loadBooking?${searchParams.toString()}`, {
    method: 'GET',
  })

  const bookings = await readJsonResponse<BackendBookingRecord[]>(response)

  return bookings.map((booking) => ({
    name: booking.name,
    phone_number: booking.phone_number ?? booking['phone number'] ?? '',
    service: booking.service,
    date: booking.date,
    appointment_time: booking.appointment_time ?? booking['appointment time'] ?? '',
    notes: booking.notes,
  }))
}

export async function saveBookingToBackend(
  requestData: SaveBookingRequest,
): Promise<unknown> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/booking/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  return readJsonResponse<unknown>(response)
}
