import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { LockKeyhole, RefreshCw, Save } from 'lucide-react'
import { AppointmentSlot, useSchedule } from '../context/ScheduleContext'
import { checkEmployeeAccessKey } from '../utils/employeeAccess'
import {
  BookingRecord,
  fetchBookingsFromBackend,
  generateSlotsFromBackend,
  loadSlotsFromBackend,
  saveSlotsToBackend,
  updateSlotStatusInBackend,
} from '../utils/scheduleApi'
import { treatments } from '../data/clinic'
import { getEgyptDateInputValue } from '../utils/date'

const today = getEgyptDateInputValue()

type AdminSection = 'slots' | 'bookings'

function timeToMinutes(time: string) {
  const twelveHourMatch = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
  if (twelveHourMatch) {
    const [, rawHours, rawMinutes, period] = twelveHourMatch
    const hours = Number(rawHours)
    const minutes = Number(rawMinutes)
    const normalizedHours = (hours % 12) + (period.toUpperCase() === 'PM' ? 12 : 0)
    return normalizedHours * 60 + minutes
  }

  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
    
function minutesToTime(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  return `${hours12.toString().padStart(2, '0')}:${minutes} ${period}`
}

const timeOptions = Array.from({ length: 48 }, (_, index) => minutesToTime(index * 30))

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="form-label">
      {label}
      <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {timeOptions.map((time) => (
          <option key={time} value={time}>{time}</option>
        ))}
      </select>
    </label>
  )
}

function generateSlots(startTime: string, endTime: string, slotLength: number): AppointmentSlot[] {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  if (end <= start) {
    return []
  }

  const slots: AppointmentSlot[] = []
  for (let minutes = start; minutes + slotLength <= end; minutes += slotLength) {
    slots.push({ time: minutesToTime(minutes), status: 'available' })
  }
  return slots
}

