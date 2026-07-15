import type { AppointmentSlot } from '../context/ScheduleContext'
import { loadEmployeeSession } from './employeeAccess'

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

export type UpdateSlotStatusResponse = AppointmentSlot | {
  message: string
}

export type BookingRecord = {
  booking_reference?: string
  name: string
  phone_number: string
  service: string
  date: string
  appointment_time: string
  status?: BookingStatus
  notes?: string
}

export type BookingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

type BackendBookingRecord = {
  booking_reference?: string
  reference_code?: string
  name: string
  'phone number'?: string
  phone_number?: string
  service: string
  date: string
  'appointment time'?: string
  appointment_time?: string
  status?: BookingStatus
  notes?: string
}

export type SaveBookingRequest = BookingRecord

export type SaveBookingResponse = {
  saved?: boolean
  booking?: {
    name?: string
    phone?: string
    phone_number?: string
    service?: string
    date?: string
    appointment_time?: string
    booking_code?: string
    booking_reference?: string
  }
  booking_reference?: string
  reference_code?: string
  confirmation_token?: string
  message?: string
}

export type TrackBookingRequest = {
  booking_reference: string
  phone_number: string
}

export type UpdateBookingStatusRequest = {
  booking_reference: string
  status: BookingStatus
}

type ApiErrorResponse = {
  detail?: string
  message?: string
}

function getEmployeeAdminHeaders(includeJson = false) {
  const session = loadEmployeeSession()

  if (!session) {
    throw new Error('Employee session is missing. Please sign in again.')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.token}`,
    'X-Employee-Username': session.username,
    'X-Employee-Phone': session.phone_number,
  }

  if (includeJson) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

function normalizeBookingRecord(booking: BackendBookingRecord): BookingRecord {
  return {
    booking_reference: booking.booking_reference ?? booking.reference_code,
    name: booking.name,
    phone_number: booking.phone_number ?? booking['phone number'] ?? '',
    service: booking.service,
    date: booking.date,
    appointment_time: booking.appointment_time ?? booking['appointment time'] ?? '',
    status: booking.status ?? 'scheduled',
    notes: booking.notes,
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Schedule API request failed with status ${response.status}`

    try {
      const data = await response.json() as ApiErrorResponse
      errorMessage = data.detail ?? data.message ?? errorMessage
    } catch {
      // Keep the generic status message when the backend does not return JSON.
    }

    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}

export async function generateSlotsFromBackend(
  requestData: GenerateSlotsRequest,
): Promise<GenerateSlotsResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/generate`, {
    method: 'POST',
    headers: getEmployeeAdminHeaders(true),
    body: JSON.stringify(requestData),
  })

  const slots = await readJsonResponse<AppointmentSlot[]>(response)
  return { slots }
}

export async function loadSlotsFromBackend(date: string): Promise<LoadSlotsResponse> {
  const searchParams = new URLSearchParams({ date })
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/slots?${searchParams.toString()}`, {
    method: 'GET',
    headers: getEmployeeAdminHeaders(),
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
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/saveSlots`, {
    method: 'POST',
    headers: getEmployeeAdminHeaders(true),
    body: JSON.stringify(requestData),
  })

  return readJsonResponse<SaveSlotsResponse>(response)
}

export async function updateSlotStatusInBackend(
  slot: AppointmentSlot,
): Promise<UpdateSlotStatusResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/changeState`, {
    method: 'PATCH',
    headers: getEmployeeAdminHeaders(true),
    body: JSON.stringify(slot),
  })

  return readJsonResponse<UpdateSlotStatusResponse>(response)
}

export async function fetchBookingsFromBackend(search: string): Promise<BookingRecord[]> {
  const normalizedSearch = search.trim()

  if (!normalizedSearch) {
    throw new Error('Enter a patient name or phone number.')
  }

  const searchParams = new URLSearchParams(
    /^\d+$/.test(normalizedSearch)
      ? { phone_number: normalizedSearch }
      : { name: normalizedSearch },
  )
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/loadBooking?${searchParams.toString()}`, {
    method: 'GET',
    headers: getEmployeeAdminHeaders(),
  })

  const bookings = await readJsonResponse<BackendBookingRecord[]>(response)

  return bookings.map(normalizeBookingRecord)
}

export async function saveBookingToBackend(
  requestData: SaveBookingRequest,
): Promise<SaveBookingResponse> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/booking/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  return readJsonResponse<SaveBookingResponse>(response)
}

export async function trackBookingFromBackend(
  requestData: TrackBookingRequest,
): Promise<BookingRecord> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/booking/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  const booking = await readJsonResponse<BackendBookingRecord>(response)

  return normalizeBookingRecord(booking)
}

export async function cancelBookingFromBackend(
  requestData: TrackBookingRequest,
): Promise<BookingRecord | { message: string }> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/booking/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  const data = await readJsonResponse<BackendBookingRecord | { message: string }>(response)
  return 'message' in data ? data : normalizeBookingRecord(data)
}

export async function updateBookingStatusInBackend(
  requestData: UpdateBookingStatusRequest,
): Promise<BookingRecord | { message: string }> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/booking/status`, {
    method: 'PATCH',
    headers: getEmployeeAdminHeaders(true),
    body: JSON.stringify(requestData),
  })

  const data = await readJsonResponse<BackendBookingRecord | { message: string }>(response)
  return 'message' in data ? data : normalizeBookingRecord(data)
}

export async function deleteBookingInBackend(bookingReference: string): Promise<{ deleted?: boolean; message?: string }> {
  const response = await fetch(`${SCHEDULE_API_BASE_URL}/employee/admin/booking/delete`, {
    method: 'DELETE',
    headers: getEmployeeAdminHeaders(true),
    body: JSON.stringify({
      booking_reference: bookingReference,
    }),
  })

  return readJsonResponse<{ deleted?: boolean; message?: string }>(response)
}
