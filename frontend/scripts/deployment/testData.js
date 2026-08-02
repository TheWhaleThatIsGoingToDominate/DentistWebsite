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
