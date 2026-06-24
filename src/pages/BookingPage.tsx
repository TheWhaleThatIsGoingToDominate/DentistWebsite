import { FormEvent, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2 } from 'lucide-react'
import Header from '../components/Header'
import { Button, SectionTitle } from '../components/ui'
import { clinic, treatments } from '../data/clinic'
import { useSchedule } from '../context/ScheduleContext'

const today = new Date().toISOString().slice(0, 10)

export default function BookingPage() {
  const { getSlotsForDate, updateSlotStatus } = useSchedule()
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState('')

  const slots = useMemo(() => getSlotsForDate(selectedDate), [getSlotsForDate, selectedDate])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedSlot) {
      setSubmittedMessage('Please choose an available appointment slot.')
      return
    }

    updateSlotStatus(selectedDate, selectedSlot, 'booked')
    setSubmittedMessage('Appointment request saved locally for demo.')
    setSelectedSlot('')
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5faf9] pt-[76px]">
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <SectionTitle
              eyebrow="Online booking"
              title="Choose a convenient appointment"
              text="Select a service, date, and available time. This demo saves booking state in the browser until a backend is connected."
            />
            <div className="mt-8 rounded-2xl bg-ink p-6 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-gold-300">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-2xl">{clinic.name}</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">{clinic.address}</p>
                  <p className="mt-4 text-sm font-bold text-white/85">{clinic.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[1.5rem] bg-white p-6 shadow-soft sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="form-label">
                Name
                <input className="form-input" name="name" type="text" placeholder="Your full name" required />
              </label>
              <label className="form-label">
                Phone number
                <input className="form-input" name="phone" type="tel" placeholder="+971 ..." required />
              </label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="form-label">
                Service
                <select className="form-input" name="service" required defaultValue="">
                  <option value="" disabled>Select a service</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.title} value={treatment.title}>{treatment.title}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Date
                <input
                  className="form-input"
                  type="date"
                  value={selectedDate}
                  min={today}
                  onChange={(event) => {
                    setSelectedDate(event.target.value)
                    setSelectedSlot('')
                    setSubmittedMessage('')
                  }}
                  required
                />
              </label>
            </div>

            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-extrabold text-ink">Appointment time</legend>
              {slots.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const disabled = slot.status !== 'available'
                    const selected = selectedSlot === slot.time
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedSlot(slot.time)
                          setSubmittedMessage('')
                        }}
                        className={`min-h-14 rounded-xl border px-3 text-sm font-bold transition ${
                          selected
                            ? 'border-ink bg-ink text-white'
                            : slot.status === 'available'
                              ? 'border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-500 hover:bg-white'
                              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                      >
                        <span className="block">{slot.time}</span>
                        <span className="text-[11px] capitalize">{slot.status}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No demo slots generated for this date yet.
                </p>
              )}
            </fieldset>

            <label className="form-label mt-7">
              Notes <span className="font-normal text-slate-400">(optional)</span>
              <textarea className="form-input min-h-28 resize-none" name="notes" placeholder="Anything you would like us to know?" />
            </label>

            <button type="submit" className="mt-6 min-h-12 w-full rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700">
              Submit booking request
            </button>

            {submittedMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
                <CheckCircle2 className="h-4 w-4" />
                {submittedMessage}
              </div>
            )}

            <Button href="/" variant="secondary" className="mt-4 w-full">Back to website</Button>
          </form>
        </section>
      </main>
    </>
  )
}

