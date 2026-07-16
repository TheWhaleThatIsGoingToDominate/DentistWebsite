import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import {
  clearEmployeeSessionInBackend,
  clearStoredEmployeeSession,
  loadEmployeeSession,
} from '../utils/employeeAccess'

function getRemainingSeconds(expiresAt: string) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))
}

function formatRemainingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function SessionExpiryCountdown() {
  const [session] = useState(loadEmployeeSession)
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    session ? getRemainingSeconds(session.expires_at) : 0,
  )

  useEffect(() => {
    if (!session) {
      window.location.replace('/employee-admin?session=expired')
      return
    }

    let hasExpired = false
    const updateCountdown = () => {
      const nextRemainingSeconds = getRemainingSeconds(session.expires_at)
      setRemainingSeconds(nextRemainingSeconds)

      if (nextRemainingSeconds === 0 && !hasExpired) {
        hasExpired = true
        void clearEmployeeSessionInBackend(session)
        clearStoredEmployeeSession()
        window.location.replace('/employee-admin?session=expired')
      }
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(intervalId)
  }, [session])

  if (!session) {
    return null
  }

  return (
    <div
      className="inline-flex min-h-12 w-[232px] max-w-full shrink-0 items-center justify-center gap-3 rounded-full border border-teal-100 bg-white px-6 py-3 text-sm font-bold text-ink shadow-sm"
      title={`Session expires at ${new Date(session.expires_at).toLocaleTimeString()}`}
    >
      <Clock3 className="h-5 w-5 text-teal-600" />
      <span className="text-slate-500">Session</span>
      <time dateTime={session.expires_at} className="tabular-nums">
        {formatRemainingTime(remainingSeconds)}
      </time>
    </div>
  )
}
