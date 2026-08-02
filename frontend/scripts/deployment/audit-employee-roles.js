import { createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto'

function requireEnvironment(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function decodeFernetKey(secretKeyHex) {
  if (!/^[0-9a-f]+$/i.test(secretKeyHex) || secretKeyHex.length % 2 !== 0) {
    throw new Error('SECRET_KEY must use the hexadecimal format expected by the backend.')
  }

  const encodedKey = Buffer.from(secretKeyHex, 'hex').toString('ascii')
  const key = Buffer.from(encodedKey, 'base64url')
  if (key.length !== 32) {
    throw new Error('SECRET_KEY did not decode to a valid 32-byte Fernet key.')
  }

  return {
    signingKey: key.subarray(0, 16),
    encryptionKey: key.subarray(16),
  }
}

function decryptFernetHex(encryptedHex, secretKeyHex) {
  if (typeof encryptedHex !== 'string' || !/^[0-9a-f]+$/i.test(encryptedHex)) {
    throw new Error('Encrypted role is not a valid hexadecimal string.')
  }

  const tokenText = Buffer.from(encryptedHex, 'hex').toString('ascii')
  const token = Buffer.from(tokenText, 'base64url')
  if (token.length < 73 || token[0] !== 0x80) {
    throw new Error('Encrypted role is not a valid Fernet token.')
  }

  const { signingKey, encryptionKey } = decodeFernetKey(secretKeyHex)
  const signedData = token.subarray(0, -32)
  const storedSignature = token.subarray(-32)
  const calculatedSignature = createHmac('sha256', signingKey).update(signedData).digest()

  if (!timingSafeEqual(storedSignature, calculatedSignature)) {
    throw new Error('Encrypted role signature does not match SECRET_KEY.')
  }

  const iv = token.subarray(9, 25)
  const ciphertext = token.subarray(25, -32)
  const decipher = createDecipheriv('aes-128-cbc', encryptionKey, iv)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

function parseEncryptedRole(encryptedRole, secretKeyHex) {
  const decrypted = decryptFernetHex(encryptedRole, secretKeyHex)
  const separator = decrypted.indexOf('|')
  if (separator <= 0 || separator === decrypted.length - 1) {
    throw new Error('Decrypted role does not use the expected employee_id|ROLE format.')
  }

  return {
    embeddedEmployeeId: decrypted.slice(0, separator),
    role: decrypted.slice(separator + 1).toUpperCase(),
  }
}

async function loadEmployeeRoles(supabaseUrl, serviceRoleKey) {
  const endpoint = new URL('/rest/v1/employees', supabaseUrl)
  endpoint.searchParams.set('select', 'employee_id,role')

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Supabase returned HTTP ${response.status}: ${body.slice(0, 300)}`)
  }

  const body = await response.json()
  if (!Array.isArray(body)) {
    throw new Error('Supabase returned an unexpected employees response.')
  }

  return body
}

async function main() {
  const supabaseUrl = requireEnvironment('SUPABASE_URL')
  const serviceRoleKey = requireEnvironment('SUPABASE_SERVICE_ROLE_KEY')
  const secretKey = requireEnvironment('SECRET_KEY')
  const employees = await loadEmployeeRoles(supabaseUrl, serviceRoleKey)

  const rows = employees.map((employee) => {
    const databaseEmployeeId = String(employee.employee_id ?? '')

    try {
      const decrypted = parseEncryptedRole(employee.role, secretKey)
      const matches = databaseEmployeeId === decrypted.embeddedEmployeeId
      return {
        database_employee_id: databaseEmployeeId,
        encrypted_employee_id: decrypted.embeddedEmployeeId,
        role: decrypted.role,
        id_matches: matches ? 'YES' : 'NO',
      }
    } catch (error) {
      return {
        database_employee_id: databaseEmployeeId,
        encrypted_employee_id: 'UNREADABLE',
        role: 'UNREADABLE',
        id_matches: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown decryption error',
      }
    }
  })

  console.table(rows)

  const failures = rows.filter((row) => row.id_matches !== 'YES')
  console.log(`Checked ${rows.length} employee role${rows.length === 1 ? '' : 's'}.`)

  if (failures.length > 0) {
    console.error(`Found ${failures.length} mismatched or unreadable role${failures.length === 1 ? '' : 's'}.`)
    process.exitCode = 1
  } else {
    console.log('PASS: Every encrypted role contains its row\'s employee ID.')
  }
}

main().catch((error) => {
  console.error(`AUDIT ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
  process.exitCode = 1
})
