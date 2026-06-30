/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

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

const defaultSchedule: ScheduleByDate = {}

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

  const getSlotsForDate = useCallback((date: string) => schedule[date] ?? [], [schedule])

  const setSlotsForDate = useCallback((date: string, slots: AppointmentSlot[]) => {
    setSchedule((current) => ({ ...current, [date]: slots }))
  }, [])

  const updateSlotForDate = useCallback((date: string, updatedSlot: AppointmentSlot) => {
    setSchedule((current) => ({
      ...current,
      [date]: (current[date] ?? []).map((slot) =>
        slot.time === updatedSlot.time ? updatedSlot : slot,
      ),
    }))
  }, [])

  const updateSlotStatus = useCallback((date: string, time: string, status: SlotStatus) => {
    setSchedule((current) => ({
      ...current,
      [date]: (current[date] ?? []).map((slot) =>
        slot.time === time ? { ...slot, status } : slot,
      ),
    }))
  }, [])

  const value = useMemo<ScheduleContextValue>(() => {
    return { schedule, getSlotsForDate, setSlotsForDate, updateSlotForDate, updateSlotStatus }
  }, [getSlotsForDate, schedule, setSlotsForDate, updateSlotForDate, updateSlotStatus])

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
  const context = useContext(ScheduleContext)
  if (!context) {
    throw new Error('useSchedule must be used inside ScheduleProvider')
  }
  return context
}
