import { FormEvent, useState } from 'react'
import { LockKeyhole, Save } from 'lucide-react'
import { AppointmentSlot, SlotStatus, useSchedule } from '../context/ScheduleContext'
import { checkEmployeeAccessKey } from '../utils/employeeAccess'

const today = new Date().toISOString().slice(0, 10)

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
    
function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
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
  const { getSlotsForDate, setSlotsForDate, updateSlotStatus } = useSchedule()
  const [hasAccess, setHasAccess] = useState(false)
  const [accessKey, setAccessKey] = useState('')
  const [accessError, setAccessError] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [slotLength, setSlotLength] = useState(30)
  const [saveMessage, setSaveMessage] = useState('')

  const slots = getSlotsForDate(selectedDate)

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

  const handleGenerateSlots = () => {
    setSlotsForDate(selectedDate, generateSlots(startTime, endTime, slotLength))
    setSaveMessage('')
  }

  const toggleSlot = (time: string, status: SlotStatus) => {
    updateSlotStatus(selectedDate, time, status === 'available' ? 'blocked' : 'available')
    setSaveMessage('')
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

        <div className="mt-7 rounded-[1.5rem] bg-white p-6 shadow-soft">
          <div className="grid gap-5 md:grid-cols-4">
            <label className="form-label">
              Date
              <input className="form-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <label className="form-label">
              Working start time
              <input className="form-input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label className="form-label">
              Working end time
              <input className="form-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
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
            <button type="button" onClick={handleGenerateSlots} className="min-h-12 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700">
              Generate Slots
            </button>
            <button
              type="button"
              onClick={() => setSaveMessage('Schedule saved locally for demo.')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-6 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50"
            >
              <Save className="h-4 w-4" />
              Save
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
            {slots.length > 0 ? (
              slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => toggleSlot(slot.time, slot.status)}
                  className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold transition ${
                    slot.status === 'available'
                      ? 'border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-500'
                      : slot.status === 'blocked'
                        ? 'border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-500'
                        : 'border-gold-200 bg-gold-100 text-ink'
                  }`}
                >
                  <span>{slot.time}</span>
                  <span className="capitalize">{slot.status}</span>
                </button>
              ))
            ) : (
              <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No slots for this date. Generate slots to begin.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
