import { createApiClient, buildOwnerHeaders, findSensitiveResponseKeys } from './apiClient.js'
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

  const requestedCorsHeaders = ['content-type', 'authorization', 'x-employee-username', 'x-employee-phone']
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
  const corsIsValid =
    preflight.status !== null && preflight.status >= 200 && preflight.status < 300 &&
    allowedOrigin === config.frontendOrigin &&
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
      allowedMethods,
      allowedHeaders,
    })
  }

  const malformedAuth = await client.request(`${config.apiUrl}/employee/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    rawBody: '{"username":',
  })
  if (malformedAuth.status === 422) {
    reporter.pass('Employee auth route rejects malformed JSON', { path: '/employee/auth', httpStatus: 422 })
  } else {
    reporter.fail('Employee auth route rejects malformed JSON', resultDetails(malformedAuth))
  }

  reporter.section('Authenticated owner smoke')
  if (!config.flags.write) {
    reporter.skip('Owner login', { reason: 'Run with --write to permit token creation.' })
    reporter.skip('Owner protected account list', { reason: 'Owner login was not permitted.' })
    reporter.skip('Owner logout', { reason: 'No owner token was created.' })
  } else {
    let token = null
    const auth = await client.request(`${config.apiUrl}/employee/auth`, {
      method: 'POST',
      json: {
        username: config.owner.username,
        phone_number: config.owner.phoneNumber,
        password: config.owner.password,
        valid_time: config.owner.validTime,
      },
    })
    const authIsValid =
      auth.status === 200 &&
      auth.body?.allowed === true &&
      typeof auth.body?.token === 'string' && auth.body.token.length > 0 &&
      typeof auth.body?.expires_at === 'string' && !Number.isNaN(Date.parse(auth.body.expires_at)) &&
      auth.body?.role === 'OWNER'

    if (authIsValid) {
      token = auth.body.token
      reporter.pass('Owner login returned a valid session', {
        path: '/employee/auth',
        httpStatus: auth.status,
        role: auth.body.role,
        expiresAt: auth.body.expires_at,
      })
    } else {
      reporter.fail('Owner login returned a valid session', resultDetails(auth))
    }

    if (token) {
      const ownerHeaders = buildOwnerHeaders({
        username: config.owner.username,
        phoneNumber: config.owner.phoneNumber,
        token,
      })
      const hasRoleHeader = Object.keys(ownerHeaders).some((header) => header.toLowerCase().includes('role'))
      const createdAccounts = await client.request(`${config.apiUrl}/owner/accounts/created`, {
        headers: ownerHeaders,
      })
      const sensitiveKeys = findSensitiveResponseKeys(createdAccounts.body)

      if (createdAccounts.status === 200 && Array.isArray(createdAccounts.body) && !hasRoleHeader && sensitiveKeys.length === 0) {
        reporter.pass('Owner protected created-account list is safe and reachable', {
          path: '/owner/accounts/created',
          httpStatus: createdAccounts.status,
          accountCount: createdAccounts.body.length,
          roleHeaderSent: false,
        })
      } else {
        reporter.fail('Owner protected created-account list is safe and reachable', {
          ...resultDetails(createdAccounts),
          responseIsArray: Array.isArray(createdAccounts.body),
          roleHeaderSent: hasRoleHeader,
          sensitiveKeys,
        })
      }

      const logout = await client.request(`${config.apiUrl}/employee/auth/logout`, {
        method: 'POST',
        json: {
          username: config.owner.username,
          phone_number: config.owner.phoneNumber,
          token,
        },
      })
      if (logout.status === 200 && logout.body?.success === true) {
        reporter.pass('Owner logout cleared the test session', { path: '/employee/auth/logout', httpStatus: logout.status })
      } else {
        reporter.fail('Owner logout cleared the test session', resultDetails(logout))
      }
    } else {
      reporter.skip('Owner protected account list', { reason: 'Owner authentication failed.' })
      reporter.skip('Owner logout', { reason: 'No valid owner token was returned.' })
    }
  }

  const summary = await reporter.finish()
  if (summary.failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('UNEXPECTED TEST ERROR:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
