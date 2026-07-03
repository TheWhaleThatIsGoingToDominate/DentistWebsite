import { FormEvent, useState } from 'react'
import { AlertCircle, CalendarCheck, CheckCircle2, Search, XCircle } from 'lucide-react'
import Header from '../components/Header'
import { Button, SectionTitle } from '../components/ui'
import type { BookingRecord } from '../utils/scheduleApi'
import { cancelBookingFromBackend, trackBookingFromBackend } from '../utils/scheduleApi'

type Notice = {
  tone: 'success' | 'error'
  text: string
}

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

export default function BookingStatusPage() {
  const [bookingReference, setBookingReference] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setNotice(null)
    setBooking(null)

    try {
      const loadedBooking = await trackBookingFromBackend({
        booking_reference: bookingReference.trim(),
        phone_number: phoneNumber.trim(),
      })
      setBooking(loadedBooking)
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not find that booking.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    setNotice(null)

    try {
      const response = await cancelBookingFromBackend({
        booking_reference: bookingReference.trim(),
        phone_number: phoneNumber.trim(),
      })

      if ('message' in response) {
        setNotice({ tone: 'success', text: response.message })
        setBooking((current) => current ? { ...current, status: 'cancelled' } : current)
      } else {
        setBooking(response)
        setNotice({ tone: 'success', text: 'Booking cancelled.' })
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not cancel this booking.',
      })
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5faf9] pt-[76px]">
        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <SectionTitle
              eyebrow="Booking tracker"
              title="Find your appointment"
              text="Use your booking reference and phone number to check appointment details or cancel a future booking."
            />
            <div className="mt-8 rounded-2xl bg-ink p-6 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-gold-300">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-2xl">Keep your reference safe</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    The clinic uses it with your phone number to protect your booking from accidental changes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-6 shadow-soft sm:p-8">
            <form onSubmit={handleLookup} className="grid gap-5">
              <label className="form-label">
                Booking reference
                <input
                  className="form-input uppercase"
                  value={bookingReference}
                  onChange={(event) => {
                    setBookingReference(event.target.value)
                    setNotice(null)
                  }}
                  placeholder="AD-7K29Q"
                  required
                />
              </label>
              <label className="form-label">
                Phone number
                <input
                  className="form-input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value)
                    setNotice(null)
                  }}
                  placeholder="Phone number used for booking"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                {isLoading ? 'Searching...' : 'Find booking'}
              </button>
            </form>

            {notice && (
              <div
                className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                  notice.tone === 'success'
                    ? 'border-teal-100 bg-teal-50 text-teal-800'
                    : 'border-red-100 bg-red-50 text-red-700'
                }`}
              >
                {notice.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {notice.text}
              </div>
            )}

            {booking && (
              <div className="mt-6 rounded-2xl border border-teal-100 bg-[#f5faf9] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Appointment</p>
                    <h2 className="mt-2 font-display text-3xl text-ink">{booking.name}</h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-ink">
                    {statusLabels[booking.status ?? 'scheduled']}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-slate-400">Reference</dt>
                    <dd className="mt-1 font-bold text-ink">{booking.booking_reference ?? bookingReference}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-400">Phone</dt>
                    <dd className="mt-1 text-ink">{booking.phone_number}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-400">Service</dt>
                    <dd className="mt-1 text-ink">{booking.service}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-400">Date and time</dt>
                    <dd className="mt-1 text-ink">{booking.date} at {booking.appointment_time}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-bold text-slate-400">Notes</dt>
                    <dd className="mt-1 text-ink">{booking.notes || 'No notes added.'}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling || booking.status === 'cancelled' || booking.status === 'completed'}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-red-100 bg-white px-5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {isCancelling ? 'Cancelling...' : 'Cancel booking'}
                </button>
              </div>
            )}

            <Button href="/booking" variant="secondary" className="mt-5 w-full">Book another appointment</Button>
          </div>
        </section>
      </main>
    </>
  )
}
