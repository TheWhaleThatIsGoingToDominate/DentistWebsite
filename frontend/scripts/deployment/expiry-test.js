import { createApiClient } from './apiClient.js'
import { DeploymentConfigError, loadDeploymentConfig } from './config.js'
import {
  assertAccountActivationStatus,
  assertActivationFailedAttempts,
  assertEmployeeActiveState,
  assertReactivationFailedAttempts,
  assertReactivationStatus,
  assertRowAbsent,
} from './databaseAssertions.js'
import { DeploymentReporter } from './reporter.js'
import { createSupabaseReadClient } from './supabaseReadClient.js'
import { createRunId, createSyntheticPhone, createTestPassword } from './testData.js'

const EXPIRY_BUFFER_MS = 10_000
const MAX_WAIT_MS = 45 * 60_000
const WAIT_CHUNK_MS = 60_000
const workingHours = Object.freeze([
  Object.freeze({ day_of_week: 0, start_minute: 540, end_minute: 1020, working_status: true }),
  Object.freeze({ day_of_week: 2, start_minute: 600, end_minute: 1080, working_status: true }),
  Object.freeze({ day_of_week: 4, start_minute: 480, end_minute: 960, working_status: true }),
])
const forbiddenKeyPattern = /password|hash|salt|lookup|setup[_-]?token|activation[_-]?code|reactivation[_-]?code|(^|[_-])token($|[_-])/i
const safeExpiryKeys = new Set(['setup_token_expiry_time', 'setup_token_expires_at'])

