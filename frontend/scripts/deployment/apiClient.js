const SESSION_COOKIE_NAME = '__Host-aurora_session'
const sensitiveKeyPattern = /authorization|cookie|__host-aurora_session|password|secret|api[_-]?key|service[_-]?role|activation[_-]?code|reactivation[_-]?code|setup[_-]?token|hash|salt|lookup|(^|[_-])token($|[_-])/i

function redactString(value) {
  if (/^bearer\s+/i.test(value)) return '[REDACTED]'
  if (/__host-aurora_session=/i.test(value)) return '[REDACTED]'
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
  return Object.fromEntries(
    [...headers.entries()].map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[REDACTED]' : value,
    ]),
  )
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  const setCookie = headers.get('set-cookie')
  return setCookie ? [setCookie] : []
}

function parseSessionCookie(setCookieHeader) {
  const cookieStart = setCookieHeader.search(new RegExp(`(?:^|,\\s*)${SESSION_COOKIE_NAME}=`, 'i'))
  if (cookieStart < 0) return null

  const cookieText = setCookieHeader.slice(cookieStart).replace(/^,\s*/, '')
  const segments = cookieText.split(';').map((segment) => segment.trim())
  const separatorIndex = segments[0].indexOf('=')
  if (separatorIndex < 0) return null

  const name = segments[0].slice(0, separatorIndex)
  if (name.toLowerCase() !== SESSION_COOKIE_NAME.toLowerCase()) return null

  const value = segments[0].slice(separatorIndex + 1)
  const attributes = new Map()
  for (const segment of segments.slice(1)) {
    const attributeSeparator = segment.indexOf('=')
    const key = (attributeSeparator < 0 ? segment : segment.slice(0, attributeSeparator)).toLowerCase()
    const attributeValue = attributeSeparator < 0 ? true : segment.slice(attributeSeparator + 1)
    attributes.set(key, attributeValue)
  }

  const rawMaxAge = attributes.get('max-age')
  const maxAge = typeof rawMaxAge === 'string' && /^-?\d+$/.test(rawMaxAge)
    ? Number(rawMaxAge)
    : null
  const rawExpires = attributes.get('expires')
  const expiresAt = typeof rawExpires === 'string' ? Date.parse(rawExpires) : Number.NaN
  const emptyValue = value === '' || value === '""'
  const deleted = emptyValue || maxAge === 0 || (!Number.isNaN(expiresAt) && expiresAt <= Date.now())

  return {
    value,
    metadata: {
      received: true,
      name: SESSION_COOKIE_NAME,
      httpOnly: attributes.has('httponly'),
      secure: attributes.has('secure'),
      sameSite: typeof attributes.get('samesite') === 'string'
        ? attributes.get('samesite').toLowerCase()
        : null,
      path: typeof attributes.get('path') === 'string' ? attributes.get('path') : null,
      maxAge,
      deleted,
    },
  }
}

function hasHeader(headers, expectedName) {
  return Object.keys(headers).some((name) => name.toLowerCase() === expectedName.toLowerCase())
}

export function createApiClient({ timeoutMs = 15_000, verbose = false, cookieSession = false } = {}) {
  let sessionCookieValue = null
  let sessionCookieOrigin = null
  let lastCookieMetadata = null

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

    if (
      cookieSession
      && sessionCookieValue
      && sessionCookieOrigin === new URL(url).origin
      && !hasHeader(requestHeaders, 'cookie')
    ) {
      requestHeaders.Cookie = `${SESSION_COOKIE_NAME}=${sessionCookieValue}`
    }

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
      let responseCookieMetadata = null

      for (const setCookieHeader of getSetCookieHeaders(response.headers)) {
        const parsedCookie = parseSessionCookie(setCookieHeader)
        if (!parsedCookie) continue

        responseCookieMetadata = parsedCookie.metadata
        lastCookieMetadata = parsedCookie.metadata

        if (cookieSession) {
          if (parsedCookie.metadata.deleted) {
            sessionCookieValue = null
            sessionCookieOrigin = null
          } else if (parsedCookie.value) {
            sessionCookieValue = parsedCookie.value
            sessionCookieOrigin = new URL(response.url || url).origin
          }
        }
        break
      }

      const result = {
        ok: response.ok,
        status: response.status,
        url: safeUrl(response.url || url),
        headers: headersToObject(response.headers),
        cookieMetadata: responseCookieMetadata,
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
        cookieMetadata: null,
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

  function hasSessionCookie() {
    return Boolean(sessionCookieValue && sessionCookieOrigin)
  }

  function getLastCookieMetadata() {
    return lastCookieMetadata ? { ...lastCookieMetadata } : null
  }

  function clearSessionCookie() {
    sessionCookieValue = null
    sessionCookieOrigin = null
    lastCookieMetadata = null
  }

  return { request, hasSessionCookie, getLastCookieMetadata, clearSessionCookie }
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
