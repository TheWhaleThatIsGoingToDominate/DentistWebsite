import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, RefreshCw, Save } from 'lucide-react'
import { AppointmentSlot, useSchedule } from '../context/ScheduleContext'
import {
  EmployeeAuthenticationResponse,
  EmployeeIdentityVerificationResponse,
  authenticateEmployeeAccess,
  clearEmployeeSessionInBackend,
  clearStoredEmployeeSession,
  isEmployeeRole,
  loadEmployeeSession,
  saveEmployeeSession,
  verifyEmployeeIdentity,
} from '../utils/employeeAccess'
import {
  BookingRecord,
  BookingStatus,
  deleteBookingInBackend,
  fetchBookingsFromBackend,
  generateSlotsFromBackend,
  loadSlotsFromBackend,
  saveSlotsToBackend,
  updateBookingStatusInBackend,
  updateSlotStatusInBackend,
} from '../utils/scheduleApi'
import { treatments } from '../data/clinic'
import { getEgyptDateInputValue } from '../utils/date'

const today = getEgyptDateInputValue()

type AdminSection = 'slots' | 'bookings'
type PasswordVerificationStatus = 'idle' | 'checking' | 'verified' | 'incorrect' | 'error'

const bookingStatuses: BookingStatus[] = ['scheduled', 'completed', 'cancelled', 'no_show']

const bookingStatusLabels: Record<BookingStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

const employeePhonePattern = /^01\d{9}$/
const sessionDurationOptions = [
  { label: '1m', value: 1 },
  { label: '0.5h', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
]

function FieldStatus({
  tone,
  message,
  isLoading = false,
}: {
  tone: 'success' | 'error' | 'neutral'
  message: string
  isLoading?: boolean
}) {
  const toneClasses = {
    success: 'text-teal-700',
    error: 'text-red-700',
    neutral: 'text-slate-500',
  }
  const Icon = isLoading ? Loader2 : tone === 'success' ? CheckCircle2 : AlertCircle

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mt-2 flex items-start gap-2 text-xs font-bold leading-5 ${toneClasses[tone]}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
      <span>{message}</span>
    </p>
  )
}

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

