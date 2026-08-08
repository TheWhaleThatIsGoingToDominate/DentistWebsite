import { createApiClient } from './apiClient.js'
import { DeploymentConfigError, loadDeploymentConfig } from './config.js'
import {
  assertAccountActivationStatus,
  assertActivationFailedAttempts,
  assertEmployeeActiveState,
  assertNullableFieldEquals,
  assertReactivationFailedAttempts,
  assertReactivationStatus,
  assertRowAbsent,
  assertRowCount,
  assertWorkingHoursExact,
} from './databaseAssertions.js'
import { DeploymentReporter } from './reporter.js'
import { createSupabaseReadClient } from './supabaseReadClient.js'
import { createRunId, createSyntheticPhone, createTestPassword } from './testData.js'

const validWorkingHours = Object.freeze([
  Object.freeze({ day_of_week: 0, start_minute: 540, end_minute: 1020, working_status: true }),
  Object.freeze({ day_of_week: 2, start_minute: 600, end_minute: 1080, working_status: true }),
])

const forbiddenResponseKeyPattern = /password|hash|salt|lookup|setup[_-]?token|token[_-]?salt|activation[_-]?code|reactivation[_-]?code|(^|[_-])token($|[_-])/i
const safeExpiryMetadataKeys = new Set(['setup_token_expiry_time', 'setup_token_expires_at'])