class ExpiryAbort extends Error {
  constructor(step) {
    super(`Expiry suite stopped after: ${step}`)
    this.name = 'ExpiryAbort'
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function check(condition, message, errors) {
  if (!condition) errors.push(message)
}

function findForbiddenKeys(value, allowed = new Set(), path = '$', matches = []) {
  if (!value || typeof value !== 'object') return matches
  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${path}.${key}`
    if (forbiddenKeyPattern.test(key) && !allowed.has(key) && !safeExpiryKeys.has(key)) {
      matches.push(nextPath)
    }
    if (item && typeof item === 'object') findForbiddenKeys(item, allowed, nextPath, matches)
  }
  return matches
}

function resultDetails(result, validationErrors = [], forbiddenKeys = []) {
  return {
    path: result.url ? new URL(result.url).pathname : null,
    httpStatus: result.status,
    error: result.error,
    body: result.body,
    validationErrors,
    forbiddenKeys,
  }
}

async function expectApi({
  client,
  reporter,
  name,
  url,
  options = {},
  status,
  validate = () => [],
  allowedSensitiveKeys = [],
}) {
  const result = await client.request(url, options)
  const validationErrors = result.status === status ? validate(result.body) : []
  const forbiddenKeys = findForbiddenKeys(result.body, new Set(allowedSensitiveKeys))
  if (result.status !== status || validationErrors.length || forbiddenKeys.length) {
    reporter.fail(name, resultDetails(result, validationErrors, forbiddenKeys))
    throw new ExpiryAbort(name)
  }
  reporter.pass(name, { path: new URL(result.url || url).pathname, httpStatus: result.status })
  return result.body
}

function createFixture(config, label) {
  const runId = createRunId()
  const base = `${config.testRunPrefix}_expiry_${label}_${runId}`.toLowerCase()
  return {
    label,
    pendingUsername: `${base}_pending`,
    activeUsername: `${base}_active`,
    phoneNumber: createSyntheticPhone(config.testPhonePrefix),
    password: createTestPassword(`${label}Initial`),
    renewedPassword: createTestPassword(`${label}Renewed`),
    accountId: null,
    employeeId: null,
    reactivationId: null,
  }
}

function credentialsBody(fixture, setupToken) {
  return {
    old_username: fixture.pendingUsername,
    old_phone_number: fixture.phoneNumber,
    new_username: fixture.activeUsername,
    new_phone_number: fixture.phoneNumber,
    new_password: fixture.password,
    password_confirmation: fixture.password,
    setup_token: setupToken,
    working_hours: workingHours,
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitUntilExpiry(reporter, testName, isoTimestamp) {
  const expiryTime = Date.parse(isoTimestamp)
  if (!Number.isFinite(expiryTime)) {
    reporter.fail(`${testName} expiry timestamp is valid`, { reason: 'Backend returned an invalid ISO timestamp.' })
    throw new ExpiryAbort(testName)
  }

  const targetTime = expiryTime + EXPIRY_BUFFER_MS
  const initialWait = Math.max(0, targetTime - Date.now())
  if (initialWait > MAX_WAIT_MS) {
    reporter.fail(`${testName} wait is within safety limit`, {
      waitMinutes: Math.ceil(initialWait / 60_000),
      maximumMinutes: MAX_WAIT_MS / 60_000,
    })
    throw new ExpiryAbort(testName)
  }

  const startedAt = Date.now()
  while (Date.now() < targetTime) {
    const remaining = targetTime - Date.now()
    console.log(`WAIT: ${testName} (${Math.ceil(remaining / 60_000)} minute(s) remaining)`)
    await delay(Math.min(remaining, WAIT_CHUNK_MS))
  }
  reporter.pass(`${testName} expiry window elapsed`, { waitedMs: Date.now() - startedAt })
}

async function authenticateOwner(context, validTime) {
  const { client, reporter, config } = context
  return expectApi({
    client,
    reporter,
    name: `Owner authenticates for ${validTime} minute expiry window`,
    url: `${config.apiUrl}/employee/auth`,
    options: {
      method: 'POST',
      json: {
        username: config.owner.username,
        phone_number: config.owner.phoneNumber,
        password: config.owner.password,
        valid_time: validTime,
      },
    },
    status: 200,
    validate: (body) => {
      const errors = []
      const cookie = client.getLastCookieMetadata()
      check(body?.allowed === true, 'allowed must be true.', errors)
      check(
        typeof body?.expires_at === 'string' && !Number.isNaN(Date.parse(body.expires_at)),
        'expires_at must be valid.',
        errors,
      )
      check(body?.role === 'OWNER', 'role must be OWNER.', errors)
      check(!isRecord(body) || !('token' in body), 'Login JSON must not contain token.', errors)
      check(!isRecord(body) || !('employee_id' in body), 'Login JSON must not contain employee_id.', errors)
      check(client.hasSessionCookie(), 'Owner session cookie was not captured.', errors)
      check(cookie?.received === true, 'Session cookie metadata must show receipt.', errors)
      check(cookie?.name === '__Host-aurora_session', 'Unexpected session cookie name.', errors)
      check(cookie?.httpOnly === true, 'Session cookie must be HttpOnly.', errors)
      check(cookie?.secure === true, 'Session cookie must be Secure.', errors)
      check(cookie?.sameSite === 'none', 'Session cookie must use SameSite=None.', errors)
      check(cookie?.path === '/', 'Session cookie must use Path=/.', errors)
      check(cookie?.deleted === false, 'Login cookie must not be a deletion cookie.', errors)
      return errors
    },
  })
}

async function createPending(context, fixture) {
  const { ownerClient, reporter, config } = context
  const body = await expectApi({
    client: ownerClient,
    reporter,
    name: `${fixture.label}: pending account created`,
    url: `${config.apiUrl}/owner/createAccount`,
    options: {
      method: 'POST',
      json: {
        name: fixture.pendingUsername,
        phone_number: fixture.phoneNumber,
        role: config.testEmployeeRole,
      },
    },
    status: 201,
    allowedSensitiveKeys: ['activation_code'],
    validate: (body) => {
      const errors = []
      check(body?.created === true, 'created must be true.', errors)
      check(typeof body?.employee?.account_id === 'string', 'account_id is required.', errors)
      check(typeof body?.activation_code === 'string', 'activation_code is required.', errors)
      check(typeof body?.activation_expires_at === 'string', 'activation_expires_at is required.', errors)
      return errors
    },
  })
  fixture.accountId = body.employee.account_id
  fixture.employeeId = fixture.accountId
  return { code: body.activation_code, expiresAt: body.activation_expires_at }
}

async function verifyCode(context, fixture, code, flow) {
  const { publicClient, reporter, config } = context
  const username = flow === 'ACTIVATION' ? fixture.pendingUsername : fixture.activeUsername
  const body = await expectApi({
    client: publicClient,
    reporter,
    name: `${fixture.label}: ${flow.toLowerCase()} code verified`,
    url: `${config.apiUrl}/employee/account/activate`,
    options: {
      method: 'POST',
      json: { name: username, phone_number: fixture.phoneNumber, activation_code: code },
    },
    status: 200,
    allowedSensitiveKeys: ['setup_token', 'setup_token_expires_at'],
    validate: (body) => {
      const errors = []
      check(body?.verified === true, 'verified must be true.', errors)
      check(body?.flow === flow, `flow must be ${flow}.`, errors)
      check(typeof body?.setup_token === 'string', 'setup_token is required.', errors)
      check(typeof body?.setup_token_expires_at === 'string', 'setup_token_expires_at is required.', errors)
      return errors
    },
  })
  if (flow === 'REACTIVATION') fixture.reactivationId = body.reactivation_id
  return { token: body.setup_token, expiresAt: body.setup_token_expires_at }
}

async function completeActivation(context, fixture, setupToken) {
  const { publicClient, reporter, config } = context
  await expectApi({
    client: publicClient,
    reporter,
    name: `${fixture.label}: employee activated for expiry fixture`,
    url: `${config.apiUrl}/employee/account/credentials`,
    options: { method: 'POST', json: credentialsBody(fixture, setupToken) },
    status: 200,
    validate: (body) => {
      const errors = []
      check(body?.activated === true, 'activated must be true.', errors)
      check(body?.working_hours_saved === true, 'working_hours_saved must be true.', errors)
      return errors
    },
  })
}

async function createActive(context, fixture) {
  const activation = await createPending(context, fixture)
  const setup = await verifyCode(context, fixture, activation.code, 'ACTIVATION')
  await completeActivation(context, fixture, setup.token)
}

async function deactivate(context, fixture) {
  const { ownerClient, reporter, config } = context
  await expectApi({
    client: ownerClient,
    reporter,
    name: `${fixture.label}: employee deactivated`,
    url: `${config.apiUrl}/owner/account/deactivate?employee_id=${encodeURIComponent(fixture.employeeId)}`,
    options: { method: 'POST' },
    status: 200,
    validate: (body) => {
      const errors = []
      check(body?.deactivated === true, 'deactivated must be true.', errors)
      check(body?.employee_status === 'INACTIVE', 'employee_status must be INACTIVE.', errors)
      return errors
    },
  })
}

async function startReactivation(context, fixture) {
  const { ownerClient, reporter, config } = context
  const body = await expectApi({
    client: ownerClient,
    reporter,
    name: `${fixture.label}: reactivation started`,
    url: `${config.apiUrl}/owner/account/reactivation/start?employee_id=${encodeURIComponent(fixture.employeeId)}`,
    options: { method: 'POST' },
    status: 200,
    allowedSensitiveKeys: ['reactivation_code'],
    validate: (body) => {
      const errors = []
      check(body?.reactivation_created === true, 'reactivation_created must be true.', errors)
      check(typeof body?.reactivation_id === 'string', 'reactivation_id is required.', errors)
      check(typeof body?.reactivation_code === 'string', 'reactivation_code is required.', errors)
      check(typeof body?.code_expires_at === 'string', 'code_expires_at is required.', errors)
      return errors
    },
  })
  fixture.reactivationId = body.reactivation_id
  return { code: body.reactivation_code, expiresAt: body.code_expires_at }
}

async function assertExpiredRejection(context, { name, url, options, validate }) {
  return expectApi({
    client: context.publicClient,
    reporter: context.reporter,
    name,
    url,
    options,
    status: 401,
    validate,
  })
}

async function main() {
  const suiteStartedAt = Date.now()
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
  const requiredFlags = {
    '--write': config.flags.write,
    '--confirm-no-cleanup': config.flags.confirmNoCleanup,
    '--db-check': config.flags.dbCheck,
    '--expiry': config.flags.expiry,
  }
  const missingFlags = Object.entries(requiredFlags).filter(([, enabled]) => !enabled).map(([flag]) => flag)
  if (missingFlags.length) {
    reporter.fail('Expiry-test execution was refused', {
      reason: 'All expiry safety flags are required.',
      missingFlags,
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
  const databaseClient = createSupabaseReadClient({
    enabled: true,
    supabaseUrl: config.supabase.url,
    serviceRoleKey: config.supabase.serviceRoleKey,
    timeoutMs: config.timeoutMs,
    verbose: config.flags.verbose,
  })
  const fixtures = {
    activationCode: createFixture(config, 'activation_code'),
    activationSetup: createFixture(config, 'activation_setup'),
    reactivationCode: createFixture(config, 'reactivation_code'),
    reactivationSetup: createFixture(config, 'reactivation_setup'),
  }

  try {
    reporter.pass('All four expiry safety flags are present')
    reporter.section('Fixture preparation')
    await authenticateOwner({ client: ownerClient, reporter, config }, config.owner.validTime)
    const context = { publicClient, ownerClient, reporter, config, databaseClient }

    const fixtureA = fixtures.activationCode
    const activationA = await createPending(context, fixtureA)

    const fixtureB = fixtures.activationSetup
    const activationB = await createPending(context, fixtureB)
    const setupB = await verifyCode(context, fixtureB, activationB.code, 'ACTIVATION')

    const fixtureC = fixtures.reactivationCode
    await createActive(context, fixtureC)
    await deactivate(context, fixtureC)
    const reactivationC = await startReactivation(context, fixtureC)

    const fixtureD = fixtures.reactivationSetup
    await createActive(context, fixtureD)
    await deactivate(context, fixtureD)
    const reactivationD = await startReactivation(context, fixtureD)
    const setupD = await verifyCode(context, fixtureD, reactivationD.code, 'REACTIVATION')

    const expiryChecks = [
      {
        name: 'Activation code',
        expiresAt: activationA.expiresAt,
        run: async () => {
          await assertExpiredRejection(context, {
            name: 'Expired activation code is rejected',
            url: `${config.apiUrl}/employee/account/activate`,
            options: {
              method: 'POST',
              json: {
                name: fixtureA.pendingUsername,
                phone_number: fixtureA.phoneNumber,
                activation_code: activationA.code,
              },
            },
            validate: (body) => body?.setup_token ? ['Expired activation returned a setup token.'] : [],
          })
          await assertAccountActivationStatus({
            client: databaseClient,
            reporter,
            accountId: fixtureA.accountId,
            expectedStatus: 'EXPIRED',
          })
          await assertActivationFailedAttempts({
            client: databaseClient,
            reporter,
            accountId: fixtureA.accountId,
            expectedAttempts: 0,
          })
          await assertRowAbsent({
            client: databaseClient,
            reporter,
            name: 'Expired activation code created no employee',
            table: 'employees',
            columns: ['employee_id'],
            filters: { employee_id: fixtureA.employeeId },
          })
        },
      },
      {
        name: 'Reactivation code',
        expiresAt: reactivationC.expiresAt,
        run: async () => {
          await assertExpiredRejection(context, {
            name: 'Expired reactivation code is rejected',
            url: `${config.apiUrl}/employee/account/activate`,
            options: {
              method: 'POST',
              json: {
                name: fixtureC.activeUsername,
                phone_number: fixtureC.phoneNumber,
                activation_code: reactivationC.code,
              },
            },
            validate: (body) => body?.setup_token ? ['Expired reactivation returned a setup token.'] : [],
          })
          await assertReactivationStatus({
            client: databaseClient,
            reporter,
            reactivationId: fixtureC.reactivationId,
            expectedStatus: 'EXPIRED',
          })
          await assertReactivationFailedAttempts({
            client: databaseClient,
            reporter,
            reactivationId: fixtureC.reactivationId,
            expectedAttempts: 0,
          })
          await assertEmployeeActiveState({
            client: databaseClient,
            reporter,
            employeeId: fixtureC.employeeId,
            expectedActive: false,
          })
        },
      },
      {
        name: 'Reactivation setup token',
        expiresAt: setupD.expiresAt,
        run: async () => {
          await assertExpiredRejection(context, {
            name: 'Expired reactivation setup token is rejected',
            url: `${config.apiUrl}/employee/account/reactivation/credentials`,
            options: {
              method: 'POST',
              json: {
                reactivation_id: fixtureD.reactivationId,
                setup_token: setupD.token,
                new_password: fixtureD.renewedPassword,
                password_confirmation: fixtureD.renewedPassword,
              },
            },
            validate: (body) => body?.reactivated === true ? ['Expired setup token reactivated employee.'] : [],
          })
          await assertReactivationStatus({
            client: databaseClient,
            reporter,
            reactivationId: fixtureD.reactivationId,
            expectedStatus: 'EXPIRED',
          })
          await assertEmployeeActiveState({
            client: databaseClient,
            reporter,
            employeeId: fixtureD.employeeId,
            expectedActive: false,
          })
        },
      },
      {
        name: 'Activation setup token',
        expiresAt: setupB.expiresAt,
        run: async () => {
          await assertExpiredRejection(context, {
            name: 'Expired activation setup token is rejected',
            url: `${config.apiUrl}/employee/account/credentials`,
            options: { method: 'POST', json: credentialsBody(fixtureB, setupB.token) },
            validate: (body) => body?.activated === true ? ['Expired setup token activated employee.'] : [],
          })
          await assertAccountActivationStatus({
            client: databaseClient,
            reporter,
            accountId: fixtureB.accountId,
            expectedStatus: 'EXPIRED',
          })
          await assertRowAbsent({
            client: databaseClient,
            reporter,
            name: 'Expired activation setup token created no employee',
            table: 'employees',
            columns: ['employee_id'],
            filters: { employee_id: fixtureB.employeeId },
          })
          await assertRowAbsent({
            client: databaseClient,
            reporter,
            name: 'Expired activation setup token created no working hours',
            table: 'employee_working_hours',
            columns: ['employee_id'],
            filters: { employee_id: fixtureB.employeeId },
          })
        },
      },
    ].sort((left, right) => Date.parse(left.expiresAt) - Date.parse(right.expiresAt))

    reporter.section('Timed expiry checks')
    for (const expiryCheck of expiryChecks) {
      await waitUntilExpiry(reporter, expiryCheck.name, expiryCheck.expiresAt)
      await expiryCheck.run()
    }

    reporter.section('Authentication-token expiry')
    const expiringOwnerClient = createApiClient({
      timeoutMs: config.timeoutMs,
      verbose: config.flags.verbose,
      cookieSession: true,
      requestOrigin: config.frontendOrigin,
    })
    const expiringOwnerAuth = await authenticateOwner(
      { client: expiringOwnerClient, reporter, config },
      1,
    )
    await waitUntilExpiry(reporter, 'Owner authentication token', expiringOwnerAuth.expires_at)
    await expectApi({
      client: expiringOwnerClient,
      reporter,
      name: 'Expired owner authentication token is rejected',
      url: `${config.apiUrl}/owner/accounts/created`,
      status: 401,
      validate: (body) => Array.isArray(body) ? ['Expired token returned account data.'] : [],
    })
  } catch (error) {
    if (!(error instanceof ExpiryAbort)) {
      reporter.fail('Unexpected expiry-suite error', {
        error: error instanceof Error ? error.message : 'Unknown expiry-suite error',
      })
    }
  } finally {
    reporter.section('Runtime')
    reporter.pass('Expiry-suite elapsed time recorded', { elapsedMs: Date.now() - suiteStartedAt })
    reporter.section('Manual data cleanup')
    reporter.skip('Automatic database cleanup is intentionally unavailable', {
      cleanupOrder: ['account_reactivation', 'employee_working_hours', 'account_activation', 'employees'],
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
