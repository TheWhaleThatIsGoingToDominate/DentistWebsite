/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

export type SlotStatus = 'available' | 'blocked' | 'booked'

export type AppointmentSlot = {
  time: string
  status: SlotStatus
}

type ScheduleByDate = Record<string, AppointmentSlot[]>

type ScheduleContextValue = {
  schedule: ScheduleByDate
  getSlotsForDate: (date: string) => AppointmentSlot[]
  setSlotsForDate: (date: string, slots: AppointmentSlot[]) => void
  updateSlotForDate: (date: string, updatedSlot: AppointmentSlot) => void
  updateSlotStatus: (date: string, time: string, status: SlotStatus) => void
}

const STORAGE_KEY = 'aurora-demo-schedule'

const today = new Date().toISOString().slice(0, 10)

const defaultSchedule: ScheduleByDate = {
  [today]: [
    { time: '09:00 AM', status: 'available' },
    { time: '09:30 AM', status: 'available' },
    { time: '10:00 AM', status: 'blocked' },
    { time: '10:30 AM', status: 'available' },
    { time: '11:00 AM', status: 'booked' },
    { time: '11:30 AM', status: 'available' },
    { time: '12:00 PM', status: 'available' },
    { time: '12:30 PM', status: 'blocked' },
    { time: '01:00 PM', status: 'available' },
    { time: '01:30 PM', status: 'available' },
  ],
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)

function loadInitialSchedule() {
  const storedSchedule = window.localStorage.getItem(STORAGE_KEY)
  if (!storedSchedule) {
    return defaultSchedule
  }

  try {
    return { ...defaultSchedule, ...JSON.parse(storedSchedule) } as ScheduleByDate
  } catch {
    return defaultSchedule
  }
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedule, setSchedule] = useState<ScheduleByDate>(() => loadInitialSchedule())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule))
  }, [schedule])

  const value = useMemo<ScheduleContextValue>(() => {
    const getSlotsForDate = (date: string) => schedule[date] ?? []

    const setSlotsForDate = (date: string, slots: AppointmentSlot[]) => {
      setSchedule((current) => ({ ...current, [date]: slots }))
    }

    const updateSlotForDate = (date: string, updatedSlot: AppointmentSlot) => {
      setSchedule((current) => ({
        ...current,
        [date]: (current[date] ?? []).map((slot) =>
          slot.time === updatedSlot.time ? updatedSlot : slot,
        ),
      }))
    }

    const updateSlotStatus = (date: string, time: string, status: SlotStatus) => {
      setSchedule((current) => ({
        ...current,
        [date]: (current[date] ?? []).map((slot) =>
          slot.time === time ? { ...slot, status } : slot,
        ),
      }))
    }

    return { schedule, getSlotsForDate, setSlotsForDate, updateSlotForDate, updateSlotStatus }
  }, [schedule])

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
  const context = useContext(ScheduleContext)
  if (!context) {
    throw new Error('useSchedule must be used inside ScheduleProvider')
  }
  return context
}
