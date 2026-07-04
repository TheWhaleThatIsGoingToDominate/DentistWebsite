import type { SaveBookingResponse } from './scheduleApi'

export const BOOKING_CONFIRMATION_STORAGE_KEY = 'aurora-booking-confirmation'

export type BookingConfirmationData = {
  confirmation_token: string
  booking: {
    name: string
    phone_number: string
    service: string
    date: string
    appointment_time: string
    booking_code: string
  }
}

type BookingFormData = {
  name: string
  phone_number: string
  service: string
  date: string
  appointment_time: string
}

export function createBookingConfirmationData(
  formData: BookingFormData,
  response: SaveBookingResponse,
): BookingConfirmationData | null {
  const backendBooking = response.booking
  const bookingCode = backendBooking?.booking_code
    ?? backendBooking?.booking_reference
    ?? response.booking_reference
    ?? response.reference_code

  if (!bookingCode) {
    return null
  }

  return {
    confirmation_token: response.confirmation_token ?? crypto.randomUUID(),
    booking: {
      name: backendBooking?.name ?? formData.name,
      phone_number: backendBooking?.phone_number ?? backendBooking?.phone ?? formData.phone_number,
      service: backendBooking?.service ?? formData.service,
      date: backendBooking?.date ?? formData.date,
      appointment_time: backendBooking?.appointment_time ?? formData.appointment_time,
      booking_code: bookingCode,
    },
  }
}

export function saveBookingConfirmation(data: BookingConfirmationData) {
  window.sessionStorage.setItem(BOOKING_CONFIRMATION_STORAGE_KEY, JSON.stringify(data))
}

export function loadBookingConfirmation() {
  const storedData = window.sessionStorage.getItem(BOOKING_CONFIRMATION_STORAGE_KEY)

  if (!storedData) {
    return null
  }

  try {
    const parsedData = JSON.parse(storedData) as BookingConfirmationData
    return parsedData.confirmation_token && parsedData.booking?.booking_code ? parsedData : null
  } catch {
    return null
  }
}

export function clearBookingConfirmation() {
  window.sessionStorage.removeItem(BOOKING_CONFIRMATION_STORAGE_KEY)
}
