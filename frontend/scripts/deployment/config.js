const supportedDurations = new Set([1, 30, 60, 120, 180])

export class DeploymentConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DeploymentConfigError'
  }
}

function normalizeUrl(value, variableName) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol')
    }

    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    throw new DeploymentConfigError(`${variableName} must be a valid HTTP(S) URL.`)
  }
}

function parseFlags(argv) {
  const flags = {
    write: false,
    verbose: false,
    reportPath: null,
  }

  for (const argument of argv) {
    if (argument === '--write') {
      flags.write = true
    } else if (argument === '--verbose') {
      flags.verbose = true
    } else if (argument.startsWith('--report=')) {
      const reportPath = argument.slice('--report='.length).trim()
      if (!reportPath) {
        throw new DeploymentConfigError('--report requires a file path.')
      }
      flags.reportPath = reportPath
    } else {
      throw new DeploymentConfigError(`Unknown deployment-test flag: ${argument}`)
    }
  }

  return flags
}

function requireEnvironment(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new DeploymentConfigError(`Missing required environment variable: ${name}`)
  }
  return value
}

export function loadDeploymentConfig(argv = process.argv.slice(2)) {
  const flags = parseFlags(argv)
  const frontendUrl = normalizeUrl(requireEnvironment('DEPLOY_FRONTEND_URL'), 'DEPLOY_FRONTEND_URL')
  const apiUrl = normalizeUrl(requireEnvironment('DEPLOY_API_URL'), 'DEPLOY_API_URL')
  const validTime = Number(process.env.TEST_OWNER_VALID_TIME?.trim() || '30')

  if (!Number.isInteger(validTime) || !supportedDurations.has(validTime)) {
    throw new DeploymentConfigError(
      'TEST_OWNER_VALID_TIME must be one of: 1, 30, 60, 120, 180.',
    )
  }

  const config = {
    frontendUrl,
    frontendOrigin: new URL(frontendUrl).origin,
    apiUrl,
    timeoutMs: 15_000,
    testRunPrefix: process.env.TEST_RUN_PREFIX?.trim() || 'aurora_e2e',
    testEmployeeRole: process.env.TEST_EMPLOYEE_ROLE?.trim().toUpperCase() || 'RECEPTIONIST',
    testPhonePrefix: process.env.TEST_PHONE_PREFIX?.trim() || '019',
    flags,
    owner: null,
  }

  if (flags.write) {
    config.owner = {
      username: requireEnvironment('TEST_OWNER_USERNAME'),
      phoneNumber: requireEnvironment('TEST_OWNER_PHONE'),
      password: requireEnvironment('TEST_OWNER_PASSWORD'),
      validTime,
    }
  }

  return config
}
