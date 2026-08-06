import {
  buildOwnerHeaders,
  createApiClient,
  findSensitiveResponseKeys,
  redact,
} from './apiClient.js'
import { DeploymentConfigError, loadDeploymentConfig } from './config.js'
import {
  assertAccountActivationStatus,
  assertEmployeeActiveState,
  assertReactivationStatus,
  assertRowAbsent,
  assertRowFieldEquals,
  assertWorkingHoursExact,
} from './databaseAssertions.js'
import { DeploymentReporter } from './reporter.js'
import { createSupabaseReadClient } from './supabaseReadClient.js'
import { createFullFlowTestData } from './testData.js'

const workingHours = Object.freeze([
  Object.freeze({ day_of_week: 0, start_minute: 540, end_minute: 1020, working_status: true }),
  Object.freeze({ day_of_week: 2, start_minute: 600, end_minute: 1080, working_status: true }),
  Object.freeze({ day_of_week: 4, start_minute: 480, end_minute: 960, working_status: true }),
])

const forbiddenResponseKeyPattern = /password|hash|salt|lookup|setup[_-]?token|token[_-]?salt|activation[_-]?code|reactivation[_-]?code/i
const safeExpiryMetadataKeys = new Set(['setup_token_expiry_time', 'setup_token_expires_at'])