export default function EmployeeAdminPage({ embeddedSection }: { embeddedSection?: AdminSection } = {}) {
  const { getSlotsForDate, setSlotsForDate, updateSlotForDate, updateSlotStatus } = useSchedule()
  const [hasAccess, setHasAccess] = useState(() => embeddedSection ? loadEmployeeSession() !== null : false)
  const [username, setUsername] = useState('')
  const [employeePhoneNumber, setEmployeePhoneNumber] = useState('')
  const [employeePassword, setEmployeePassword] = useState('')
  const [tokenDuration, setTokenDuration] = useState<number | ''>('')
  const [accessError, setAccessError] = useState(() =>
    new URLSearchParams(window.location.search).get('session') === 'expired'
      ? 'Your session expired. Sign in again to continue.'
      : '',
  )
  const [identityVerification, setIdentityVerification] = useState<EmployeeIdentityVerificationResponse | null>(null)
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false)
  const [identityVerificationError, setIdentityVerificationError] = useState('')
  const [passwordVerificationStatus, setPasswordVerificationStatus] = useState<PasswordVerificationStatus>('idle')
  const [verifiedAuthentication, setVerifiedAuthentication] = useState<EmployeeAuthenticationResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00 AM')
  const [endTime, setEndTime] = useState('05:00 PM')
  const [slotLength, setSlotLength] = useState(30)
  const [saveMessage, setSaveMessage] = useState('')
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false)
  const [isSavingSlots, setIsSavingSlots] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [updatingSlotTime, setUpdatingSlotTime] = useState('')
  const [activeSection, setActiveSection] = useState<AdminSection>(embeddedSection ?? 'slots')
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [bookingsError, setBookingsError] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingServiceFilter, setBookingServiceFilter] = useState('')
  const [bookingDateFilter, setBookingDateFilter] = useState(today)
  const [bookingStatusFilter, setBookingStatusFilter] = useState('')
  const [bookingActionMessage, setBookingActionMessage] = useState('')
  const [updatingBookingReference, setUpdatingBookingReference] = useState('')

  const slots = getSlotsForDate(selectedDate)
  const trimmedUsername = username.trim()
  const trimmedPhoneNumber = employeePhoneNumber.trim()
  const isUsernameFormatValid = trimmedUsername.length > 0 && !/\s/.test(trimmedUsername)
  const isPhoneFormatValid = employeePhonePattern.test(trimmedPhoneNumber)
  const isIdentityNotMatched =
    identityVerification !== null &&
    identityVerification.username_format_valid &&
    identityVerification.phone_number_format_valid &&
    !identityVerification.matched_employee
  const isIdentityVerified =
    identityVerification?.username_format_valid === true &&
    identityVerification.phone_number_format_valid === true &&
    identityVerification.matched_employee === true &&
    !identityVerificationError
  const isPasswordVerified = passwordVerificationStatus === 'verified'

  const filteredBookings = useMemo(() => {
    const normalizedSearch = bookingSearch.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesSearch =
        !normalizedSearch ||
        booking.name.toLowerCase().includes(normalizedSearch) ||
        booking.phone_number.toLowerCase().includes(normalizedSearch)
      const matchesService = !bookingServiceFilter || booking.service === bookingServiceFilter
      const matchesDate = !bookingDateFilter || booking.date === bookingDateFilter
      const matchesStatus = !bookingStatusFilter || booking.status === bookingStatusFilter

      return matchesSearch && matchesService && matchesDate && matchesStatus
    })
  }, [bookingDateFilter, bookingSearch, bookingServiceFilter, bookingStatusFilter, bookings])

  const loadBookings = useCallback(async () => {
    setBookingsError('')

    const normalizedSearch = bookingSearch.trim()

    if (!normalizedSearch) {
      setBookings([])
      setBookingsError('Enter a patient name or phone number.')
      return
    }

    setIsLoadingBookings(true)

    try {
      const loadedBookings = await fetchBookingsFromBackend(normalizedSearch)
      setBookings(loadedBookings)
    } catch {
      setBookings([])
      setBookingsError('Could not load bookings from backend.')
    } finally {
      setIsLoadingBookings(false)
    }
  }, [bookingSearch])

  useEffect(() => {
    if (hasAccess) {
      return
    }

    const storedSession = loadEmployeeSession()

    if (!storedSession) {
      return
    }

    clearStoredEmployeeSession()
    void clearEmployeeSessionInBackend(storedSession)
  }, [hasAccess])

  useEffect(() => {
    if (!hasAccess || embeddedSection) {
      return
    }

    const handlePageHide = () => {
      const storedSession = loadEmployeeSession()

      if (storedSession) {
        void clearEmployeeSessionInBackend(storedSession, { keepalive: true })
      }
    }

    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [embeddedSection, hasAccess])

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
    setEmployeePassword('')
    setPasswordVerificationStatus('idle')
    setVerifiedAuthentication(null)
    setAccessError('')
  }, [trimmedPhoneNumber, trimmedUsername])

  useEffect(() => {
    if (hasAccess) {
      return
    }

    setIdentityVerificationError('')

    if (!trimmedUsername && !trimmedPhoneNumber) {
      setIdentityVerification(null)
      setIsVerifyingIdentity(false)
      return
    }

    let ignoreResponse = false
    setIsVerifyingIdentity(true)

    const timeoutId = window.setTimeout(async () => {
      try {
        const verification = await verifyEmployeeIdentity({
          username: trimmedUsername,
          phone_number: trimmedPhoneNumber,
        })

        if (!ignoreResponse) {
          setIdentityVerification(verification)
        }
      } catch {
        if (!ignoreResponse) {
          setIdentityVerification(null)
          setIdentityVerificationError('Unable to verify details right now. Please try again.')
        }
      } finally {
        if (!ignoreResponse) {
          setIsVerifyingIdentity(false)
        }
      }
    }, 400)

    return () => {
      ignoreResponse = true
      window.clearTimeout(timeoutId)
    }
  }, [hasAccess, trimmedPhoneNumber, trimmedUsername])

  useEffect(() => {
    if (hasAccess || !isIdentityVerified || tokenDuration === '' || !employeePassword) {
      if (!employeePassword) {
        setPasswordVerificationStatus('idle')
        setVerifiedAuthentication(null)
      }
      return
    }

    let ignoreResponse = false
    setPasswordVerificationStatus('checking')

    const timeoutId = window.setTimeout(async () => {
      try {
        const authentication = await authenticateEmployeeAccess({
          username: trimmedUsername,
          phone_number: trimmedPhoneNumber,
          password: employeePassword,
          tokenDuration,
        })

        if (!ignoreResponse) {
          const allowed = authentication?.allowed === true && Boolean(authentication.token)
          setVerifiedAuthentication(allowed ? authentication : null)
          setPasswordVerificationStatus(allowed ? 'verified' : 'incorrect')
        }
      } catch {
        if (!ignoreResponse) {
          setVerifiedAuthentication(null)
          setPasswordVerificationStatus('error')
        }
      }
    }, 400)

    return () => {
      ignoreResponse = true
      window.clearTimeout(timeoutId)
    }
  }, [employeePassword, hasAccess, isIdentityVerified, tokenDuration, trimmedPhoneNumber, trimmedUsername])

  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (/\s/.test(username)) {
      setAccessError('Username cannot contain spaces')
      setHasAccess(false)
      return
    }

    if (!isIdentityVerified || !isPasswordVerified) {
      setAccessError('Complete employee verification before entering.')
      setHasAccess(false)
      return
    }

    if (tokenDuration === '') {
      setAccessError('Select how long you want to stay signed in.')
      setHasAccess(false)
      return
    }

    const authentication = verifiedAuthentication

    if (authentication?.allowed !== true || !authentication.token) {
      setAccessError('Invalid employee login')
      setHasAccess(false)
      return
    }

    if (!isEmployeeRole(authentication.role)) {
      setAccessError('Employee role is missing or unsupported.')
      setHasAccess(false)
      return
    }

    if (!authentication.expires_at || Number.isNaN(Date.parse(authentication.expires_at))) {
      setAccessError('The session expiry time is missing or invalid.')
      setHasAccess(false)
      return
    }

    saveEmployeeSession({
      username: trimmedUsername,
      phone_number: trimmedPhoneNumber,
      token: authentication.token,
      tokenDuration,
      expires_at: authentication.expires_at,
      role: authentication.role,
    })
    setAccessError('')

    // TEMPORARY TESTING: restore the previous token/role query-string redirect.
    const dashboardParams = new URLSearchParams({
      token: authentication.token,
      role: authentication.role,
    })
    window.location.href = `/role-dashboard?${dashboardParams.toString()}`
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

  const handleBookingStatusChange = async (booking: BookingRecord, status: BookingStatus) => {
    if (!booking.booking_reference) {
      setBookingActionMessage('This booking does not have a reference code yet.')
      return
    }

    setBookingActionMessage('')
    setUpdatingBookingReference(booking.booking_reference)

    try {
      const response = await updateBookingStatusInBackend({
        booking_reference: booking.booking_reference,
        status,
      })

      if ('message' in response) {
        setBookingActionMessage(response.message)
        setBookings((current) =>
          current.map((item) =>
            item.booking_reference === booking.booking_reference ? { ...item, status } : item,
          ),
        )
      } else {
        setBookings((current) =>
          current.map((item) =>
            item.booking_reference === booking.booking_reference ? response : item,
          ),
        )
        setBookingActionMessage('Booking status updated.')
      }
    } catch {
      setBookingActionMessage('Could not update booking status.')
    } finally {
      setUpdatingBookingReference('')
    }
  }

  const handleDeleteBooking = async (booking: BookingRecord) => {
    if (!booking.booking_reference) {
      setBookingActionMessage('This booking does not have a reference code yet.')
      return
    }

    setBookingActionMessage('')
    setUpdatingBookingReference(booking.booking_reference)

    try {
      const response = await deleteBookingInBackend(booking.booking_reference)
      setBookings((current) => current.filter((item) => item.booking_reference !== booking.booking_reference))
      setBookingActionMessage(response.message ?? 'Booking deleted.')
    } catch {
      setBookingActionMessage('Could not delete booking.')
    } finally {
      setUpdatingBookingReference('')
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
          <p className="mt-3 text-sm leading-6 text-slate-500">Enter your employee details to manage appointment slots and bookings.</p>
          <label className="form-label mt-7">
            Username
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value.replace(/\s/g, ''))
                setAccessError('')
              }}
              placeholder="employeeusername"
              autoComplete="username"
              required
            />
            {trimmedUsername && isVerifyingIdentity && (
              <FieldStatus tone="neutral" message="Checking username format..." isLoading />
            )}
            {trimmedUsername && !isVerifyingIdentity && isUsernameFormatValid && (
              <FieldStatus tone="success" message="Username format accepted" />
            )}
            {trimmedUsername && !isVerifyingIdentity && !isUsernameFormatValid && (
              <FieldStatus tone="error" message="Username format is invalid" />
            )}
          </label>
          <label className="form-label mt-4">
            Phone number
            <input
              className="form-input"
              type="tel"
              value={employeePhoneNumber}
              onChange={(event) => {
                setEmployeePhoneNumber(event.target.value)
                setAccessError('')
              }}
              placeholder="+20..."
              autoComplete="tel"
              required
            />
            {trimmedPhoneNumber && !isPhoneFormatValid && (
              <FieldStatus tone="error" message="Phone number is invalid. It must start with 01 and be exactly 11 digits" />
            )}
            {trimmedPhoneNumber && isPhoneFormatValid && isVerifyingIdentity && (
              <FieldStatus tone="neutral" message="Checking phone number format..." isLoading />
            )}
            {trimmedPhoneNumber && isPhoneFormatValid && !isVerifyingIdentity && identityVerification?.phone_number_format_valid === true && (
              <FieldStatus tone="success" message="Phone number format accepted" />
            )}
          </label>
          {identityVerificationError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {identityVerificationError}
            </p>
          )}
          {isIdentityVerified && (
            <p role="status" className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-800">
              Employee identity verified
            </p>
          )}
          {isIdentityNotMatched && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
              Employee details do not match our records.
            </p>
          )}
          <label className="form-label mt-4">
            Stay signed in for:
            <select
              className="form-input"
              value={tokenDuration}
              onChange={(event) => {
                setTokenDuration(event.target.value ? Number(event.target.value) : '')
                setEmployeePassword('')
                setPasswordVerificationStatus('idle')
                setVerifiedAuthentication(null)
                setAccessError('')
              }}
              disabled={isPasswordVerified}
              required
            >
              <option value="" disabled>Select a duration</option>
              {sessionDurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label mt-4">
            Password
            <input
              className="form-input"
              type="password"
              value={employeePassword}
              onChange={(event) => {
                setEmployeePassword(event.target.value.replace(/\s/g, ''))
                setVerifiedAuthentication(null)
                setAccessError('')
              }}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={!isIdentityVerified || tokenDuration === ''}
              required
            />
            {!isIdentityVerified && (
              <FieldStatus tone="neutral" message="Password unlocks after username and phone number are verified." />
            )}
            {isIdentityVerified && tokenDuration === '' && (
              <FieldStatus tone="neutral" message="Select a sign-in duration before entering your password." />
            )}
            {isIdentityVerified && passwordVerificationStatus === 'checking' && (
              <FieldStatus tone="neutral" message="Checking password..." isLoading />
            )}
            {isIdentityVerified && passwordVerificationStatus === 'verified' && (
              <FieldStatus tone="success" message="Password verified" />
            )}
            {isIdentityVerified && passwordVerificationStatus === 'incorrect' && (
              <FieldStatus tone="error" message="Password is incorrect" />
            )}
            {isIdentityVerified && passwordVerificationStatus === 'error' && (
              <FieldStatus tone="error" message="Unable to verify details right now. Please try again." />
            )}
          </label>
          <button
            type="submit"
            disabled={!isIdentityVerified || !isPasswordVerified}
            className="mt-5 min-h-12 w-full rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
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
    <div className={embeddedSection ? 'w-full' : 'min-h-screen bg-[#f5faf9] px-5 py-8 lg:px-8'}>
      <section className="mx-auto max-w-5xl">
        {!embeddedSection && <div className="flex flex-col gap-2 border-b border-teal-100 pb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">Reception schedule</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Employee admin</h1>
        </div>}

        {!embeddedSection && <div className="mt-7 grid gap-3 rounded-[1.5rem] bg-white p-2 shadow-card sm:grid-cols-2">
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
        </div>}

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

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
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
              <label className="form-label">
                Status
                <select
                  className="form-input"
                  value={bookingStatusFilter}
                  onChange={(event) => setBookingStatusFilter(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {bookingStatuses.map((status) => (
                    <option key={status} value={status}>
                      {bookingStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setBookingSearch('')
                  setBookingServiceFilter('')
                  setBookingDateFilter(today)
                  setBookingStatusFilter('')
                  setBookings([])
                  setBookingActionMessage('')
                }}
                className="min-h-12 self-end rounded-full border border-teal-200 bg-white px-5 text-sm font-bold text-ink transition hover:border-teal-400 hover:bg-teal-50"
              >
                Clear filters
              </button>
            </div>

            {bookingActionMessage && (
              <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
                {bookingActionMessage}
              </p>
            )}

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
              {isLoadingBookings ? (
                <p className="px-4 py-5 text-sm text-slate-500">Loading bookings...</p>
              ) : bookingsError ? (
                <p role="alert" className="px-4 py-5 text-sm font-bold text-red-700">{bookingsError}</p>
              ) : filteredBookings.length === 0 ? (
                <p className="px-4 py-5 text-sm text-slate-500">No bookings match the current filters.</p>
              ) : (
                <table className="min-w-[1160px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#f5faf9] text-xs font-extrabold uppercase tracking-[0.12em] text-teal-700">
                    <tr>
                      <th className="px-4 py-4">Reference</th>
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Phone Num</th>
                      <th className="px-4 py-4">Service</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Appointment Time</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Notes</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.booking_reference ?? `${booking.phone_number}-${booking.date}-${booking.appointment_time}`} className="bg-white">
                        <td className="px-4 py-4 font-bold text-ink">{booking.booking_reference ?? 'Missing'}</td>
                        <td className="px-4 py-4 font-bold text-ink">{booking.name}</td>
                        <td className="px-4 py-4">{booking.phone_number}</td>
                        <td className="px-4 py-4">{booking.service}</td>
                        <td className="px-4 py-4">{booking.date}</td>
                        <td className="px-4 py-4">{booking.appointment_time}</td>
                        <td className="px-4 py-4">
                          <select
                            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-ink"
                            value={booking.status ?? 'scheduled'}
                            onChange={(event) => handleBookingStatusChange(booking, event.target.value as BookingStatus)}
                            disabled={!booking.booking_reference || updatingBookingReference === booking.booking_reference}
                          >
                            {bookingStatuses.map((status) => (
                              <option key={status} value={status}>
                                {bookingStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-[260px] px-4 py-4">{booking.notes || '—'}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(booking)}
                            disabled={!booking.booking_reference || updatingBookingReference === booking.booking_reference}
                            className="min-h-10 rounded-full border border-red-100 bg-white px-4 text-xs font-extrabold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
