import { createApiClient, redact } from './apiClient.js'

export const SAFE_DATABASE_SCHEMA = Object.freeze({
  employees: Object.freeze({
    columns: Object.freeze(['employee_id', 'is_active']),
    filters: Object.freeze(['employee_id']),
  }),
  account_activation: Object.freeze({
    columns: Object.freeze([
      'account_id',
      'status',
      'failed_attempts',
      'code_expiry_time',
      'setup_token_expiry_time',
    ]),
    filters: Object.freeze(['account_id']),
  }),
  account_reactivation: Object.freeze({
    columns: Object.freeze([
      'reactivation_id',
      'employee_id',
      'status',
      'failed_attempts',
      'code_expiry_time',
      'setup_token_expiry_time',
    ]),
    filters: Object.freeze(['reactivation_id', 'employee_id']),
  }),
  employee_working_hours: Object.freeze({
    columns: Object.freeze([
      'employee_id',
      'day_of_week',
      'start_minute',
      'end_minute',
      'working_status',
    ]),
    filters: Object.freeze(['employee_id']),
  }),
})

export class SupabaseReadError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'SupabaseReadError'
    this.details = redact(details)
  }
}

function validateConfiguration({ enabled, supabaseUrl, serviceRoleKey }) {
  if (!enabled) return null
  if (!supabaseUrl || !serviceRoleKey) {
    throw new SupabaseReadError(
      'Database checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  try {
    const url = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
    return url.toString().replace(/\/+$/, '')
  } catch {
    throw new SupabaseReadError('SUPABASE_URL must be a valid HTTP(S) URL.')
  }
}

function validateReadRequest({ table, columns, filters }) {
  const schema = SAFE_DATABASE_SCHEMA[table]
  if (!schema) {
    throw new SupabaseReadError(`Database table is not allowlisted: ${String(table)}`)
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new SupabaseReadError('At least one allowlisted column must be requested.')
  }

  const uniqueColumns = [...new Set(columns)]
  const invalidColumns = uniqueColumns.filter((column) => !schema.columns.includes(column))
  if (invalidColumns.length > 0) {
    throw new SupabaseReadError(
      `Database column is not allowlisted for ${table}: ${invalidColumns.join(', ')}`,
    )
  }

  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new SupabaseReadError('A database query must include an allowlisted ID filter.')
  }

  const filterEntries = Object.entries(filters)
  if (filterEntries.length === 0) {
    throw new SupabaseReadError('Full-table database reads are blocked; an ID filter is required.')
  }

  for (const [column, value] of filterEntries) {
    if (!schema.filters.includes(column)) {
      throw new SupabaseReadError(`Database filter is not allowlisted for ${table}: ${column}`)
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new SupabaseReadError(`Database filter ${column} must be a non-empty string.`)
    }
  }

  return { columns: uniqueColumns, filterEntries }
}

export function createSupabaseReadClient({
  enabled = false,
  supabaseUrl = null,
  serviceRoleKey = null,
  timeoutMs = 15_000,
  verbose = false,
} = {}) {
  const normalizedUrl = validateConfiguration({ enabled, supabaseUrl, serviceRoleKey })
  const apiClient = createApiClient({ timeoutMs, verbose })

  async function select({ table, columns, filters }) {
    if (!enabled) {
      throw new SupabaseReadError('Database checks are disabled. Run with --db-check to enable them.')
    }

    const validated = validateReadRequest({ table, columns, filters })
    const endpoint = new URL(`/rest/v1/${table}`, normalizedUrl)
    endpoint.searchParams.set('select', validated.columns.join(','))
    endpoint.searchParams.set('limit', '20')
    for (const [column, value] of validated.filterEntries) {
      endpoint.searchParams.set(column, `eq.${value.trim()}`)
    }

    const result = await apiClient.request(endpoint.toString(), {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: 'application/json',
      },
    })

    if (!result.ok) {
      throw new SupabaseReadError(`Supabase read failed for ${table}.`, {
        table,
        path: endpoint.pathname,
        httpStatus: result.status,
        error: result.error,
        body: result.body,
      })
    }
    if (!Array.isArray(result.body)) {
      throw new SupabaseReadError(`Supabase returned an unexpected response for ${table}.`, {
        table,
        path: endpoint.pathname,
        httpStatus: result.status,
      })
    }

    return result.body
  }

  return Object.freeze({ enabled, select })
}
