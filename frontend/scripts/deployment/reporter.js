import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { redact } from './apiClient.js'

const symbols = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
}

export class DeploymentReporter {
  constructor({ reportPath = null } = {}) {
    this.reportPath = reportPath
    this.results = []
    this.currentSection = 'General'
  }

  section(name) {
    this.currentSection = name
    console.log(`\n[${name}]`)
  }

  record(status, name, details = {}) {
    const safeDetails = redact(details)
    this.results.push({ section: this.currentSection, status, name, details: safeDetails })
    const suffix = Object.keys(safeDetails).length > 0 ? ` ${JSON.stringify(safeDetails)}` : ''
    console.log(`${symbols[status]}: ${name}${suffix}`)
  }

  pass(name, details) {
    this.record('PASS', name, details)
  }

  fail(name, details) {
    this.record('FAIL', name, details)
  }

  skip(name, details) {
    this.record('SKIP', name, details)
  }

  get hasFailures() {
    return this.results.some((result) => result.status === 'FAIL')
  }

  async finish() {
    const summary = {
      passed: this.results.filter((result) => result.status === 'PASS').length,
      failed: this.results.filter((result) => result.status === 'FAIL').length,
      skipped: this.results.filter((result) => result.status === 'SKIP').length,
    }

    console.log(`\nSummary: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped.`)

    if (this.reportPath) {
      const outputPath = resolve(this.reportPath)
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results: this.results }, null, 2)}\n`, 'utf8')
      console.log(`Redacted report written to ${outputPath}`)
    }

    return summary
  }
}
