const fs = require('fs')
const path = require('path')

const appData = process.env.APPDATA
if (!appData) {
  throw new Error('APPDATA is not defined; persistence read self-test requires a Windows user environment.')
}

const filePath = path.join(appData, 'WPSWordFormatter', 'templates.json')

console.log('[PERSISTENCE DISK VERIFICATION]')
console.log('filePath:', filePath)
console.log('exists:', fs.existsSync(filePath))
if (fs.existsSync(filePath)) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  console.log('rawLength:', raw.length)
  const parsed = JSON.parse(raw)
  console.log('customTemplateCount:', Array.isArray(parsed) ? parsed.length : 0)
  console.log('templateIds:', Array.isArray(parsed) ? parsed.map(t => `${t.name} (${t.id})`) : [])
}