class FlowAbort extends Error {
  constructor(stepName) {
    super(`Full flow stopped after: ${stepName}`)
    this.name = 'FlowAbort'
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function findForbiddenResponseKeys(value, allowedKeys = new Set(), path = '$', matches = []) {
  if (!value || typeof value !== 'object') return matches

  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${path}.${key}`
    if (
      forbiddenResponseKeyPattern.test(key)
      && !allowedKeys.has(key)
      && !safeExpiryMetadataKeys.has(key)
    ) {
      matches.push(nextPath)
    }
    if (item && typeof item === 'object') {
      findForbiddenResponseKeys(item, allowedKeys, nextPath, matches)
    }
  }

  return matches
}

function safeResultDetails(result, validationErrors = [], forbiddenKeys = []) {
  return {
    path: result.url ? new URL(result.url).pathname : null,
    httpStatus: result.status,
    error: result.error,
    body: result.body,
    validationErrors,
    forbiddenKeys,
  }
}

function check(condition, message, errors) {
  if (!condition) errors.push(message)
}

function validateWorkingHours(expectedRows, returnedRows, employeeId) {
  const errors = []
  check(Array.isArray(returnedRows), 'working_hours must be an array.', errors)
  if (!Array.isArray(returnedRows)) return errors

  const returnedDays = returnedRows.filter(isRecord).map((row) => row.day_of_week)
  check(new Set(returnedDays).size === returnedDays.length, 'working_hours contains duplicate days.', errors)
  check(returnedRows.length === expectedRows.length, 'working_hours row count does not match.', errors)

  const expected = [...expectedRows].sort((a, b) => a.day_of_week - b.day_of_week)
  const returned = [...returnedRows].sort((a, b) => Number(a?.day_of_week) - Number(b?.day_of_week))

  returned.forEach((row, index) => {
    const expectedRow = expected[index]
    check(isRecord(row), `working_hours row ${index} must be an object.`, errors)
    if (!isRecord(row)) return

    check(row.employee_id === employeeId, `working_hours row ${index} has the wrong employee_id.`, errors)
    check(Number.isInteger(row.day_of_week) && row.day_of_week >= 0 && row.day_of_week <= 6, `working_hours row ${index} has an invalid day_of_week.`, errors)
    check(Number.isInteger(row.start_minute) && row.start_minute >= 0 && row.start_minute <= 1439, `working_hours row ${index} has an invalid start_minute.`, errors)
    check(Number.isInteger(row.end_minute) && row.end_minute >= 1 && row.end_minute <= 1440, `working_hours row ${index} has an invalid end_minute.`, errors)
    check(row.start_minute < row.end_minute, `working_hours row ${index} must start before it ends.`, errors)
    check(typeof row.working_status === 'boolean', `working_hours row ${index} has an invalid working_status.`, errors)

    if (expectedRow) {
      for (const field of ['day_of_week', 'start_minute', 'end_minute', 'working_status']) {
        check(row[field] === expectedRow[field], `working_hours row ${index} ${field} does not match.`, errors)
      }
    }
  })

  return errors
}

function currentProfileValidation({ employeeId, username, phoneNumber, role, workingHours: expectedHours }) {
  return (body) => {
    const errors = []
    const profile = isRecord(body) && isRecord(body.profile) ? body.profile : null
    const returnedHours = isRecord(body) ? body.working_hours : null

    check(isRecord(body), 'Profile response must be an object.', errors)
    check(Boolean(profile), 'profile must be an object.', errors)
    check(findSensitiveResponseKeys(body).length === 0, 'Profile response contains sensitive fields.', errors)
    if (!profile) return errors

    if (employeeId !== null) check(profile.employee_id === employeeId, 'profile.employee_id does not match.', errors)
    check(isNonEmptyString(profile.employee_id), 'profile.employee_id is required.', errors)
    check(profile.username === username, 'profile.username does not match.', errors)
    check(profile.phone_number === phoneNumber, 'profile.phone_number does not match.', errors)
    check(profile.role === role, 'profile.role does not match.', errors)
    check(typeof profile.is_active === 'boolean', 'profile.is_active must be boolean.', errors)

    if (expectedHours === null) {
      check(Array.isArray(returnedHours), 'working_hours must be an array.', errors)
      check(Array.isArray(returnedHours) && returnedHours.length === 0, 'Owner working_hours must be empty.', errors)
    } else {
      errors.push(...validateWorkingHours(expectedHours, returnedHours, profile.employee_id))
    }

    return errors
  }
}

async function expectApiStep({
  client,
  reporter,
  name,
  url,
  options = {},
  expectedStatus,
  validate = () => [],
  allowedSensitiveKeys = [],
}) {
  const result = await client.request(url, options)
  const validationErrors = result.status === expectedStatus ? validate(result.body) : []
  const forbiddenKeys = findForbiddenResponseKeys(
    result.body,
    new Set(allowedSensitiveKeys),
  )

  if (result.status !== expectedStatus || validationErrors.length > 0 || forbiddenKeys.length > 0) {
    reporter.fail(name, safeResultDetails(result, validationErrors, forbiddenKeys))
    throw new FlowAbort(name)
  }

  reporter.pass(name, {
    path: new URL(result.url || url).pathname,
    httpStatus: result.status,
  })
  return result.body
}

function authValidation(expectedRole) {
  return (body) => {
    const errors = []
    check(isRecord(body), 'Response must be an object.', errors)
    if (!isRecord(body)) return errors
    check(body.allowed === true, 'allowed must be true.', errors)
    check(isNonEmptyString(body.token), 'token is required.', errors)
    check(isNonEmptyString(body.expires_at), 'expires_at is required.', errors)
    check(body.role === expectedRole, `role must be ${expectedRole}.`, errors)
    return errors
  }
}

function containsAccount(rows, { idKey, id, username }) {
  return Array.isArray(rows) && rows.some((row) => (
    isRecord(row) && (row[idKey] === id || row.username === username)
  ))
}

async function logout({ client, reporter, apiUrl, username, phoneNumber, token, label }) {
  if (!token) {
    reporter.skip(`${label} logout`, { reason: 'No token was created.' })
    return
  }

  const result = await client.request(`${apiUrl}/employee/auth/logout`, {
    method: 'POST',
    json: { username, phone_number: phoneNumber, token },
  })
  if (result.status === 200 && result.body?.success === true) {
    reporter.pass(`${label} logout`, { path: '/employee/auth/logout', httpStatus: 200 })
  } else {
    reporter.fail(`${label} logout`, safeResultDetails(result))
  }
}

async function main() {
  let config
  try {
    config = loadDeploymentConfig()
  } catch (error) {
    const message = error instanceof DeploymentConfigError ? error.message : 'Deployment configuration failed.'
    console.error(`CONFIG ERROR: ${message}`)
    process.exitCode = 1
    return
  }

  const reporter = new DeploymentReporter({ reportPath: config.flags.reportPath })
  reporter.section('Safety')
  if (!config.flags.write || !config.flags.confirmNoCleanup) {
    reporter.fail('Full-flow state changes were refused', {
      reason: 'Both --write and --confirm-no-cleanup are required.',
      writeEnabled: config.flags.write,
      cleanupAcknowledged: config.flags.confirmNoCleanup,
    })
    await reporter.finish()
    process.exitCode = 1
    return
  }
  reporter.pass('Full-flow safety flags accepted', {
    databaseChecks: config.flags.dbCheck,
    automaticCleanup: false,
  })

  if (config.testEmployeeRole !== 'RECEPTIONIST') {
    reporter.fail('Full-flow employee role is safe', {
      reason: 'TEST_EMPLOYEE_ROLE must be RECEPTIONIST for this deployment flow.',
      configuredRole: config.testEmployeeRole,
    })
    await reporter.finish()
    process.exitCode = 1
    return
  }

  const client = createApiClient({ timeoutMs: config.timeoutMs, verbose: config.flags.verbose })
  const databaseClient = createSupabaseReadClient({
    enabled: config.flags.dbCheck,
    supabaseUrl: config.supabase?.url,
    serviceRoleKey: config.supabase?.serviceRoleKey,
    timeoutMs: config.timeoutMs,
    verbose: config.flags.verbose,
  })
  let testData
  try {
    testData = createFullFlowTestData({
      prefix: config.testRunPrefix,
      phonePrefix: config.testPhonePrefix,
    })
  } catch (error) {
    reporter.fail('Synthetic test data is valid', {
      error: error instanceof Error ? error.message : 'Could not generate test data.',
    })
    await reporter.finish()
    process.exitCode = 1
    return
  }
  const state = {
    accountId: null,
    employeeId: null,
    ownerEmployeeId: null,
    reactivationId: null,
    ownerToken: null,
    employeeToken: null,
  }

  try {
    reporter.section('Owner authentication')
    const ownerAuth = await expectApiStep({
      client,
      reporter,
      name: 'Owner authentication succeeds',
      url: `${config.apiUrl}/employee/auth`,
      options: {
        method: 'POST',
        json: {
          username: config.owner.username,
          phone_number: config.owner.phoneNumber,
          password: config.owner.password,
          valid_time: config.owner.validTime,
        },
      },
      expectedStatus: 200,
      validate: authValidation('OWNER'),
    })
    state.ownerToken = ownerAuth.token
    const ownerHeaders = buildOwnerHeaders({
      username: config.owner.username,
      phoneNumber: config.owner.phoneNumber,
      token: state.ownerToken,
    })

    const ownerProfile = await expectApiStep({
      client,
      reporter,
      name: 'Owner loads their current profile safely',
      url: `${config.apiUrl}/employee/admin/employee/profile`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: currentProfileValidation({
        employeeId: null,
        username: config.owner.username,
        phoneNumber: config.owner.phoneNumber,
        role: 'OWNER',
        workingHours: null,
      }),
    })
    state.ownerEmployeeId = ownerProfile.profile.employee_id

    reporter.section('Account creation')
    const created = await expectApiStep({
      client,
      reporter,
      name: 'Owner creates pending employee account',
      url: `${config.apiUrl}/owner/createAccount`,
      options: {
        method: 'POST',
        headers: ownerHeaders,
        json: {
          name: testData.pendingUsername,
          phone_number: testData.phoneNumber,
          role: config.testEmployeeRole,
        },
      },
      expectedStatus: 201,
      allowedSensitiveKeys: ['activation_code'],
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.created === true, 'created must be true.', errors)
        check(isRecord(body.employee), 'employee is required.', errors)
        if (isRecord(body.employee)) {
          check(isNonEmptyString(body.employee.account_id), 'employee.account_id is required.', errors)
          check(body.employee.role === config.testEmployeeRole, 'Employee role does not match.', errors)
        }
        check(isNonEmptyString(body.activation_code), 'activation_code is required.', errors)
        check(isNonEmptyString(body.activation_expires_at), 'activation_expires_at is required.', errors)
        return errors
      },
    })
    state.accountId = created.employee.account_id
    const activationCode = created.activation_code

    await assertAccountActivationStatus({
      client: databaseClient,
      reporter,
      accountId: state.accountId,
      expectedStatus: 'PENDING_VERIFICATION',
    })

    const pendingList = await expectApiStep({
      client,
      reporter,
      name: 'Pending account appears in owner list',
      url: `${config.apiUrl}/owner/accounts/pending`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        check(Array.isArray(body), 'Pending list must be an array.', errors)
        check(
          containsAccount(body, {
            idKey: 'account_id',
            id: state.accountId,
            username: testData.pendingUsername,
          }),
          'Generated pending account was not found.',
          errors,
        )
        return errors
      },
    })
    void pendingList

    await expectApiStep({
      client,
      reporter,
      name: 'Pending employee profile is correct',
      url: `${config.apiUrl}/owner/accounts/pending/${encodeURIComponent(state.accountId)}`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        const account = isRecord(body) && isRecord(body.account) ? body.account : null
        check(Boolean(account), 'account profile is required.', errors)
        if (!account) return errors
        check(account.account_id === state.accountId, 'account_id does not match.', errors)
        check(account.username === testData.pendingUsername, 'username does not match.', errors)
        check(account.phone_number === testData.phoneNumber, 'phone_number does not match.', errors)
        check(account.role === config.testEmployeeRole, 'role does not match.', errors)
        check(account.status === 'PENDING_VERIFICATION', 'status is not PENDING_VERIFICATION.', errors)
        return errors
      },
    })

    reporter.section('Normal activation')
    const activation = await expectApiStep({
      client,
      reporter,
      name: 'Employee activation code verifies',
      url: `${config.apiUrl}/employee/account/activate`,
      options: {
        method: 'POST',
        json: {
          name: testData.pendingUsername,
          phone_number: testData.phoneNumber,
          activation_code: activationCode,
        },
      },
      expectedStatus: 200,
      allowedSensitiveKeys: ['setup_token', 'setup_token_expires_at'],
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.verified === true, 'verified must be true.', errors)
        check(body.flow === 'ACTIVATION', 'flow must be ACTIVATION.', errors)
        check(isNonEmptyString(body.setup_token), 'setup_token is required.', errors)
        check(isNonEmptyString(body.setup_token_expires_at), 'setup_token_expires_at is required.', errors)
        return errors
      },
    })
    const activationSetupToken = activation.setup_token

    await assertAccountActivationStatus({
      client: databaseClient,
      reporter,
      accountId: state.accountId,
      expectedStatus: 'SETTING_UP_CREDENTIALS',
    })

    await expectApiStep({
      client,
      reporter,
      name: 'Credentials and working hours are saved',
      url: `${config.apiUrl}/employee/account/credentials`,
      options: {
        method: 'POST',
        json: {
          old_username: testData.pendingUsername,
          old_phone_number: testData.phoneNumber,
          new_username: testData.activeUsername,
          new_phone_number: testData.phoneNumber,
          new_password: testData.initialPassword,
          password_confirmation: testData.initialPassword,
          setup_token: activationSetupToken,
          working_hours: workingHours,
        },
      },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.activated === true, 'activated must be true.', errors)
        check(body.working_hours_saved === true, 'working_hours_saved must be true.', errors)
        return errors
      },
    })

    reporter.section('Activated employee')
    const employeeAuth = await expectApiStep({
      client,
      reporter,
      name: 'Activated employee authenticates',
      url: `${config.apiUrl}/employee/auth`,
      options: {
        method: 'POST',
        json: {
          username: testData.activeUsername,
          phone_number: testData.phoneNumber,
          password: testData.initialPassword,
          valid_time: config.owner.validTime,
        },
      },
      expectedStatus: 200,
      validate: authValidation(config.testEmployeeRole),
    })
    state.employeeToken = employeeAuth.token

    const pendingAfterActivation = await expectApiStep({
      client,
      reporter,
      name: 'Activated account leaves pending list',
      url: `${config.apiUrl}/owner/accounts/pending`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        check(Array.isArray(body), 'Pending list must be an array.', errors)
        check(
          !containsAccount(body, {
            idKey: 'account_id',
            id: state.accountId,
            username: testData.pendingUsername,
          }),
          'Activated account still appears as pending.',
          errors,
        )
        return errors
      },
    })
    void pendingAfterActivation

    await assertRowAbsent({
      client: databaseClient,
      reporter,
      name: 'Activation row was removed after credentials',
      table: 'account_activation',
      columns: ['account_id'],
      filters: { account_id: state.accountId },
    })

    const createdList = await expectApiStep({
      client,
      reporter,
      name: 'Activated employee appears in created list',
      url: `${config.apiUrl}/owner/accounts/created`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        check(Array.isArray(body), 'Created list must be an array.', errors)
        const matchingRow = Array.isArray(body)
          ? body.find((row) => (
              isRecord(row) && (row.employee_id === state.accountId || row.username === testData.activeUsername)
            ))
          : null
        check(Boolean(matchingRow), 'Activated employee was not found.', errors)
        check(
          isRecord(matchingRow) && isNonEmptyString(matchingRow.employee_id),
          'Created employee_id is required.',
          errors,
        )
        return errors
      },
    })
    const createdRow = createdList.find((row) => (
      isRecord(row) && (row.employee_id === state.accountId || row.username === testData.activeUsername)
    ))
    state.employeeId = createdRow.employee_id

    await assertEmployeeActiveState({
      client: databaseClient,
      reporter,
      employeeId: state.employeeId,
      expectedActive: true,
    })
    await assertWorkingHoursExact({
      client: databaseClient,
      reporter,
      employeeId: state.employeeId,
      expectedIntervals: workingHours,
    })

    const employeeHeaders = buildOwnerHeaders({
      username: testData.activeUsername,
      phoneNumber: testData.phoneNumber,
      token: state.employeeToken,
    })
    const employeeProfileValidation = currentProfileValidation({
      employeeId: state.employeeId,
      username: testData.activeUsername,
      phoneNumber: testData.phoneNumber,
      role: config.testEmployeeRole,
      workingHours,
    })

    await expectApiStep({
      client,
      reporter,
      name: 'Employee loads their current profile and working hours',
      url: `${config.apiUrl}/employee/admin/employee/profile`,
      options: { headers: employeeHeaders },
      expectedStatus: 200,
      validate: employeeProfileValidation,
    })

    const profileSpoofingChecks = [
      {
        name: 'Spoofed role header cannot change the employee profile',
        url: `${config.apiUrl}/employee/admin/employee/profile`,
        headers: { ...employeeHeaders, 'X-Employee-Role': 'OWNER' },
      },
      {
        name: 'Role query cannot change the employee profile',
        url: `${config.apiUrl}/employee/admin/employee/profile?role=OWNER`,
        headers: employeeHeaders,
      },
      {
        name: 'Employee ID query cannot select another profile',
        url: `${config.apiUrl}/employee/admin/employee/profile?employee_id=${encodeURIComponent(state.ownerEmployeeId)}`,
        headers: employeeHeaders,
      },
    ]
    for (const spoofingCheck of profileSpoofingChecks) {
      await expectApiStep({
        client,
        reporter,
        name: spoofingCheck.name,
        url: spoofingCheck.url,
        options: { headers: spoofingCheck.headers },
        expectedStatus: 200,
        validate: employeeProfileValidation,
      })
    }

    const createdProfile = await expectApiStep({
      client,
      reporter,
      name: 'Created employee profile is active and correct',
      url: `${config.apiUrl}/owner/accounts/created/${encodeURIComponent(state.employeeId)}`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        const account = isRecord(body) && isRecord(body.account) ? body.account : null
        check(Boolean(account), 'account profile is required.', errors)
        if (!account) return errors
        check(account.employee_id === state.employeeId, 'employee_id does not match.', errors)
        check(account.username === testData.activeUsername, 'username does not match.', errors)
        check(account.phone_number === testData.phoneNumber, 'phone_number does not match.', errors)
        check(account.role === config.testEmployeeRole, 'role does not match.', errors)
        check(account.is_active === true, 'is_active must be true.', errors)
        return errors
      },
    })
    void createdProfile

    reporter.section('Deactivation and reactivation')
    await expectApiStep({
      client,
      reporter,
      name: 'Reactivation is rejected while employee is active',
      url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(state.employeeId)}`,
      options: { method: 'POST', headers: ownerHeaders },
      expectedStatus: 409,
      validate: () => [],
    })

