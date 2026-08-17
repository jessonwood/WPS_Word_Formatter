import fs from 'node:fs'
const path = 'src/modules/wordFormatter/core/cleanup/CleanupScanner.ts'
let s = fs.readFileSync(path, 'utf8')
const old = `        if (/[ \\u3000]{2,}/.test(raw)) {
          const fixedText = raw.replace(/[ \\u3000]{2,}/g, ' ')
`
const next = `        if (/\\S[ \\u3000]{2,}\\S/.test(raw)) {
          const fixedText = raw.replace(/(\\S)[ \\u3000]{2,}(?=\\S)/g, '$1 ')
`
if (!s.includes(old)) throw new Error('Post-patch internal-space block not found')
s = s.replace(old, next)
fs.writeFileSync(path, s, 'utf8')
