function requireEnvironment(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function isHexadecimal(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && value.length % 2 === 0
    && /^[0-9a-f]+$/i.test(value)
  )
}

async function loadPendingEncryptionFields(supabaseUrl, serviceRoleKey) {
  const endpoint = new URL('/rest/v1/account_activation', supabaseUrl)
  endpoint.searchParams.set('select', 'account_id,username,phone_number,role')

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Supabase returned HTTP ${response.status}.`)
  }

  const rows = await response.json()
  if (!Array.isArray(rows)) {
    throw new Error('Supabase returned an unexpected account_activation response.')
  }
  return rows
}

async function main() {
  const supabaseUrl = requireEnvironment('SUPABASE_URL')
  const serviceRoleKey = requireEnvironment('SUPABASE_SERVICE_ROLE_KEY')
  const rows = await loadPendingEncryptionFields(supabaseUrl, serviceRoleKey)

  const results = rows.map((row) => {
    const checks = {
      username: isHexadecimal(row.username),
      phone_number: isHexadecimal(row.phone_number),
      role: isHexadecimal(row.role),
    }
    const failingColumns = Object.entries(checks)
      .filter(([, valid]) => !valid)
      .map(([column]) => column)

    return {
      account_id: String(row.account_id ?? ''),
      username_hex: checks.username ? 'YES' : 'NO',
      phone_hex: checks.phone_number ? 'YES' : 'NO',
      role_hex: checks.role ? 'YES' : 'NO',
      failing_columns: failingColumns.length > 0 ? failingColumns.join(', ') : 'NONE',
    }
  })

  console.table(results)

  const failures = results.filter((row) => row.failing_columns !== 'NONE')
  console.log(`Checked ${results.length} pending account${results.length === 1 ? '' : 's'}.`)
  if (failures.length > 0) {
    console.error(`Found ${failures.length} pending account${failures.length === 1 ? '' : 's'} with malformed encrypted fields.`)
    process.exitCode = 1
  } else {
    console.log('PASS: Every pending username, phone number, and role uses hexadecimal storage.')
  }
}

main().catch((error) => {
  console.error(`AUDIT ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
  process.exitCode = 1
})