    await expectApiStep({
      client,
      reporter,
      name: 'Owner deactivates employee',
      url: `${config.apiUrl}/owner/account/deactivate?employee_id=${encodeURIComponent(state.employeeId)}`,
      options: { method: 'POST', headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.deactivated === true, 'deactivated must be true.', errors)
        check(body.employee_id === state.employeeId, 'employee_id does not match.', errors)
        check(body.employee_status === 'INACTIVE', 'employee_status must be INACTIVE.', errors)
        return errors
      },
    })
    state.employeeToken = null

    await assertEmployeeActiveState({
      client: databaseClient,
      reporter,
      employeeId: state.employeeId,
      expectedActive: false,
    })

    await expectApiStep({
      client,
      reporter,
      name: 'Created employee profile becomes inactive',
      url: `${config.apiUrl}/owner/accounts/created/${encodeURIComponent(state.employeeId)}`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        const account = isRecord(body) && isRecord(body.account) ? body.account : null
        check(Boolean(account), 'account profile is required.', errors)
        if (account) check(account.is_active === false, 'is_active must be false.', errors)
        return errors
      },
    })

    const reactivation = await expectApiStep({
      client,
      reporter,
      name: 'Owner starts employee reactivation',
      url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(state.employeeId)}`,
      options: { method: 'POST', headers: ownerHeaders },
      expectedStatus: 200,
      allowedSensitiveKeys: ['reactivation_code'],
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.reactivation_created === true, 'reactivation_created must be true.', errors)
        check(body.employee_id === state.employeeId, 'employee_id does not match.', errors)
        check(isNonEmptyString(body.reactivation_id), 'reactivation_id is required.', errors)
        check(isNonEmptyString(body.reactivation_code), 'reactivation_code is required.', errors)
        check(body.reactivation_status === 'PENDING_VERIFICATION', 'Unexpected reactivation status.', errors)
        check(isNonEmptyString(body.code_expires_at), 'code_expires_at is required.', errors)
        return errors
      },
    })
    state.reactivationId = reactivation.reactivation_id
    const reactivationCode = reactivation.reactivation_code

    await assertReactivationStatus({
      client: databaseClient,
      reporter,
      reactivationId: state.reactivationId,
      expectedStatus: 'PENDING_VERIFICATION',
    })
    await assertRowFieldEquals({
      client: databaseClient,
      reporter,
      name: 'Reactivation references the expected employee',
      table: 'account_reactivation',
      idColumn: 'reactivation_id',
      id: state.reactivationId,
      field: 'employee_id',
      expected: state.employeeId,
    })

    await expectApiStep({
      client,
      reporter,
      name: 'Created profile exposes safe pending reactivation state',
      url: `${config.apiUrl}/owner/accounts/created/${encodeURIComponent(state.employeeId)}`,
      options: { headers: ownerHeaders },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        const reactivationState = isRecord(body) && isRecord(body.reactivation)
          ? body.reactivation
          : null
        check(Boolean(reactivationState), 'Safe reactivation state is required.', errors)
        if (reactivationState) {
          check(
            reactivationState.status === 'PENDING_VERIFICATION',
            'Reactivation state is not PENDING_VERIFICATION.',
            errors,
          )
        }
        check(
          !isRecord(body) || !('reactivation_code' in body) && !('activation_code' in body),
          'Profile must not return a public code.',
          errors,
        )
        return errors
      },
    })

    const verifiedReactivation = await expectApiStep({
      client,
      reporter,
      name: 'Employee reactivation code verifies',
      url: `${config.apiUrl}/employee/account/activate`,
      options: {
        method: 'POST',
        json: {
          name: testData.activeUsername,
          phone_number: testData.phoneNumber,
          activation_code: reactivationCode,
        },
      },
      expectedStatus: 200,
      allowedSensitiveKeys: ['setup_token', 'setup_token_expires_at'],
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.verified === true, 'verified must be true.', errors)
        check(body.flow === 'REACTIVATION', 'flow must be REACTIVATION.', errors)
        check(body.reactivation_id === state.reactivationId, 'reactivation_id does not match.', errors)
        check(isNonEmptyString(body.setup_token), 'setup_token is required.', errors)
        check(isNonEmptyString(body.setup_token_expires_at), 'setup_token_expires_at is required.', errors)
        return errors
      },
    })
    const reactivationSetupToken = verifiedReactivation.setup_token

    await assertReactivationStatus({
      client: databaseClient,
      reporter,
      reactivationId: state.reactivationId,
      expectedStatus: 'SETTING_UP_CREDENTIALS',
    })

    await expectApiStep({
      client,
      reporter,
      name: 'Employee renews password and completes reactivation',
      url: `${config.apiUrl}/employee/account/reactivation/credentials`,
      options: {
        method: 'POST',
        json: {
          reactivation_id: state.reactivationId,
          setup_token: reactivationSetupToken,
          new_password: testData.renewedPassword,
          password_confirmation: testData.renewedPassword,
        },
      },
      expectedStatus: 200,
      validate: (body) => {
        const errors = []
        check(isRecord(body), 'Response must be an object.', errors)
        if (!isRecord(body)) return errors
        check(body.reactivated === true, 'reactivated must be true.', errors)
        check(body.employee_id === state.employeeId, 'employee_id does not match.', errors)
        check(body.employee_status === 'ACTIVE', 'employee_status must be ACTIVE.', errors)
        check(body.reactivation_status === 'COMPLETED', 'reactivation_status must be COMPLETED.', errors)
        return errors
      },
    })

    await assertEmployeeActiveState({
      client: databaseClient,
      reporter,
      employeeId: state.employeeId,
      expectedActive: true,
    })
    await assertReactivationStatus({
      client: databaseClient,
      reporter,
      reactivationId: state.reactivationId,
      expectedStatus: 'COMPLETED',
    })

    const renewedAuth = await expectApiStep({
      client,
      reporter,
      name: 'Reactivated employee authenticates with renewed password',
      url: `${config.apiUrl}/employee/auth`,
      options: {
        method: 'POST',
        json: {
          username: testData.activeUsername,
          phone_number: testData.phoneNumber,
          password: testData.renewedPassword,
          valid_time: config.owner.validTime,
        },
      },
      expectedStatus: 200,
      validate: authValidation(config.testEmployeeRole),
    })
    state.employeeToken = renewedAuth.token
  } catch (error) {
    if (!(error instanceof FlowAbort)) {
      reporter.fail('Unexpected full-flow script error', {
        error: error instanceof Error ? error.message : 'Unknown script error',
      })
    }
  } finally {
    reporter.section('Session cleanup')
    await logout({
      client,
      reporter,
      apiUrl: config.apiUrl,
      username: testData.activeUsername,
      phoneNumber: testData.phoneNumber,
      token: state.employeeToken,
      label: 'Employee',
    })
    await logout({
      client,
      reporter,
      apiUrl: config.apiUrl,
      username: config.owner.username,
      phoneNumber: config.owner.phoneNumber,
      token: state.ownerToken,
      label: 'Owner',
    })

    reporter.section('Manual data cleanup')
    reporter.skip('Automatic database cleanup is intentionally unavailable', {
      reason: 'No employee deletion API exists. Remove dependent rows before removing the employee.',
      cleanupOrder: [
        'account_reactivation by reactivation_id or employee_id',
        'employee_working_hours by employee_id',
        'account_activation by account_id if the flow stopped before activation',
        'employees by employee_id',
      ],
      manifest: {
        runId: testData.runId,
        pendingUsername: testData.pendingUsername,
        activeUsername: testData.activeUsername,
        phoneNumber: testData.phoneNumber,
        accountId: state.accountId,
        employeeId: state.employeeId,
        reactivationId: state.reactivationId,
      },
    })

    await reporter.finish()
    if (reporter.hasFailures) process.exitCode = 1
  }
}

main()
