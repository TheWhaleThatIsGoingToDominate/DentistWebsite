const sensitiveKeyPattern = /authorization|password|secret|api[_-]?key|service[_-]?role|activation[_-]?code|reactivation[_-]?code|setup[_-]?token|hash|salt|lookup|(^|[_-])token($|[_-])/i

function redactString(value) {
  if (/^bearer\s+/i.test(value)) return '[REDACTED]'
  return value.length > 2_000 ? `${value.slice(0, 2_000)}...[TRUNCATED]` : value
}

export function redact(value, seen = new WeakSet()) {
  if (typeof value === 'string') return redactString(value)
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'

  seen.add(value)
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen))
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[REDACTED]' : redact(item, seen),
    ]),
  )
}

function safeUrl(url) {
  const parsed = new URL(url)
  for (const key of parsed.searchParams.keys()) {
    if (sensitiveKeyPattern.test(key)) parsed.searchParams.set(key, '[REDACTED]')
  }
  return parsed.toString()
}

function headersToObject(headers) {
  return Object.fromEntries(headers.entries())
}

export function createApiClient({ timeoutMs = 15_000, verbose = false } = {}) {
  async function request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      json,
      rawBody,
    } = options
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const startedAt = Date.now()
    const requestHeaders = { ...headers }
    let body = rawBody

    if (json !== undefined) {
      requestHeaders['Content-Type'] ??= 'application/json'
      body = JSON.stringify(json)
    }

    if (verbose) {
      console.log('  REQUEST', method, safeUrl(url), JSON.stringify(redact({ headers: requestHeaders, body: json ?? rawBody })))
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body,
        signal: controller.signal,
        redirect: 'follow',
      })
      const contentType = response.headers.get('content-type') || ''
      const responseBody = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '')
      const result = {
        ok: response.ok,
        status: response.status,
        url: safeUrl(response.url || url),
        headers: headersToObject(response.headers),
        body: responseBody,
        durationMs: Date.now() - startedAt,
        error: null,
      }

      if (verbose) {
        console.log('  RESPONSE', response.status, JSON.stringify(redact(responseBody)))
      }

      return result
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError'
      const result = {
        ok: false,
        status: null,
        url: safeUrl(url),
        headers: {},
        body: null,
        durationMs: Date.now() - startedAt,
        error: {
          kind: timedOut ? 'timeout' : 'network',
          message: timedOut ? `Request timed out after ${timeoutMs}ms.` : 'Network request failed.',
        },
      }

      if (verbose) console.log('  RESPONSE', JSON.stringify(result.error))
      return result
    } finally {
      clearTimeout(timeout)
    }
  }

  return { request }
}

export function buildOwnerHeaders({ username, phoneNumber, token }) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Employee-Username': username,
    'X-Employee-Phone': phoneNumber,
  }
}

export function findSensitiveResponseKeys(value, path = '$', matches = []) {
  if (!value || typeof value !== 'object') return matches

  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${path}.${key}`
    if (sensitiveKeyPattern.test(key)) matches.push(nextPath)
    if (item && typeof item === 'object') findSensitiveResponseKeys(item, nextPath, matches)
  }

  return matches
}
