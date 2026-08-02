import { SupabaseReadError } from './supabaseReadClient.js'

function reportDatabaseError(reporter, name, error) {
  const details = error instanceof SupabaseReadError
    ? error.details
    : { error: error instanceof Error ? error.message : 'Unknown database assertion error' }
  reporter.fail(name, details)
  return { passed: false, rows: [] }
}

function skipWhenDisabled(client, reporter, name) {
  if (client.enabled) return false
  reporter.skip(name, { reason: 'Database checks require --db-check.' })
  return true
}

export async function assertRowExists({ client, reporter, name, table, columns, filters }) {
  if (skipWhenDisabled(client, reporter, name)) return { passed: false, skipped: true, rows: [] }

  try {
    const rows = await client.select({ table, columns, filters })
    if (rows.length > 0) {
      reporter.pass(name, { table, matchedRows: rows.length })
      return { passed: true, rows }
    }
    reporter.fail(name, { table, reason: 'Expected row was not found.' })
    return { passed: false, rows }
  } catch (error) {
    return reportDatabaseError(reporter, name, error)
  }
}

export async function assertRowAbsent({ client, reporter, name, table, columns, filters }) {
  if (skipWhenDisabled(client, reporter, name)) return { passed: false, skipped: true, rows: [] }

  try {
    const rows = await client.select({ table, columns, filters })
    if (rows.length === 0) {
      reporter.pass(name, { table })
      return { passed: true, rows }
    }
    reporter.fail(name, { table, matchedRows: rows.length, reason: 'Unexpected row still exists.' })
    return { passed: false, rows }
  } catch (error) {
    return reportDatabaseError(reporter, name, error)
  }
}

export async function assertRowFieldEquals({
  client,
  reporter,
  name,
  table,
  idColumn,
  id,
  field,
  expected,
}) {
  if (skipWhenDisabled(client, reporter, name)) return { passed: false, skipped: true, rows: [] }

  try {
    const rows = await client.select({
      table,
      columns: [idColumn, field],
      filters: { [idColumn]: id },
    })
    if (rows.length !== 1) {
      reporter.fail(name, {
        table,
        matchedRows: rows.length,
        reason: rows.length === 0 ? 'Expected row was not found.' : 'Expected exactly one row.',
      })
      return { passed: false, rows }
    }

    const actual = rows[0][field]
    if (actual === expected) {
      reporter.pass(name, { table, field, expected })
      return { passed: true, rows }
    }

    reporter.fail(name, { table, field, expected, actual })
    return { passed: false, rows }
  } catch (error) {
    return reportDatabaseError(reporter, name, error)
  }
}

export function assertAccountActivationStatus({ client, reporter, accountId, expectedStatus, name }) {
  return assertRowFieldEquals({
    client,
    reporter,
    name: name || `Account activation status is ${expectedStatus}`,
    table: 'account_activation',
    idColumn: 'account_id',
    id: accountId,
    field: 'status',
    expected: expectedStatus,
  })
}

export function assertEmployeeActiveState({ client, reporter, employeeId, expectedActive, name }) {
  return assertRowFieldEquals({
    client,
    reporter,
    name: name || `Employee active state is ${expectedActive}`,
    table: 'employees',
    idColumn: 'employee_id',
    id: employeeId,
    field: 'is_active',
    expected: expectedActive,
  })
}

export function assertReactivationStatus({ client, reporter, reactivationId, expectedStatus, name }) {
  return assertRowFieldEquals({
    client,
    reporter,
    name: name || `Account reactivation status is ${expectedStatus}`,
    table: 'account_reactivation',
    idColumn: 'reactivation_id',
    id: reactivationId,
    field: 'status',
    expected: expectedStatus,
  })
}

function normalizeWorkingHours(intervals) {
  if (!Array.isArray(intervals)) {
    throw new Error('Expected working hours must be an array.')
  }

  const normalized = intervals.map((interval) => ({
    day_of_week: interval.day_of_week,
    start_minute: interval.start_minute,
    end_minute: interval.end_minute,
    working_status: interval.working_status,
  }))
  const days = normalized.map((interval) => interval.day_of_week)
  if (new Set(days).size !== days.length) {
    throw new Error('Expected working hours contain duplicate days.')
  }

  return normalized.sort((left, right) => left.day_of_week - right.day_of_week)
}

export async function assertWorkingHoursExact({
  client,
  reporter,
  employeeId,
  expectedIntervals,
  name = 'Employee working hours match exactly',
}) {
  if (skipWhenDisabled(client, reporter, name)) return { passed: false, skipped: true, rows: [] }

  try {
    const expected = normalizeWorkingHours(expectedIntervals)
    const rows = await client.select({
      table: 'employee_working_hours',
      columns: [
        'employee_id',
        'day_of_week',
        'start_minute',
        'end_minute',
        'working_status',
      ],
      filters: { employee_id: employeeId },
    })
    const actual = normalizeWorkingHours(rows)

    if (actual.length !== expected.length) {
      reporter.fail(name, {
        table: 'employee_working_hours',
        expectedRows: expected.length,
        actualRows: actual.length,
      })
      return { passed: false, rows }
    }

    const mismatchIndex = expected.findIndex((interval, index) => {
      const saved = actual[index]
      return interval.day_of_week !== saved.day_of_week
        || interval.start_minute !== saved.start_minute
        || interval.end_minute !== saved.end_minute
        || interval.working_status !== saved.working_status
    })

    if (mismatchIndex !== -1) {
      reporter.fail(name, {
        table: 'employee_working_hours',
        mismatchIndex,
        expected: expected[mismatchIndex],
        actual: actual[mismatchIndex],
      })
      return { passed: false, rows }
    }

    reporter.pass(name, { table: 'employee_working_hours', matchedRows: rows.length })
    return { passed: true, rows }
  } catch (error) {
    return reportDatabaseError(reporter, name, error)
  }
}
