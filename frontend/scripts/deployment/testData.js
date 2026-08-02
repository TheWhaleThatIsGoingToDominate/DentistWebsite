import { randomBytes } from 'node:crypto'

export function createRunId(now = new Date()) {
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${timestamp}_${randomBytes(3).toString('hex')}`
}

export function createTestNames(prefix = 'aurora_e2e') {
  const runId = createRunId()
  return {
    runId,
    pendingUsername: `${prefix}_pending_${runId}`,
    activeUsername: `${prefix}_active_${runId}`,
  }
}

export function createSyntheticPhone(prefix = '019') {
  if (!/^\d{3}$/.test(prefix)) {
    throw new Error('TEST_PHONE_PREFIX must contain exactly three digits.')
  }

  const suffix = (randomBytes(4).readUInt32BE() % 100_000_000).toString().padStart(8, '0')
  return `${prefix}${suffix}`
}

export function createTestPassword(label = 'Initial') {
  return `Aurora${label}!${randomBytes(12).toString('base64url')}`
}

export function createFullFlowTestData({ prefix = 'aurora_e2e', phonePrefix = '019' } = {}) {
  const names = createTestNames(prefix)
  return {
    ...names,
    phoneNumber: createSyntheticPhone(phonePrefix),
    initialPassword: createTestPassword('Initial'),
    renewedPassword: createTestPassword('Renewed'),
  }
}
