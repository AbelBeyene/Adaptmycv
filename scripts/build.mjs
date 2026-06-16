#!/usr/bin/env node
/**
 * Runs `tsc -b && vite build` unless the current commit already has a
 * passing Vercel deployment check on GitHub, in which case the build is
 * skipped to avoid duplicate work.
 *
 * Requires the GitHub CLI (`gh`) to be authenticated.
 * Falls back to running the full build if the check cannot be determined.
 */

import { execSync } from 'node:child_process'

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts }).trim()
}

function getVercelCheckStatus() {
  const sha = run('git rev-parse HEAD')

  const remoteUrl = run('git remote get-url origin')
  const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)
  if (!match) return null
  const repo = match[1]

  const raw = run(`gh api repos/${repo}/commits/${sha}/check-runs --jq '.check_runs[] | select(.name | ascii_downcase | contains("vercel")) | .conclusion'`, { stdio: ['pipe', 'pipe', 'pipe'] })
  return raw || null
}

let vercelPassed = false

try {
  const conclusion = getVercelCheckStatus()
  if (conclusion === 'success') {
    vercelPassed = true
  }
} catch {
  // gh not installed, not authenticated, or commit has no checks yet — build normally
}

if (vercelPassed) {
  console.log('Vercel build already passed for this commit — skipping local build.')
  process.exit(0)
}

console.log('Running build...')
run('tsc -b && vite build', { stdio: 'inherit' })
