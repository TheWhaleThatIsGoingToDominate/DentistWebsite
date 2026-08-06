import { buildOwnerHeaders, createApiClient } from './apiClient.js'
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

async function createPendingAccount({ client, reporter, config, ownerHeaders, fixture }) {
  const body = await expectApiStep({
    client,
    reporter,
    name: `${fixture.label}: owner creates pending account`,
    url: `${config.apiUrl}/owner/createAccount`,
    options: {
      method: 'POST',
      headers: ownerHeaders,
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

async function verifyActivation({ client, reporter, config, fixture, activationCode }) {
  const body = await expectApiStep({
    client,
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

async function submitValidCredentials({ client, reporter, config, fixture, setupToken }) {
  await expectApiStep({
    client,
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

async function deactivateEmployee({ client, reporter, config, ownerHeaders, fixture }) {
  await expectApiStep({
    client,
    reporter,
    name: `${fixture.label}: owner deactivates employee`,
    url: `${config.apiUrl}/owner/account/deactivate?employee_id=${encodeURIComponent(fixture.employeeId)}`,
    options: { method: 'POST', headers: ownerHeaders },
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

async function startReactivation({ client, reporter, config, ownerHeaders, fixture }) {
  const body = await expectApiStep({
    client,
    reporter,
    name: `${fixture.label}: owner starts reactivation`,
    url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
    options: { method: 'POST', headers: ownerHeaders },
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

async function verifyReactivation({ client, reporter, config, fixture, reactivationCode }) {
  const body = await expectApiStep({
    client,
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

async function logoutOwner({ client, reporter, config, token }) {
  if (!token) {
    reporter.skip('Owner logout', { reason: 'No owner token was created.' })
    return
  }

  const result = await client.request(`${config.apiUrl}/employee/auth/logout`, {
    method: 'POST',
    json: {
      username: config.owner.username,
      phone_number: config.owner.phoneNumber,
      token,
    },
  })
  if (result.status === 200 && result.body?.success === true) {
    reporter.pass('Owner logout', { path: '/employee/auth/logout', httpStatus: 200 })
  } else {
    reporter.fail('Owner logout', safeResultDetails(result))
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

  const client = createApiClient({ timeoutMs: config.timeoutMs, verbose: config.flags.verbose })
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
  let ownerToken = null
  let ownerHeaders = null

  try {
    reporter.section('Owner authentication')
    const ownerAuth = await expectApiStep({
      client,
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
      allowedSensitiveKeys: ['token'],
      validate: (body) => {
        const errors = []
        check(body?.allowed === true, 'allowed must be true.', errors)
        check(isNonEmptyString(body?.token), 'token is required.', errors)
        check(isNonEmptyString(body?.expires_at), 'expires_at is required.', errors)
        check(body?.role === 'OWNER', 'role must be OWNER.', errors)
        return errors
      },
    })
    ownerToken = ownerAuth.token
    ownerHeaders = buildOwnerHeaders({
      username: config.owner.username,
      phoneNumber: config.owner.phoneNumber,
      token: ownerToken,
    })

    await runScenario(reporter, 'Missing owner authentication', async () => {
      await expectApiStep({
        client,
        reporter,
        name: 'Owner endpoint rejects missing authentication',
        url: `${config.apiUrl}/owner/accounts/created`,
        expectedStatus: 401,
      })
    })

    await runScenario(reporter, 'Invalid owner token', async () => {
      const invalidHeaders = buildOwnerHeaders({
        username: config.owner.username,
        phoneNumber: config.owner.phoneNumber,
        token: 'fabricated-negative-test-token',
      })
      await expectApiStep({
        client,
        reporter,
        name: 'Owner endpoint rejects fabricated token',
        url: `${config.apiUrl}/owner/accounts/created`,
        options: { headers: invalidHeaders },
        expectedStatus: 401,
      })
    })

    const profileRejectionCases = [
      { name: 'Profile endpoint rejects missing authentication' },
      {
        name: 'Profile endpoint rejects a fabricated token',
        headers: buildOwnerHeaders({
          username: config.owner.username,
          phoneNumber: config.owner.phoneNumber,
          token: 'fabricated-profile-test-token',
        }),
      },
      {
        name: 'Profile endpoint rejects a mismatched username',
        headers: buildOwnerHeaders({
          username: `${config.owner.username}_mismatch`,
          phoneNumber: config.owner.phoneNumber,
          token: ownerToken,
        }),
      },
    ]
    const replacementDigit = config.owner.phoneNumber.endsWith('0') ? '1' : '0'
    profileRejectionCases.push({
      name: 'Profile endpoint rejects a mismatched phone number',
      headers: buildOwnerHeaders({
        username: config.owner.username,
        phoneNumber: `${config.owner.phoneNumber.slice(0, -1)}${replacementDigit}`,
        token: ownerToken,
      }),
    })

    for (const rejectionCase of profileRejectionCases) {
      await runScenario(reporter, rejectionCase.name, async () => {
        await expectApiStep({
          client,
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
      await createPendingAccount({ client, reporter, config, ownerHeaders, fixture })
      await expectApiStep({
        client,
        reporter,
        name: 'Duplicate pending identity is rejected',
        url: `${config.apiUrl}/owner/createAccount`,
        options: {
          method: 'POST',
          headers: ownerHeaders,
          json: {
            name: fixture.pendingUsername,
            phone_number: fixture.phoneNumber,
            role: config.testEmployeeRole,
          },
        },
        expectedStatus: 409,
      })

      const pendingRows = await expectApiStep({
        client,
        reporter,
        name: 'Pending list contains one matching identity',
        url: `${config.apiUrl}/owner/accounts/pending`,
        options: { headers: ownerHeaders },
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
      const activationCode = await createPendingAccount({ client, reporter, config, ownerHeaders, fixture })
      const wrongCode = wrongCodeFor(activationCode)

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await expectApiStep({
          client,
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
      const activationCode = await createPendingAccount({ client, reporter, config, ownerHeaders, fixture })
      const setupToken = await verifyActivation({ client, reporter, config, fixture, activationCode })
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
          client,
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

      await submitValidCredentials({ client, reporter, config, fixture, setupToken })
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
        client,
        reporter,
        name: 'Active employee cannot start reactivation',
        url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
        options: { method: 'POST', headers: ownerHeaders },
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

      await deactivateEmployee({ client, reporter, config, ownerHeaders, fixture })
      const reactivationCode = await startReactivation({ client, reporter, config, ownerHeaders, fixture })
      await expectApiStep({
        client,
        reporter,
        name: 'Duplicate unfinished reactivation is rejected',
        url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
        options: { method: 'POST', headers: ownerHeaders },
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
        client,
        reporter,
        config,
        fixture,
        reactivationCode,
      })
      await expectApiStep({
        client,
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
        client,
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
      await createActiveEmployee({ client, reporter, config, ownerHeaders }, fixture)
      await deactivateEmployee({ client, reporter, config, ownerHeaders, fixture })
      const reactivationCode = await startReactivation({ client, reporter, config, ownerHeaders, fixture })
      const wrongCode = wrongCodeFor(reactivationCode)

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await expectApiStep({
          client,
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
    await logoutOwner({ client, reporter, config, token: ownerToken })

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
