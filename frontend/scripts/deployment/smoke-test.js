import { createApiClient, findSensitiveResponseKeys } from './apiClient.js'
import { DeploymentConfigError, loadDeploymentConfig } from './config.js'
import { DeploymentReporter } from './reporter.js'

function resultDetails(result) {
  return {
    path: result.url ? new URL(result.url).pathname : undefined,
    httpStatus: result.status,
    error: result.error,
    body: result.ok ? undefined : result.body,
  }
}

function extractJavaScriptAssets(html, frontendUrl) {
  const assets = new Set()
  const referencePattern = /(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/gi
  let match

  while ((match = referencePattern.exec(html)) !== null) {
    try {
      assets.add(new URL(match[1], `${frontendUrl}/`).toString())
    } catch {
      // Ignore malformed asset references and continue checking the remaining assets.
    }
  }

  return [...assets].slice(0, 12)
}

function includesAllowedHeader(allowedHeaders, expectedHeader) {
  const normalized = allowedHeaders.toLowerCase()
  return normalized === '*' || normalized.split(',').map((value) => value.trim()).includes(expectedHeader.toLowerCase())
}

async function main() {
  let config

  try {
    config = loadDeploymentConfig()
  } catch (error) {
    const message = error instanceof DeploymentConfigError ? error.message : 'Deployment configuration is invalid.'
    console.error(`CONFIG ERROR: ${message}`)
    process.exitCode = 1
    return
  }

  const reporter = new DeploymentReporter({ reportPath: config.flags.reportPath })
  const client = createApiClient({ timeoutMs: config.timeoutMs, verbose: config.flags.verbose })
  const ownerClient = createApiClient({
    timeoutMs: config.timeoutMs,
    verbose: config.flags.verbose,
    cookieSession: true,
    requestOrigin: config.frontendOrigin,
  })

  reporter.section('Configuration')
  reporter.pass('Deployment environment is valid', {
    frontendOrigin: config.frontendOrigin,
    apiOrigin: new URL(config.apiUrl).origin,
    mode: config.flags.write ? 'authenticated smoke' : 'safe smoke',
  })

  reporter.section('Frontend')
  const frontend = await client.request(config.frontendUrl)
  const frontendIsHtml = frontend.status === 200 && typeof frontend.body === 'string' && /<!doctype html|<html/i.test(frontend.body)
  if (frontendIsHtml) {
    reporter.pass('Deployed frontend returned HTML', { path: new URL(frontend.url).pathname, httpStatus: frontend.status })
  } else {
    reporter.fail('Deployed frontend returned HTML', resultDetails(frontend))
  }

  if (frontendIsHtml) {
    const assetUrls = extractJavaScriptAssets(frontend.body, config.frontendUrl)
    if (assetUrls.length === 0) {
      reporter.fail('Frontend JavaScript assets were discoverable', { reason: 'No JavaScript asset references were found.' })
    } else {
      const assetBodies = []
      let assetFailure = null

      for (const assetUrl of assetUrls) {
        const asset = await client.request(assetUrl)
        if (asset.status !== 200 || typeof asset.body !== 'string') {
          assetFailure = resultDetails(asset)
          break
        }
        assetBodies.push(asset.body)
      }

      if (assetFailure) {
        reporter.fail('Frontend JavaScript assets were reachable', assetFailure)
      } else {
        const bundleText = assetBodies.join('\n')
        const hasConfiguredApi = bundleText.includes(config.apiUrl)
        const localhostMatches = [...new Set(bundleText.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi) || [])]

        if (hasConfiguredApi && localhostMatches.length === 0) {
          reporter.pass('Frontend bundle uses the configured deployed API', { assetsChecked: assetBodies.length })
        } else {
          reporter.fail('Frontend bundle uses the configured deployed API', {
            configuredApiFound: hasConfiguredApi,
            localhostReferences: localhostMatches,
            assetsChecked: assetBodies.length,
          })
        }
      }
    }
  } else {
    reporter.skip('Frontend bundle API URL check', { reason: 'Frontend HTML was unavailable.' })
  }

  reporter.section('Backend')
  const running = await client.request(`${config.apiUrl}/isRunning`)
  if (running.status === 200 && running.body?.message === 'the clinic backend is running') {
    reporter.pass('Backend is reachable', { path: '/isRunning', httpStatus: running.status })
  } else {
    reporter.fail('Backend is reachable', resultDetails(running))
  }

  const requestedCorsHeaders = ['content-type']
  const preflight = await client.request(`${config.apiUrl}/employee/auth`, {
    method: 'OPTIONS',
    headers: {
      Origin: config.frontendOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': requestedCorsHeaders.join(','),
    },
  })
  const allowedOrigin = preflight.headers['access-control-allow-origin']
  const allowedMethods = preflight.headers['access-control-allow-methods'] || ''
  const allowedHeaders = preflight.headers['access-control-allow-headers'] || ''
  const allowedCredentials = preflight.headers['access-control-allow-credentials'] || ''
  const corsIsValid =
    preflight.status !== null && preflight.status >= 200 && preflight.status < 300 &&
    allowedOrigin === config.frontendOrigin &&
    allowedCredentials.toLowerCase() === 'true' &&
    (allowedMethods === '*' || allowedMethods.toUpperCase().split(',').map((value) => value.trim()).includes('POST')) &&
    requestedCorsHeaders.every((header) => includesAllowedHeader(allowedHeaders, header))

  if (corsIsValid) {
    reporter.pass('Backend CORS preflight accepts the frontend origin', {
      path: '/employee/auth',
      httpStatus: preflight.status,
      note: 'Node does not enforce browser CORS; this validates the backend preflight response.',
    })
  } else {
    reporter.fail('Backend CORS preflight accepts the frontend origin', {
      ...resultDetails(preflight),
      allowedOrigin,
      allowedCredentials,
      allowedMethods,
      allowedHeaders,
    })
  }

  const malformedAuth = await client.request(`${config.apiUrl}/employee/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: config.frontendOrigin,
    },
    rawBody: '{"username":',
  })
  if (malformedAuth.status === 422) {
    reporter.pass('Employee auth route rejects malformed JSON', { path: '/employee/auth', httpStatus: 422 })
  } else {
    reporter.fail('Employee auth route rejects malformed JSON', resultDetails(malformedAuth))
  }

  reporter.section('Authenticated owner smoke')
  if (!config.flags.write) {
    reporter.skip('Owner login', { reason: 'Run with --write to permit session creation.' })
    reporter.skip('Owner protected account list', { reason: 'Owner login was not permitted.' })
    reporter.skip('Owner logout', { reason: 'No owner session was created.' })
    reporter.skip('Post-logout access rejection', { reason: 'No owner session was created.' })
  } else {
    const auth = await ownerClient.request(`${config.apiUrl}/employee/auth`, {
      method: 'POST',
      json: {
        username: config.owner.username,
        phone_number: config.owner.phoneNumber,
        password: config.owner.password,
        valid_time: config.owner.validTime,
      },
    })
    const authCookie = auth.cookieMetadata
    const authBodyIsSafe =
      auth.body && typeof auth.body === 'object' && !Array.isArray(auth.body) &&
      !Object.prototype.hasOwnProperty.call(auth.body, 'token') &&
      !Object.prototype.hasOwnProperty.call(auth.body, 'employee_id')
    const authIsValid =
      auth.status === 200 &&
      auth.body?.allowed === true &&
      typeof auth.body?.expires_at === 'string' && !Number.isNaN(Date.parse(auth.body.expires_at)) &&
      auth.body?.role === 'OWNER' &&
      authBodyIsSafe &&
      authCookie?.received === true &&
      authCookie.name === '__Host-aurora_session' &&
      authCookie.httpOnly === true &&
      authCookie.secure === true &&
      authCookie.sameSite === 'none' &&
      authCookie.path === '/' &&
      authCookie.deleted === false &&
      ownerClient.hasSessionCookie()

    if (authIsValid) {
      reporter.pass('Owner login returned a valid cookie session', {
        path: '/employee/auth',
        httpStatus: auth.status,
        role: auth.body.role,
        expiresAt: auth.body.expires_at,
        sessionFlags: authCookie,
      })
    } else {
      reporter.fail('Owner login returned a valid cookie session', {
        ...resultDetails(auth),
        sessionFlags: authCookie,
        hasSessionCookie: ownerClient.hasSessionCookie(),
        bodyContainsToken: Object.prototype.hasOwnProperty.call(auth.body ?? {}, 'token'),
        bodyContainsEmployeeId: Object.prototype.hasOwnProperty.call(auth.body ?? {}, 'employee_id'),
      })
    }

    if (authIsValid) {
      const createdAccounts = await ownerClient.request(`${config.apiUrl}/owner/accounts/created`)
      const sensitiveKeys = findSensitiveResponseKeys(createdAccounts.body)

      if (createdAccounts.status === 200 && Array.isArray(createdAccounts.body) && sensitiveKeys.length === 0) {
        reporter.pass('Owner protected created-account list is safe and reachable', {
          path: '/owner/accounts/created',
          httpStatus: createdAccounts.status,
          accountCount: createdAccounts.body.length,
          legacyAuthHeadersSent: false,
        })
      } else {
        reporter.fail('Owner protected created-account list is safe and reachable', {
          ...resultDetails(createdAccounts),
          responseIsArray: Array.isArray(createdAccounts.body),
          legacyAuthHeadersSent: false,
          sensitiveKeys,
        })
      }

      const logout = await ownerClient.request(`${config.apiUrl}/employee/auth/logout`, {
        method: 'POST',
      })
      const logoutBodyIsExact =
        logout.body && typeof logout.body === 'object' && !Array.isArray(logout.body) &&
        logout.body.success === true && Object.keys(logout.body).length === 1
      const deletionCookie = logout.cookieMetadata
      const logoutIsValid =
        logout.status === 200 &&
        logoutBodyIsExact &&
        deletionCookie?.received === true &&
        deletionCookie.name === '__Host-aurora_session' &&
        deletionCookie.deleted === true &&
        !ownerClient.hasSessionCookie()

      if (logoutIsValid) {
        reporter.pass('Owner logout cleared the cookie session', {
          path: '/employee/auth/logout',
          httpStatus: logout.status,
          sessionFlags: deletionCookie,
          hasSessionCookie: false,
        })
      } else {
        reporter.fail('Owner logout cleared the cookie session', {
          ...resultDetails(logout),
          sessionFlags: deletionCookie,
          hasSessionCookie: ownerClient.hasSessionCookie(),
        })
      }

      const afterLogout = await ownerClient.request(`${config.apiUrl}/owner/accounts/created`)
      if (afterLogout.status === 401) {
        reporter.pass('Logged-out owner session is rejected', {
          path: '/owner/accounts/created',
          httpStatus: afterLogout.status,
        })
      } else {
        reporter.fail('Logged-out owner session is rejected', resultDetails(afterLogout))
      }
    } else {
      reporter.skip('Owner protected account list', { reason: 'Owner authentication failed.' })
      reporter.skip('Owner logout', { reason: 'No valid owner session was returned.' })
      reporter.skip('Post-logout access rejection', { reason: 'No valid owner session was returned.' })
    }
  }

  const summary = await reporter.finish()
  if (summary.failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('UNEXPECTED TEST ERROR:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