export default function EmployeeAdminPage() {
  const { getSlotsForDate, setSlotsForDate, updateSlotForDate, updateSlotStatus } = useSchedule()
  const [hasAccess, setHasAccess] = useState(false)
  const [accessKey, setAccessKey] = useState('')
  const [accessError, setAccessError] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00 AM')
  const [endTime, setEndTime] = useState('05:00 PM')
  const [slotLength, setSlotLength] = useState(30)
  const [saveMessage, setSaveMessage] = useState('')
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false)
  const [isSavingSlots, setIsSavingSlots] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [updatingSlotTime, setUpdatingSlotTime] = useState('')
  const [activeSection, setActiveSection] = useState<AdminSection>('slots')
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [bookingsError, setBookingsError] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingServiceFilter, setBookingServiceFilter] = useState('')
  const [bookingDateFilter, setBookingDateFilter] = useState('')

  const slots = getSlotsForDate(selectedDate)

  const filteredBookings = useMemo(() => {
    const normalizedSearch = bookingSearch.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesSearch =
        !normalizedSearch ||
        booking.name.toLowerCase().includes(normalizedSearch) ||
        booking.phone_number.toLowerCase().includes(normalizedSearch)
      const matchesService = !bookingServiceFilter || booking.service === bookingServiceFilter
      const matchesDate = !bookingDateFilter || booking.date === bookingDateFilter

      return matchesSearch && matchesService && matchesDate
    })
  }, [bookingDateFilter, bookingSearch, bookingServiceFilter, bookings])

  const loadBookings = useCallback(async () => {
    setBookingsError('')
    setIsLoadingBookings(true)

    try {
      const loadedBookings = await fetchBookingsFromBackend(bookingDateFilter || selectedDate)
      setBookings(loadedBookings)
    } catch {
      setBookings([])
      setBookingsError('Could not load bookings from backend.')
    } finally {
      setIsLoadingBookings(false)
    }
  }, [bookingDateFilter, selectedDate])

  useEffect(() => {
    if (!hasAccess) {
      return
    }

    let ignoreResponse = false

    const loadSlotsForSelectedDate = async () => {
      setSaveMessage('')
      setIsLoadingSlots(true)

      try {
        const loadedSlots = await loadSlotsFromBackend(selectedDate)
        if (!ignoreResponse) {
          setSlotsForDate(selectedDate, loadedSlots)
        }
      } catch {
        if (!ignoreResponse) {
          setSlotsForDate(selectedDate, [])
          setSaveMessage('Could not load slots for this date from backend.')
        }
      } finally {
        if (!ignoreResponse) {
          setIsLoadingSlots(false)
        }
      }
    }

    loadSlotsForSelectedDate()

    return () => {
      ignoreResponse = true
    }
  }, [hasAccess, selectedDate, setSlotsForDate])

  useEffect(() => {
    if (hasAccess && activeSection === 'bookings') {
      loadBookings()
    }
  }, [activeSection, hasAccess, loadBookings])

  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const allowed = await checkEmployeeAccessKey(accessKey)
    //mockup function for verification
    //was able to make a backend function
    if (!allowed) {
      setAccessError('Invalid access key')
      setHasAccess(false)
      return
    }

    setAccessError('')
    setHasAccess(true)
  }

  const handleGenerateSlots = async () => {
    setSaveMessage('')
    setIsGeneratingSlots(true)

    try {
      const data = await generateSlotsFromBackend({
        startTime,
        endTime,
        slotLength,
      })

      setSlotsForDate(selectedDate, data.slots)
    } catch {
      setSlotsForDate(selectedDate, generateSlots(startTime, endTime, slotLength))
      setSaveMessage('Backend is not connected yet. Generated slots locally for demo.')
    } finally {
      setIsGeneratingSlots(false)
    }
  }

  const toggleSlot = async (slot: AppointmentSlot) => {
    setSaveMessage('')
    setUpdatingSlotTime(slot.time)

    try {
      const updatedSlot = await updateSlotStatusInBackend(slot)

      if ('message' in updatedSlot) {
        setSaveMessage(updatedSlot.message)
        return
      }

      updateSlotForDate(selectedDate, updatedSlot)
    } catch {
      updateSlotStatus(
        selectedDate,
        slot.time,
        slot.status === 'available' ? 'blocked' : 'available',
      )
      setSaveMessage('Backend is not connected yet. Changed slot status locally for demo.')
    } finally {
      setUpdatingSlotTime('')
    }
  }

  const handleSaveSlots = async () => {
    setSaveMessage('')
    setIsSavingSlots(true)

    try {
      const saved = await saveSlotsToBackend({
        date: selectedDate,
        slots,
      })
      setSaveMessage(saved.saved ? `Schedule saved to backend. ${saved.count} slots saved.` : 'Schedule was not saved.')
    } catch {
      setSaveMessage('Could not save schedule to backend.')
    } finally {
      setIsSavingSlots(false)
    }
  }

  if (!hasAccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5faf9] px-5 py-10">
        <form onSubmit={handleAccessSubmit} className="w-full max-w-md rounded-[1.5rem] bg-white p-7 shadow-soft">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-gold-300">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="mt-6 font-display text-4xl text-ink">Employee access</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Enter the reception access key to manage demo appointment slots.</p>
          <label className="form-label mt-7">
            Access key
            <input
              className="form-input"
              type="password"
              value={accessKey}
              onChange={(event) => {
                setAccessKey(event.target.value)
                setAccessError('')
              }}
              placeholder="Enter access key"
              required
            />
          </label>
          <button type="submit" className="mt-5 min-h-12 w-full rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700">
            Enter
          </button>
          {accessError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {accessError}
            </p>
          )}
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5faf9] px-5 py-8 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-2 border-b border-teal-100 pb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">Reception schedule</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Employee admin</h1>
        </div>

        <div className="mt-7 grid gap-3 rounded-[1.5rem] bg-white p-2 shadow-card sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveSection('slots')}
            className={`min-h-12 rounded-[1.1rem] px-5 text-sm font-bold transition ${
              activeSection === 'slots'
                ? 'bg-ink text-white shadow-lg shadow-teal-900/10'
                : 'bg-white text-ink hover:bg-teal-50'
            }`}
          >
            Manage Available Slots
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('bookings')}
            className={`min-h-12 rounded-[1.1rem] px-5 text-sm font-bold transition ${
              activeSection === 'bookings'
                ? 'bg-ink text-white shadow-lg shadow-teal-900/10'
                : 'bg-white text-ink hover:bg-teal-50'
            }`}
          >
            Manage Bookings
          </button>
        </div>

        {activeSection === 'slots' && (
          <>
        <div className="mt-7 rounded-[1.5rem] bg-white p-6 shadow-soft">
          <div className="grid gap-5 md:grid-cols-4">
            <label className="form-label">
              Date
              <input className="form-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <TimeSelect label="Working start time" value={startTime} onChange={setStartTime} />
            <TimeSelect label="Working end time" value={endTime} onChange={setEndTime} />
            <label className="form-label">
              Slot length
              <select className="form-input" value={slotLength} onChange={(event) => setSlotLength(Number(event.target.value))}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleGenerateSlots} disabled={isGeneratingSlots} className="min-h-12 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isGeneratingSlots ? 'Generating...' : 'Generate Slots'}
            </button>
            <button
              type="button"
              onClick={handleSaveSlots}
              disabled={isSavingSlots}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-6 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSavingSlots ? 'Saving...' : 'Save'}
            </button>
          </div>

          {saveMessage && (
            <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
              {saveMessage}
            </p>
          )}
        </div>

        <div className="mt-7 rounded-[1.5rem] bg-white p-6 shadow-card">
          <h2 className="font-display text-3xl text-ink">Generated slots</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isLoadingSlots ? (
              <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Loading slots for this date...
              </p>
            ) : slots.length > 0 ? (
              slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => toggleSlot(slot)}
                  disabled={updatingSlotTime === slot.time}
                  className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold transition ${
                    slot.status === 'available'
                      ? 'border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-500'
                      : slot.status === 'blocked'
                        ? 'border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-500'
                        : 'border-gold-200 bg-gold-100 text-ink'
                  }`}
                >
                  <span>{slot.time}</span>
                  <span className="capitalize">{updatingSlotTime === slot.time ? 'updating...' : slot.status}</span>
                </button>
              ))
            ) : (
              <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No slots for this date. Generate slots to begin.
              </p>
            )}
          </div>
        </div>
          </>
        )}

        {activeSection === 'bookings' && (
          <div className="mt-7 rounded-[1.5rem] bg-white p-6 shadow-card">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-600">Patient appointments</p>
                <h2 className="mt-2 font-display text-3xl text-ink">Manage Bookings</h2>
              </div>
              <button
                type="button"
                onClick={loadBookings}
                disabled={isLoadingBookings}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingBookings ? 'animate-spin' : ''}`} />
                Refresh bookings
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="form-label">
                Search
                <input
                  className="form-input"
                  type="search"
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Name or phone number"
                />
              </label>
              <label className="form-label">
                Service
                <select
                  className="form-input"
                  value={bookingServiceFilter}
                  onChange={(event) => setBookingServiceFilter(event.target.value)}
                >
                  <option value="">All services</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.title} value={treatment.title}>
                      {treatment.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Date
                <input
                  className="form-input"
                  type="date"
                  value={bookingDateFilter}
                  onChange={(event) => setBookingDateFilter(event.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setBookingSearch('')
                  setBookingServiceFilter('')
                  setBookingDateFilter('')
                  setBookings([])
                }}
                className="min-h-12 self-end rounded-full border border-teal-200 bg-white px-5 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50"
              >
                Clear filters
              </button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
              {isLoadingBookings ? (
                <p className="px-4 py-5 text-sm text-slate-500">Loading bookings...</p>
              ) : bookingsError ? (
                <p role="alert" className="px-4 py-5 text-sm font-bold text-red-700">{bookingsError}</p>
              ) : filteredBookings.length === 0 ? (
                <p className="px-4 py-5 text-sm text-slate-500">No bookings match the current filters.</p>
              ) : (
                <table className="min-w-[860px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#f5faf9] text-xs font-extrabold uppercase tracking-[0.12em] text-teal-700">
                    <tr>
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Phone Num</th>
                      <th className="px-4 py-4">Service</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Appointment Time</th>
                      <th className="px-4 py-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {filteredBookings.map((booking) => (
                      <tr key={`${booking.phone_number}-${booking.date}-${booking.appointment_time}`} className="bg-white">
                        <td className="px-4 py-4 font-bold text-ink">{booking.name}</td>
                        <td className="px-4 py-4">{booking.phone_number}</td>
                        <td className="px-4 py-4">{booking.service}</td>
                        <td className="px-4 py-4">{booking.date}</td>
                        <td className="px-4 py-4">{booking.appointment_time}</td>
                        <td className="max-w-[260px] px-4 py-4">{booking.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