class ScenarioAbort extends Error {
  constructor(stepName) {
    super(`Scenario stopped after: ${stepName}`)
    this.name = 'ScenarioAbort'
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function check(condition, message, errors) {
  if (!condition) errors.push(message)
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
  const forbiddenKeys = findForbiddenResponseKeys(result.body, new Set(allowedSensitiveKeys))

  if (result.status !== expectedStatus || validationErrors.length > 0 || forbiddenKeys.length > 0) {
    reporter.fail(name, safeResultDetails(result, validationErrors, forbiddenKeys))
    throw new ScenarioAbort(name)
  }

  reporter.pass(name, {
    path: new URL(result.url || url).pathname,
    httpStatus: result.status,
  })
  return result.body
}

async function runScenario(reporter, name, action) {
  reporter.section(name)
  try {
    await action()
  } catch (error) {
    if (!(error instanceof ScenarioAbort)) {
      reporter.fail(`${name} stopped unexpectedly`, {
        error: error instanceof Error ? error.message : 'Unknown scenario error',
      })
    }
  }
}

function createFixture(config, label) {
  const runId = createRunId()
  const base = `${config.testRunPrefix}_neg_${label}_${runId}`.toLowerCase()
  return {
    label,
    runId,
    pendingUsername: `${base}_pending`,
    activeUsername: `${base}_active`,
    phoneNumber: createSyntheticPhone(config.testPhonePrefix),
    initialPassword: createTestPassword(`${label}Initial`),
    renewedPassword: createTestPassword(`${label}Renewed`),
    accountId: null,
    employeeId: null,
    reactivationId: null,
  }
}

function accountCreationValidation(expectedRole) {
  return (body) => {
    const errors = []
    const employee = isRecord(body) && isRecord(body.employee) ? body.employee : null
    check(isRecord(body), 'Response must be an object.', errors)
    check(body?.created === true, 'created must be true.', errors)
    check(Boolean(employee), 'employee result is required.', errors)
    if (employee) {
      check(isNonEmptyString(employee.account_id), 'account_id is required.', errors)
      check(employee.role === expectedRole, `role must be ${expectedRole}.`, errors)
      check(employee.status === 'PENDING_VERIFICATION', 'status must be PENDING_VERIFICATION.', errors)
    }
    check(isNonEmptyString(body?.activation_code), 'activation_code is required.', errors)
    check(isNonEmptyString(body?.activation_expires_at), 'activation expiry is required.', errors)
    return errors
  }
}

function profileRejectionValidation(body) {
  const errors = []
  check(!isRecord(body) || !('profile' in body), 'Rejected profile request returned profile data.', errors)
  return errors
}

function authValidation(expectedRole, sessionClient) {
  return (body) => {
    const errors = []
    const cookie = sessionClient.getLastCookieMetadata()
    check(body?.allowed === true, 'allowed must be true.', errors)
    check(isNonEmptyString(body?.expires_at) && !Number.isNaN(Date.parse(body.expires_at)), 'expires_at must be valid.', errors)
    check(body?.role === expectedRole, `role must be ${expectedRole}.`, errors)
    check(!isRecord(body) || !('token' in body), 'Login JSON must not contain token.', errors)
    check(!isRecord(body) || !('employee_id' in body), 'Login JSON must not contain employee_id.', errors)
    check(sessionClient.hasSessionCookie(), 'Session cookie was not captured.', errors)
    check(cookie?.name === '__Host-aurora_session', 'Unexpected session cookie name.', errors)
    check(cookie?.received === true, 'Session cookie metadata must show receipt.', errors)
    check(cookie?.httpOnly === true, 'Session cookie must be HttpOnly.', errors)
    check(cookie?.secure === true, 'Session cookie must be Secure.', errors)
    check(cookie?.sameSite?.toLowerCase() === 'none', 'Session cookie must use SameSite=None.', errors)
    check(cookie?.path === '/', 'Session cookie must use Path=/.', errors)
    check(cookie?.deleted === false, 'Login cookie must not be a deletion cookie.', errors)
    return errors
  }
}

function currentProfileValidation({ employeeId, username, phoneNumber, role }) {
  return (body) => {
    const errors = []
    const profile = isRecord(body) && isRecord(body.profile) ? body.profile : null
    check(Boolean(profile), 'profile is required.', errors)
    if (!profile) return errors
    check(profile.employee_id === employeeId, 'Authenticated employee_id changed.', errors)
    check(profile.username === username, 'Authenticated username changed.', errors)
    check(profile.phone_number === phoneNumber, 'Authenticated phone number changed.', errors)
    check(profile.role === role, 'Authenticated role changed.', errors)
    return errors
  }
}

async function createPendingAccount({ ownerClient, reporter, config, fixture }) {
  const body = await expectApiStep({
    client: ownerClient,
    reporter,
    name: `${fixture.label}: owner creates pending account`,
    url: `${config.apiUrl}/owner/createAccount`,
    options: {
      method: 'POST',
      json: {
        name: fixture.pendingUsername,
        phone_number: fixture.phoneNumber,
        role: config.testEmployeeRole,
      },
    },
    expectedStatus: 201,
    allowedSensitiveKeys: ['activation_code'],
    validate: accountCreationValidation(config.testEmployeeRole),
  })

  fixture.accountId = body.employee.account_id
  fixture.employeeId = fixture.accountId
  return body.activation_code
}

async function verifyActivation({ publicClient, reporter, config, fixture, activationCode }) {
  const body = await expectApiStep({
    client: publicClient,
    reporter,
    name: `${fixture.label}: activation code verifies`,
    url: `${config.apiUrl}/employee/account/activate`,
    options: {
      method: 'POST',
      json: {
        name: fixture.pendingUsername,
        phone_number: fixture.phoneNumber,
        activation_code: activationCode,
      },
    },
    expectedStatus: 200,
    allowedSensitiveKeys: ['setup_token', 'setup_token_expires_at'],
    validate: (body) => {
      const errors = []
      check(body?.verified === true, 'verified must be true.', errors)
      check(body?.flow === 'ACTIVATION', 'flow must be ACTIVATION.', errors)
      check(isNonEmptyString(body?.setup_token), 'setup_token is required.', errors)
      return errors
    },
  })
  return body.setup_token
}

function credentialsPayload(fixture, setupToken, workingHours = validWorkingHours) {
  return {
    old_username: fixture.pendingUsername,
    old_phone_number: fixture.phoneNumber,
    new_username: fixture.activeUsername,
    new_phone_number: fixture.phoneNumber,
    new_password: fixture.initialPassword,
    password_confirmation: fixture.initialPassword,
    setup_token: setupToken,
    working_hours: workingHours,
  }
}

async function submitValidCredentials({ publicClient, reporter, config, fixture, setupToken }) {
  await expectApiStep({
    client: publicClient,
    reporter,
    name: `${fixture.label}: valid credentials complete activation`,
    url: `${config.apiUrl}/employee/account/credentials`,
    options: {
      method: 'POST',
      json: credentialsPayload(fixture, setupToken),
    },
    expectedStatus: 200,
    validate: (body) => {
      const errors = []
      check(body?.activated === true, 'activated must be true.', errors)
      check(body?.working_hours_saved === true, 'working_hours_saved must be true.', errors)
      return errors
    },
  })
}

async function createActiveEmployee(context, fixture) {
  const activationCode = await createPendingAccount({ ...context, fixture })
  const setupToken = await verifyActivation({ ...context, fixture, activationCode })
  await submitValidCredentials({ ...context, fixture, setupToken })
}

async function deactivateEmployee({ ownerClient, reporter, config, fixture }) {
  await expectApiStep({
    client: ownerClient,
    reporter,
    name: `${fixture.label}: owner deactivates employee`,
    url: `${config.apiUrl}/owner/account/deactivate?employee_id=${encodeURIComponent(fixture.employeeId)}`,
    options: { method: 'POST' },
    expectedStatus: 200,
    validate: (body) => {
      const errors = []
      check(body?.deactivated === true, 'deactivated must be true.', errors)
      check(body?.employee_id === fixture.employeeId, 'employee_id does not match.', errors)
      check(body?.employee_status === 'INACTIVE', 'employee_status must be INACTIVE.', errors)
      return errors
    },
  })
}

async function startReactivation({ ownerClient, reporter, config, fixture }) {
  const body = await expectApiStep({
    client: ownerClient,
    reporter,
    name: `${fixture.label}: owner starts reactivation`,
    url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
    options: { method: 'POST' },
    expectedStatus: 200,
    allowedSensitiveKeys: ['reactivation_code'],
    validate: (body) => {
      const errors = []
      check(body?.reactivation_created === true, 'reactivation_created must be true.', errors)
      check(body?.employee_id === fixture.employeeId, 'employee_id does not match.', errors)
      check(isNonEmptyString(body?.reactivation_id), 'reactivation_id is required.', errors)
      check(isNonEmptyString(body?.reactivation_code), 'reactivation_code is required.', errors)
      check(body?.reactivation_status === 'PENDING_VERIFICATION', 'status must be PENDING_VERIFICATION.', errors)
      return errors
    },
  })
  fixture.reactivationId = body.reactivation_id
  return body.reactivation_code
}

async function verifyReactivation({ publicClient, reporter, config, fixture, reactivationCode }) {
  const body = await expectApiStep({
    client: publicClient,
    reporter,
    name: `${fixture.label}: reactivation code verifies`,
    url: `${config.apiUrl}/employee/account/activate`,
    options: {
      method: 'POST',
      json: {
        name: fixture.activeUsername,
        phone_number: fixture.phoneNumber,
        activation_code: reactivationCode,
      },
    },
    expectedStatus: 200,
    allowedSensitiveKeys: ['setup_token', 'setup_token_expires_at'],
    validate: (body) => {
      const errors = []
      check(body?.verified === true, 'verified must be true.', errors)
      check(body?.flow === 'REACTIVATION', 'flow must be REACTIVATION.', errors)
      check(body?.reactivation_id === fixture.reactivationId, 'reactivation_id does not match.', errors)
      check(isNonEmptyString(body?.setup_token), 'setup_token is required.', errors)
      return errors
    },
  })
  return body.setup_token
}

function wrongCodeFor(realCode) {
  return realCode === 'WRONG000' ? 'WRONG001' : 'WRONG000'
}

async function logoutOwner({ ownerClient, reporter, config }) {
  if (!ownerClient.hasSessionCookie()) {
    reporter.skip('Owner logout', { reason: 'No owner session cookie was created.' })
    return
  }

  const result = await ownerClient.request(`${config.apiUrl}/employee/auth/logout`, {
    method: 'POST',
  })
  const cookie = result.cookieMetadata
  if (
    result.status === 200
    && isRecord(result.body)
    && result.body.success === true
    && Object.keys(result.body).length === 1
    && cookie?.name === '__Host-aurora_session'
    && cookie.deleted === true
    && !ownerClient.hasSessionCookie()
  ) {
    reporter.pass('Owner logout', { path: '/employee/auth/logout', httpStatus: 200 })
  } else {
    reporter.fail('Owner logout', safeResultDetails(result))
  }

  const afterLogout = await ownerClient.request(`${config.apiUrl}/owner/accounts/created`)
  if (afterLogout.status === 401) {
    reporter.pass('Owner session is rejected after logout', {
      path: '/owner/accounts/created',
      httpStatus: 401,
    })
  } else {
    reporter.fail('Owner session is rejected after logout', safeResultDetails(afterLogout))
  }
}

async function main() {
  let config
  try {
    config = loadDeploymentConfig()
  } catch (error) {
    const message = error instanceof DeploymentConfigError
      ? error.message
      : 'Deployment configuration failed.'
    console.error(`CONFIG ERROR: ${message}`)
    process.exitCode = 1
    return
  }

  const reporter = new DeploymentReporter({ reportPath: config.flags.reportPath })
  reporter.section('Safety')
  if (!config.flags.write || !config.flags.confirmNoCleanup) {
    reporter.fail('Negative-test state changes were refused', {
      reason: 'Both --write and --confirm-no-cleanup are required.',
      writeEnabled: config.flags.write,
      cleanupAcknowledged: config.flags.confirmNoCleanup,
    })
    await reporter.finish()
    process.exitCode = 1
    return
  }

  const publicClient = createApiClient({ timeoutMs: config.timeoutMs, verbose: config.flags.verbose })
  const ownerClient = createApiClient({
    timeoutMs: config.timeoutMs,
    verbose: config.flags.verbose,
    cookieSession: true,
    requestOrigin: config.frontendOrigin,
  })
  const employeeClient = createApiClient({
    timeoutMs: config.timeoutMs,
    verbose: config.flags.verbose,
    cookieSession: true,
    requestOrigin: config.frontendOrigin,
  })
  const attackClient = createApiClient({ timeoutMs: config.timeoutMs, verbose: config.flags.verbose })
  const databaseClient = createSupabaseReadClient({
    enabled: config.flags.dbCheck,
    supabaseUrl: config.supabase?.url,
    serviceRoleKey: config.supabase?.serviceRoleKey,
    timeoutMs: config.timeoutMs,
    verbose: config.flags.verbose,
  })
  if (databaseClient.enabled) {
    reporter.pass('Restricted read-only database confirmation enabled')
  } else {
    reporter.skip('Database confirmation', { reason: 'Run with --db-check to enable GET-only checks.' })
  }

  const fixtures = {
    duplicate: createFixture(config, 'duplicate'),
    activationRevoked: createFixture(config, 'activation_revoked'),
    shared: createFixture(config, 'shared'),
    reactivationRevoked: createFixture(config, 'reactivation_revoked'),
  }
  try {
    reporter.section('Owner authentication')

    const csrfLoginBody = {
      username: 'csrf_origin_probe',
      phone_number: '01900000000',
      password: 'not-a-real-password',
      valid_time: config.owner.validTime,
    }
    await runScenario(reporter, 'Login CSRF protection', async () => {
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Login rejects missing Origin',
        url: `${config.apiUrl}/employee/auth`,
        options: { method: 'POST', json: csrfLoginBody },
        expectedStatus: 403,
      })
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Login rejects malicious Origin',
        url: `${config.apiUrl}/employee/auth`,
        options: {
          method: 'POST',
          headers: { Origin: 'https://malicious.example' },
          json: csrfLoginBody,
        },
        expectedStatus: 403,
      })
    })

    await expectApiStep({
      client: ownerClient,
      reporter,
      name: 'Dedicated owner authenticates',
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
      validate: authValidation('OWNER', ownerClient),
    })

    await runScenario(reporter, 'Authenticated CSRF status distinction', async () => {
      const protectedMutationUrl = `${config.apiUrl}/owner/account/deactivate?employee_id=ID-fabricated-csrf-probe`
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Trusted Origin with missing cookie is unauthorized',
        url: protectedMutationUrl,
        options: { method: 'POST', headers: { Origin: config.frontendOrigin } },
        expectedStatus: 401,
      })
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Trusted Origin with fabricated cookie is unauthorized',
        url: protectedMutationUrl,
        options: {
          method: 'POST',
          headers: {
            Origin: config.frontendOrigin,
            Cookie: '__Host-aurora_session=ID-fabricated.fabricated-csrf-token',
          },
        },
        expectedStatus: 401,
      })
      await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Protected GET remains available without Origin',
        url: `${config.apiUrl}/owner/accounts/created`,
        options: { suppressRequestOrigin: true },
        expectedStatus: 200,
        validate: (body) => Array.isArray(body) ? [] : ['Created account list must be an array.'],
      })
    })

    await runScenario(reporter, 'Missing owner authentication', async () => {
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Owner endpoint rejects missing authentication',
        url: `${config.apiUrl}/owner/accounts/created`,
        expectedStatus: 401,
      })
    })

    await runScenario(reporter, 'Malformed session cookie', async () => {
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Owner endpoint rejects malformed session cookie',
        url: `${config.apiUrl}/owner/accounts/created`,
        options: { headers: { Cookie: '__Host-aurora_session=malformed' } },
        expectedStatus: 401,
      })
    })

    await runScenario(reporter, 'Fabricated employee ID and token cookie', async () => {
      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Owner endpoint rejects fabricated cookie identity and token',
        url: `${config.apiUrl}/owner/accounts/created`,
        options: {
          headers: { Cookie: '__Host-aurora_session=ID-fabricated.fabricated-negative-test-token' },
        },
        expectedStatus: 401,
      })
    })

    const profileRejectionCases = [
      { name: 'Profile endpoint rejects missing authentication' },
      {
        name: 'Profile endpoint rejects a fabricated session cookie',
        headers: { Cookie: '__Host-aurora_session=ID-fabricated.fabricated-profile-test-token' },
      },
    ]

    for (const rejectionCase of profileRejectionCases) {
      await runScenario(reporter, rejectionCase.name, async () => {
        await expectApiStep({
          client: attackClient,
          reporter,
          name: rejectionCase.name,
          url: `${config.apiUrl}/employee/admin/employee/profile`,
          options: rejectionCase.headers ? { headers: rejectionCase.headers } : {},
          expectedStatus: 401,
          validate: profileRejectionValidation,
        })
      })
    }

    await runScenario(reporter, 'Duplicate pending account', async () => {
      const fixture = fixtures.duplicate
      await createPendingAccount({ ownerClient, reporter, config, fixture })
      await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Duplicate pending identity is rejected',
        url: `${config.apiUrl}/owner/createAccount`,
        options: {
          method: 'POST',
          json: {
            name: fixture.pendingUsername,
            phone_number: fixture.phoneNumber,
            role: config.testEmployeeRole,
          },
        },
        expectedStatus: 409,
      })

      const pendingRows = await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Pending list contains one matching identity',
        url: `${config.apiUrl}/owner/accounts/pending`,
        expectedStatus: 200,
        validate: (body) => {
          const errors = []
          check(Array.isArray(body), 'Pending list must be an array.', errors)
          const matches = Array.isArray(body)
            ? body.filter((row) => row?.username === fixture.pendingUsername)
            : []
          check(matches.length === 1, `Expected one matching pending row, received ${matches.length}.`, errors)
          return errors
        },
      })
      void pendingRows

      if (databaseClient.enabled) {
        await assertAccountActivationStatus({
          client: databaseClient,
          reporter,
          accountId: fixture.accountId,
          expectedStatus: 'PENDING_VERIFICATION',
        })
      }
    })

    await runScenario(reporter, 'Activation-code attempt limit', async () => {
      const fixture = fixtures.activationRevoked
      const activationCode = await createPendingAccount({ ownerClient, reporter, config, fixture })
      const wrongCode = wrongCodeFor(activationCode)

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await expectApiStep({
          client: publicClient,
          reporter,
          name: `${fixture.label}: incorrect activation attempt ${attempt} is rejected`,
          url: `${config.apiUrl}/employee/account/activate`,
          options: {
            method: 'POST',
            json: {
              name: fixture.pendingUsername,
              phone_number: fixture.phoneNumber,
              activation_code: wrongCode,
            },
          },
          expectedStatus: attempt === 5 ? 429 : 401,
        })

        if (databaseClient.enabled) {
          await assertActivationFailedAttempts({
            client: databaseClient,
            reporter,
            accountId: fixture.accountId,
            expectedAttempts: attempt,
            name: `Activation failed_attempts persisted as ${attempt}`,
          })
          await assertAccountActivationStatus({
            client: databaseClient,
            reporter,
            accountId: fixture.accountId,
            expectedStatus: attempt === 5 ? 'REVOKED' : 'PENDING_VERIFICATION',
            name: `Activation status after incorrect attempt ${attempt}`,
          })
        }
      }

      if (databaseClient.enabled) {
        await assertNullableFieldEquals({
          client: databaseClient,
          reporter,
          name: 'Revoked activation clears code expiry',
          table: 'account_activation',
          idColumn: 'account_id',
          id: fixture.accountId,
          field: 'code_expiry_time',
        })
      }
    })

    await runScenario(reporter, 'Working-hours and reactivation safeguards', async () => {
      const fixture = fixtures.shared
      const activationCode = await createPendingAccount({ ownerClient, reporter, config, fixture })
      const setupToken = await verifyActivation({ publicClient, reporter, config, fixture, activationCode })
      const invalidSchedules = [
        {
          label: 'duplicate day_of_week',
          value: [validWorkingHours[0], { ...validWorkingHours[0], start_minute: 600 }],
        },
        {
          label: 'start equals end',
          value: [{ day_of_week: 1, start_minute: 600, end_minute: 600, working_status: true }],
        },
        {
          label: 'start exceeds end',
          value: [{ day_of_week: 1, start_minute: 900, end_minute: 600, working_status: true }],
        },
        {
          label: 'working_status is not boolean',
          value: [{ day_of_week: 1, start_minute: 600, end_minute: 900, working_status: 'true' }],
        },
        { label: 'working_hours is empty', value: [] },
        {
          label: 'working_hours exceeds seven intervals',
          value: Array.from({ length: 8 }, (_, index) => ({
            day_of_week: index % 7,
            start_minute: 540,
            end_minute: 1020,
            working_status: true,
          })),
        },
      ]

      for (const invalidSchedule of invalidSchedules) {
        await expectApiStep({
          client: publicClient,
          reporter,
          name: `Credentials reject ${invalidSchedule.label}`,
          url: `${config.apiUrl}/employee/account/credentials`,
          options: {
            method: 'POST',
            json: credentialsPayload(fixture, setupToken, invalidSchedule.value),
          },
          expectedStatus: 422,
        })
      }

      if (databaseClient.enabled) {
        await assertAccountActivationStatus({
          client: databaseClient,
          reporter,
          accountId: fixture.accountId,
          expectedStatus: 'SETTING_UP_CREDENTIALS',
          name: 'Invalid schedules leave activation in credential setup',
        })
        await assertRowAbsent({
          client: databaseClient,
          reporter,
          name: 'Invalid schedules do not create employee',
          table: 'employees',
          columns: ['employee_id'],
          filters: { employee_id: fixture.employeeId },
        })
        await assertRowAbsent({
          client: databaseClient,
          reporter,
          name: 'Invalid schedules do not create working hours',
          table: 'employee_working_hours',
          columns: ['employee_id'],
          filters: { employee_id: fixture.employeeId },
        })
      }

      await submitValidCredentials({ publicClient, reporter, config, fixture, setupToken })
      if (databaseClient.enabled) {
        await assertEmployeeActiveState({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedActive: true,
        })
        await assertWorkingHoursExact({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedIntervals: validWorkingHours,
        })
      }

      await expectApiStep({
        client: employeeClient,
        reporter,
        name: 'Disposable employee authenticates with a cookie session',
        url: `${config.apiUrl}/employee/auth`,
        options: {
          method: 'POST',
          json: {
            username: fixture.activeUsername,
            phone_number: fixture.phoneNumber,
            password: fixture.initialPassword,
            valid_time: config.owner.validTime,
          },
        },
        expectedStatus: 200,
        validate: authValidation(config.testEmployeeRole, employeeClient),
      })

      await expectApiStep({
        client: attackClient,
        reporter,
        name: 'Valid employee ID with fabricated token is rejected',
        url: `${config.apiUrl}/employee/admin/employee/profile`,
        options: {
          headers: {
            Cookie: `__Host-aurora_session=${fixture.employeeId}.fabricated-negative-test-token`,
          },
        },
        expectedStatus: 401,
        validate: profileRejectionValidation,
      })

      const employeeProfileValidation = currentProfileValidation({
        employeeId: fixture.employeeId,
        username: fixture.activeUsername,
        phoneNumber: fixture.phoneNumber,
        role: config.testEmployeeRole,
      })
      const profileSpoofingCases = [
        {
          name: 'Spoofed role header cannot elevate employee profile',
          url: `${config.apiUrl}/employee/admin/employee/profile`,
          headers: { 'X-Employee-Role': 'OWNER' },
        },
        {
          name: 'Role query cannot elevate employee profile',
          url: `${config.apiUrl}/employee/admin/employee/profile?role=OWNER`,
        },
        {
          name: 'Employee ID query cannot select another profile',
          url: `${config.apiUrl}/employee/admin/employee/profile?employee_id=ID-fabricated-other-user`,
        },
      ]
      for (const spoofingCase of profileSpoofingCases) {
        await expectApiStep({
          client: employeeClient,
          reporter,
          name: spoofingCase.name,
          url: spoofingCase.url,
          options: spoofingCase.headers ? { headers: spoofingCase.headers } : {},
          expectedStatus: 200,
          validate: employeeProfileValidation,
        })
      }

      const deactivationUrl = `${config.apiUrl}/owner/account/deactivate?employee_id=${encodeURIComponent(fixture.employeeId)}`
      await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Employee deactivation rejects missing Origin',
        url: deactivationUrl,
        options: { method: 'POST', suppressRequestOrigin: true },
        expectedStatus: 403,
      })
      if (databaseClient.enabled) {
        await assertEmployeeActiveState({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedActive: true,
          name: 'Missing-Origin rejection leaves employee active',
        })
      }

      await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Employee deactivation rejects malicious Origin',
        url: deactivationUrl,
        options: {
          method: 'POST',
          headers: { Origin: 'https://malicious.example' },
        },
        expectedStatus: 403,
      })
      if (databaseClient.enabled) {
        await assertEmployeeActiveState({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedActive: true,
          name: 'Malicious-Origin rejection leaves employee active',
        })
      }

      await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Active employee cannot start reactivation',
        url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
        options: { method: 'POST' },
        expectedStatus: 409,
      })
      if (databaseClient.enabled) {
        await assertEmployeeActiveState({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedActive: true,
          name: 'Rejected active reactivation leaves employee active',
        })
        await assertRowAbsent({
          client: databaseClient,
          reporter,
          name: 'Rejected active reactivation creates no request',
          table: 'account_reactivation',
          columns: ['employee_id'],
          filters: { employee_id: fixture.employeeId },
        })
      }

      await deactivateEmployee({ ownerClient, reporter, config, fixture })
      employeeClient.clearSessionCookie()
      const reactivationCode = await startReactivation({ ownerClient, reporter, config, fixture })
      await expectApiStep({
        client: ownerClient,
        reporter,
        name: 'Duplicate unfinished reactivation is rejected',
        url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
        options: { method: 'POST' },
        expectedStatus: 409,
      })
      if (databaseClient.enabled) {
        await assertRowCount({
          client: databaseClient,
          reporter,
          name: 'Only one unfinished reactivation exists',
          table: 'account_reactivation',
          columns: ['reactivation_id', 'employee_id', 'status'],
          filters: { employee_id: fixture.employeeId },
          expectedCount: 1,
        })
        await assertReactivationStatus({
          client: databaseClient,
          reporter,
          reactivationId: fixture.reactivationId,
          expectedStatus: 'PENDING_VERIFICATION',
        })
      }

      const reactivationSetupToken = await verifyReactivation({
        publicClient,
        reporter,
        config,
        fixture,
        reactivationCode,
      })
      await expectApiStep({
        client: publicClient,
        reporter,
        name: 'Reactivation rejects mismatched passwords',
        url: `${config.apiUrl}/employee/account/reactivation/credentials`,
        options: {
          method: 'POST',
          json: {
            reactivation_id: fixture.reactivationId,
            setup_token: reactivationSetupToken,
            new_password: fixture.renewedPassword,
            password_confirmation: `${fixture.renewedPassword}Mismatch`,
          },
        },
        expectedStatus: 400,
      })
      if (databaseClient.enabled) {
        await assertReactivationStatus({
          client: databaseClient,
          reporter,
          reactivationId: fixture.reactivationId,
          expectedStatus: 'SETTING_UP_CREDENTIALS',
          name: 'Password mismatch leaves credential setup pending',
        })
        await assertEmployeeActiveState({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedActive: false,
          name: 'Password mismatch leaves employee inactive',
        })
      }

      await expectApiStep({
        client: publicClient,
        reporter,
        name: 'Matching password completes reactivation fixture',
        url: `${config.apiUrl}/employee/account/reactivation/credentials`,
        options: {
          method: 'POST',
          json: {
            reactivation_id: fixture.reactivationId,
            setup_token: reactivationSetupToken,
            new_password: fixture.renewedPassword,
            password_confirmation: fixture.renewedPassword,
          },
        },
        expectedStatus: 200,
        validate: (body) => {
          const errors = []
          check(body?.reactivated === true, 'reactivated must be true.', errors)
          check(body?.employee_status === 'ACTIVE', 'employee_status must be ACTIVE.', errors)
          check(body?.reactivation_status === 'COMPLETED', 'reactivation_status must be COMPLETED.', errors)
          return errors
        },
      })
    })

    await runScenario(reporter, 'Reactivation-code attempt limit', async () => {
      const fixture = fixtures.reactivationRevoked
      await createActiveEmployee({ ownerClient, publicClient, reporter, config }, fixture)
      await deactivateEmployee({ ownerClient, reporter, config, fixture })
      const reactivationCode = await startReactivation({ ownerClient, reporter, config, fixture })
      const wrongCode = wrongCodeFor(reactivationCode)

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await expectApiStep({
          client: publicClient,
          reporter,
          name: `${fixture.label}: incorrect reactivation attempt ${attempt} is rejected`,
          url: `${config.apiUrl}/employee/account/activate`,
          options: {
            method: 'POST',
            json: {
              name: fixture.activeUsername,
              phone_number: fixture.phoneNumber,
              activation_code: wrongCode,
            },
          },
          expectedStatus: attempt === 5 ? 429 : 401,
        })

        if (databaseClient.enabled) {
          await assertReactivationFailedAttempts({
            client: databaseClient,
            reporter,
            reactivationId: fixture.reactivationId,
            expectedAttempts: attempt,
            name: `Reactivation failed_attempts persisted as ${attempt}`,
          })
        }
      }

      if (databaseClient.enabled) {
        await assertReactivationStatus({
          client: databaseClient,
          reporter,
          reactivationId: fixture.reactivationId,
          expectedStatus: 'REVOKED',
        })
        await assertNullableFieldEquals({
          client: databaseClient,
          reporter,
          name: 'Revoked reactivation clears code expiry',
          table: 'account_reactivation',
          idColumn: 'reactivation_id',
          id: fixture.reactivationId,
          field: 'code_expiry_time',
        })
        await assertEmployeeActiveState({
          client: databaseClient,
          reporter,
          employeeId: fixture.employeeId,
          expectedActive: false,
          name: 'Revoked reactivation leaves employee inactive',
        })
      }
    })
  } catch (error) {
    if (!(error instanceof ScenarioAbort)) {
      reporter.fail('Negative suite stopped unexpectedly', {
        error: error instanceof Error ? error.message : 'Unknown suite error',
      })
    }
  } finally {
    reporter.section('Session cleanup')
    await logoutOwner({ ownerClient, reporter, config })

    reporter.section('Manual data cleanup')
    reporter.skip('Automatic database cleanup is intentionally unavailable', {
      reason: 'Remove dependent reactivation and working-hours rows before employee rows.',
      cleanupOrder: [
        'account_reactivation by reactivation_id or employee_id',
        'employee_working_hours by employee_id',
        'account_activation by account_id',
        'employees by employee_id',
      ],
      manifest: Object.values(fixtures).map((fixture) => ({
        label: fixture.label,
        pendingUsername: fixture.pendingUsername,
        activeUsername: fixture.activeUsername,
        phoneNumber: fixture.phoneNumber,
        accountId: fixture.accountId,
        employeeId: fixture.employeeId,
        reactivationId: fixture.reactivationId,
      })),
    })

    await reporter.finish()
    if (reporter.hasFailures) process.exitCode = 1
  }
}

main()
