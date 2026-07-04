import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Home, Printer, ShieldAlert } from 'lucide-react'
import Header from '../components/Header'
import { clearBookingConfirmation, loadBookingConfirmation, type BookingConfirmationData } from '../utils/bookingConfirmation'

export default function BookingConfirmationPage() {
  const [confirmationData, setConfirmationData] = useState<BookingConfirmationData | null>(null)
  const [hasSavedCode, setHasSavedCode] = useState(false)

  useEffect(() => {
    const storedConfirmation = loadBookingConfirmation()
    setConfirmationData(storedConfirmation)

    if (storedConfirmation) {
      clearBookingConfirmation()
    }
  }, [])

  if (!confirmationData) {
    return (
      <>
        <Header />
        <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 pt-[76px]">
          <section className="w-full max-w-xl rounded-[1.5rem] bg-white p-7 text-center shadow-soft">
            <h1 className="font-display text-4xl text-ink">No booking confirmation available.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              This page is only available immediately after a booking is saved.
            </p>
            <a
              href="/booking"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
            >
              Return to booking
            </a>
          </section>
        </main>
      </>
    )
  }

  const { booking } = confirmationData

  const handleSavedCode = () => {
    setHasSavedCode(true)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5faf9] pt-[76px]">
        <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-soft sm:p-9">
            <div className="flex flex-col gap-5 border-b border-teal-100 pb-7 sm:flex-row sm:items-start">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Booking saved</p>
                <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Your appointment is confirmed</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                  Please save the cancellation code below before leaving this page.
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-gold-200 bg-[#fff9e8] p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                <p className="text-sm font-bold leading-6 text-ink">
                  Save this code. If you lose it, you may not be able to cancel your booking.
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-teal-100 bg-[#f5faf9] p-5 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Booking reference / cancellation code</p>
              <p className="mt-3 break-all font-display text-5xl text-ink">{booking.booking_code}</p>
            </div>

            <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <dt className="font-bold text-slate-400">Client name</dt>
                <dd className="mt-1 font-bold text-ink">{booking.name}</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <dt className="font-bold text-slate-400">Phone number</dt>
                <dd className="mt-1 text-ink">{booking.phone_number}</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <dt className="font-bold text-slate-400">Service</dt>
                <dd className="mt-1 text-ink">{booking.service}</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <dt className="font-bold text-slate-400">Date and time</dt>
                <dd className="mt-1 text-ink">{booking.date} at {booking.appointment_time}</dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSavedCode}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                <Copy className="h-4 w-4" />
                I saved my code
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-6 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50"
              >
                <Printer className="h-4 w-4" />
                Print confirmation
              </button>
            </div>

            {hasSavedCode && (
              <a
                href="/"
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-6 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50"
              >
                <Home className="h-4 w-4" />
                Back to home
              </a>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
