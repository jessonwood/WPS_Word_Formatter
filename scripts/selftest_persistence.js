const fs = require('fs')
const path = require('path')

const appData = process.env.APPDATA
if (!appData) {
  throw new Error('APPDATA is not defined; persistence self-test requires a Windows user environment.')
}

const dirPath = path.join(appData, 'WPSWordFormatter')
const filePath = path.join(dirPath, 'templates.selftest.json')

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true })
}

const testTemplate = {
  id: 'template-custom-selftest',
  name: 'PERSISTENCE_SELFTEST',
  description: 'Synthetic persistence self-test fixture',
  isBuiltIn: false,
  version: 1
}

fs.writeFileSync(filePath, JSON.stringify([testTemplate], null, 2), 'utf-8')
const raw = fs.readFileSync(filePath, 'utf-8')
const parsed = JSON.parse(raw)

console.log('[PERSISTENCE SELFTEST]')
console.log('filePath:', filePath)
console.log('exists:', fs.existsSync(filePath))
console.log('rawLength:', raw.length)
console.log('templateFound:', parsed.some(t => t.id === testTemplate.id))

try { fs.unlinkSync(filePath) } catch {}
