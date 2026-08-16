import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)

const forbiddenTrackedExtensions = new Set([
  '.doc', '.docx', '.docm', '.xls', '.xlsx', '.xlsm', '.pdf',
  '.7z', '.zip', '.rar', '.log', '.pfx', '.p12', '.pem', '.key'
])

const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue', '.md', '.txt', '.json',
  '.xml', '.yml', '.yaml', '.ps1', '.bat', '.css', '.html', '.d.ts'
])

const findings = []
const formerDeveloperUsername = ['jes', 'so'].join('')

for (const file of tracked) {
  const ext = path.extname(file).toLowerCase()

  if (forbiddenTrackedExtensions.has(ext)) {
    findings.push(`${file}: release/privacy-sensitive binary or credential-like file is tracked`)
  }

  if (!textExtensions.has(ext) && !['LICENSE', '.gitignore'].includes(path.basename(file))) continue

  let content = ''
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  const checks = [
    {
      regex: /C:\\Users\\(?!TestUser(?:\\|$)|Public(?:\\|$))([^\\\r\n]+)/gi,
      label: 'personal Windows user path'
    },
    {
      regex: /C:\/Users\/(?!TestUser(?:\/|$)|Public(?:\/|$))([^/\r\n]+)/gi,
      label: 'personal Windows user path'
    },
    {
      regex: /\/Users\/(?!TestUser(?:\/|$))([^/\r\n]+)/g,
      label: 'personal macOS user path'
    },
    {
      regex: new RegExp(`\\b${formerDeveloperUsername}\\b`, 'gi'),
      label: 'developer-local username literal'
    },
    {
      regex: /\bghp_[A-Za-z0-9]{20,}\b/g,
      label: 'GitHub classic token-like value'
    },
    {
      regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
      label: 'GitHub fine-grained token-like value'
    },
    {
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      label: 'AWS access key-like value'
    },
    {
      regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
      label: 'API secret-like value'
    }
  ]

  for (const check of checks) {
    const matches = [...content.matchAll(check.regex)]
    for (const match of matches) {
      const line = content.slice(0, match.index).split(/\r?\n/).length
      findings.push(`${file}:${line}: ${check.label}`)
    }
  }
}

if (findings.length > 0) {
  console.error('Public-release hygiene check failed:')
  for (const finding of findings) console.error(` - ${finding}`)
  process.exit(1)
}

console.log(`Public-release hygiene check passed (${tracked.length} tracked files scanned).`)
