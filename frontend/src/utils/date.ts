const EGYPT_TIME_ZONE = 'Africa/Cairo'

export function getEgyptDateInputValue(date = new Date()) {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: EGYPT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const partsByType = Object.fromEntries(dateParts.map((part) => [part.type, part.value]))

  return `${partsByType.year}-${partsByType.month}-${partsByType.day}`
}
