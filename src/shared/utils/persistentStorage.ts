import { logger } from '@/shared/logger/logger'
import { getWpsApplication } from '@/addin/wps/systemApi'
import type { FormatTemplate } from '@/modules/wordFormatter/types/template'

/**
 * Single, exclusive data source for WPS custom templates:
 * Application.Env.GetAppDataPath() + "\\WPSWordFormatter\\templates.json"
 * Application.FileSystem
 */

function getWpsEnv(): any {
  if (typeof window === 'undefined') return null
  const wpsObj = (window as any).wps
  if (wpsObj && wpsObj.Env) return wpsObj.Env
  try {
    const app = getWpsApplication()
    if (app && app.Env) return app.Env
  } catch {}
  if ((window as any).Application && (window as any).Application.Env) return (window as any).Application.Env
  return null
}

function getWpsFileSystem(): any {
  if (typeof window === 'undefined') return null
  const wpsObj = (window as any).wps
  if (wpsObj && wpsObj.FileSystem) return wpsObj.FileSystem
  try {
    const app = getWpsApplication()
    if (app && app.FileSystem) return app.FileSystem
  } catch {}
  if ((window as any).Application && (window as any).Application.FileSystem) return (window as any).Application.FileSystem
  return null
}

export function getAppDataPath(): string {
  const env = getWpsEnv()
  if (env) {
    try {
      if (typeof env.GetAppDataPath === 'function' || env.GetAppDataPath) {
        const p = env.GetAppDataPath()
        if (p) return String(p).replace(/\//g, '\\')
      }
    } catch {}
    try {
      if (typeof env.getAppDataPath === 'function' || env.getAppDataPath) {
        const p = env.getAppDataPath()
        if (p) return String(p).replace(/\//g, '\\')
      }
    } catch {}
  }

  if (typeof process !== 'undefined' && process.env && process.env.APPDATA) {
    return process.env.APPDATA.replace(/\//g, '\\')
  }

  // A real WPS host must never silently fall back to a developer-specific path.
  // Fail explicitly so diagnostics can surface an incompatible Env implementation.
  try {
    if (getWpsApplication()) {
      throw new Error('Unable to resolve AppData path from WPS Env.GetAppDataPath().')
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unable to resolve AppData path')) throw e
  }

  // Standalone Vite/browser preview has no WPS Env or Windows process environment.
  // This synthetic path is never used for real WPS disk persistence.
  return 'C:\\Users\\TestUser\\AppData\\Roaming'
}

export function getTemplatesDirPath(): string {
  const appData = getAppDataPath()
  return `${appData}\\WPSWordFormatter`
}

export function getTemplatesFilePath(): string {
  const dir = getTemplatesDirPath()
  return `${dir}\\templates.json`
}

export function getSettingsFilePath(): string {
  const dir = getTemplatesDirPath()
  return `${dir}\\settings.json`
}

function ensureDirectoryExists(fs: any, dirPath: string): boolean {
  if (!fs) return false
  try {
    const exists = fs.Exists ? fs.Exists(dirPath) : (fs.exists ? fs.exists(dirPath) : false)
    if (!exists) {
      if (fs.mkdirSync) {
        fs.mkdirSync(dirPath)
        return true
      }
      if (fs.Mkdir) {
        fs.Mkdir(dirPath)
        return true
      }
      if (fs.mkdir) {
        fs.mkdir(dirPath)
        return true
      }
    }
    return true
  } catch (e) {
    logger.warn('PersistentStorage', `ensureDirectoryExists failed for ${dirPath}`, e)
    return false
  }
}

function stringToBinary(str: string): string {
  try {
    return unescape(encodeURIComponent(str))
  } catch {
    return str
  }
}

function binaryToString(bstr: string): string {
  try {
    return decodeURIComponent(escape(bstr))
  } catch {
    return bstr
  }
}

function decodeFileContent(rawResult: any): string {
  if (rawResult === null || rawResult === undefined) return ''
  if (typeof rawResult === 'string') return rawResult
  if (rawResult instanceof ArrayBuffer || ArrayBuffer.isView(rawResult)) {
    try {
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(rawResult as any)
    } catch {}
  }
  return String(rawResult)
}

let capabilityChecked = false
export function probeFileSystemCapabilities(fs: any, testFilePath: string): void {
  if (capabilityChecked || !fs) return
  capabilityChecked = true

  const cap: Record<string, string> = {}
  const probeContent = JSON.stringify({ probe: 'ok', time: Date.now() })

  try {
    const res = fs.Exists ? fs.Exists(testFilePath) : (fs.exists ? fs.exists(testFilePath) : false)
    cap['Exists'] = res ? 'PASS' : 'PASS (file not present)'
  } catch (e: any) {
    cap['Exists'] = `FAIL (${e?.message || e})`
  }

  try {
    if (fs.WriteFile) {
      fs.WriteFile(testFilePath + '.probe', probeContent)
      cap['WriteFile'] = 'PASS'
    } else {
      cap['WriteFile'] = 'NOT_FOUND'
    }
  } catch (e: any) {
    cap['WriteFile'] = `FAIL (${e?.message || e})`
  }

  try {
    if (fs.ReadFile) {
      const readRes = fs.ReadFile(testFilePath + '.probe')
      cap['ReadFile'] = (readRes !== null && readRes !== undefined) ? 'PASS' : 'EMPTY'
    } else {
      cap['ReadFile'] = 'NOT_FOUND'
    }
  } catch (e: any) {
    cap['ReadFile'] = `FAIL (${e?.message || e})`
  }

  try {
    if (fs.writeFileString) {
      fs.writeFileString(testFilePath + '.probe2', probeContent)
      cap['writeFileString'] = 'PASS'
    } else {
      cap['writeFileString'] = 'NOT_FOUND'
    }
  } catch (e: any) {
    cap['writeFileString'] = `FAIL (${e?.message || e})`
  }

  try {
    if (fs.readFileString) {
      const readRes = fs.readFileString(testFilePath + '.probe2')
      cap['readFileString'] = (readRes !== null && readRes !== undefined) ? 'PASS' : 'EMPTY'
    } else {
      cap['readFileString'] = 'NOT_FOUND'
    }
  } catch (e: any) {
    cap['readFileString'] = `FAIL (${e?.message || e})`
  }

  try {
    if (fs.writeAsBinaryString) {
      fs.writeAsBinaryString(testFilePath + '.probe3', stringToBinary(probeContent))
      cap['writeAsBinaryString'] = 'PASS'
    } else {
      cap['writeAsBinaryString'] = 'NOT_FOUND'
    }
  } catch (e: any) {
    cap['writeAsBinaryString'] = `FAIL (${e?.message || e})`
  }

  try {
    if (fs.readAsBinaryString) {
      const bRes = fs.readAsBinaryString(testFilePath + '.probe3')
      cap['readAsBinaryString'] = (bRes !== null && bRes !== undefined) ? 'PASS' : 'EMPTY'
    } else {
      cap['readAsBinaryString'] = 'NOT_FOUND'
    }
  } catch (e: any) {
    cap['readAsBinaryString'] = `FAIL (${e?.message || e})`
  }

  console.log('[FS_CAPABILITY]', cap)
  logger.info('PersistentStorage', `[FS_CAPABILITY] Exists=${cap.Exists} ReadFile=${cap.ReadFile} WriteFile=${cap.WriteFile} readFileString=${cap.readFileString} writeFileString=${cap.writeFileString} readAsBinaryString=${cap.readAsBinaryString} writeAsBinaryString=${cap.writeAsBinaryString}`)
}

export function getBackupHistoryFilePath(): string {
  const dir = getTemplatesDirPath()
  return `${dir}\\backup_history.json`
}

export function internalWriteFile(fs: any, filePath: string, content: string): boolean {
  if (!fs) return false

  try {
    if (fs.WriteFile) {
      fs.WriteFile(filePath, content)
      return true
    }
  } catch (e1) {
    logger.warn('PersistentStorage', `fs.WriteFile failed for ${filePath}: ${e1}`)
  }

  try {
    if (fs.writeAsBinaryString) {
      fs.writeAsBinaryString(filePath, stringToBinary(content))
      return true
    }
  } catch (e2) {
    logger.warn('PersistentStorage', `fs.writeAsBinaryString fallback failed for ${filePath}: ${e2}`)
  }

  return false
}

export function internalReadFile(fs: any, filePath: string): string | null {
  if (!fs) return null

  try {
    if (fs.ReadFile) {
      const res = fs.ReadFile(filePath)
      const decoded = decodeFileContent(res)
      if (decoded && decoded.trim().length > 0) return decoded
    }
  } catch (e1) {
    logger.warn('PersistentStorage', `fs.ReadFile failed for ${filePath}: ${e1}`)
  }

  try {
    if (fs.readAsBinaryString) {
      const bRes = fs.readAsBinaryString(filePath)
      if (bRes && bRes.length > 0) {
        const decoded = binaryToString(String(bRes))
        if (decoded && decoded.trim().length > 0) return decoded
      }
    }
  } catch (e2) {
    logger.warn('PersistentStorage', `fs.readAsBinaryString fallback failed for ${filePath}: ${e2}`)
  }

  return null
}

let mockTestTemplates: FormatTemplate[] = []

export function loadCustomTemplatesFromDisk(): FormatTemplate[] {
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
    return [...mockTestTemplates]
  }

  const filePath = getTemplatesFilePath()
  const dirPath = getTemplatesDirPath()
  const fs = getWpsFileSystem()

  let exists = false
  let readSucceeded = false
  let raw = ''
  let parseSucceeded = false
  let customTemplates: FormatTemplate[] = []

  if (fs) {
    ensureDirectoryExists(fs, dirPath)
    probeFileSystemCapabilities(fs, filePath)

    try {
      exists = fs.Exists ? fs.Exists(filePath) : (fs.exists ? fs.exists(filePath) : false)
    } catch {}

    if (exists) {
      const content = internalReadFile(fs, filePath)
      if (content && content.trim().length > 0) {
        raw = content
        readSucceeded = true
      }
    }
  } else if (typeof require !== 'undefined') {
    try {
      const nodeFs = require('fs')
      if (nodeFs.existsSync(filePath)) {
        exists = true
        raw = nodeFs.readFileSync(filePath, 'utf-8')
        if (raw.length > 0) readSucceeded = true
      }
    } catch {}
  }

  if (readSucceeded && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        customTemplates = parsed
        parseSucceeded = true
      }
    } catch (e) {
      logger.error('PersistentStorage', `[PERSISTENCE_BOOT] JSON parse failed on ${filePath}`, e)
    }
  }

  console.log('[PERSISTENCE_BOOT]', {
    filePath,
    exists,
    readSucceeded,
    rawLength: raw ? raw.length : 0,
    parseSucceeded,
    customTemplateCount: customTemplates.length
  })
  logger.info('PersistentStorage', `[PERSISTENCE_BOOT] filePath=${filePath} exists=${exists} readSucceeded=${readSucceeded} rawLength=${raw ? raw.length : 0} parseSucceeded=${parseSucceeded} customTemplateCount=${customTemplates.length}`)

  return customTemplates
}

export function saveCustomTemplatesToDisk(templates: FormatTemplate[], targetTemplateNameOrId?: string): boolean {
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
    mockTestTemplates = [...templates]
    return true
  }

  const filePath = getTemplatesFilePath()
  const dirPath = getTemplatesDirPath()
  const fs = getWpsFileSystem()
  const rawJson = JSON.stringify(templates, null, 2)

  if (fs) {
    ensureDirectoryExists(fs, dirPath)

    const written = internalWriteFile(fs, filePath, rawJson)
    if (!written) {
      logger.error('PersistentStorage', `[PERSISTENCE_WRITE] Write failed: File could not be written to ${filePath}`)
      return false
    }

    const exists = fs.Exists ? fs.Exists(filePath) : (fs.exists ? fs.exists(filePath) : false)
    if (!exists) {
      logger.error('PersistentStorage', `[PERSISTENCE_WRITE] File does not exist after write: ${filePath}`)
      return false
    }

    const raw = internalReadFile(fs, filePath)
    const readSucceeded = (raw !== null && raw !== undefined && raw.trim().length > 0)
    const rawLength = raw ? raw.length : 0

    console.log('[PERSISTENCE_WRITE]', { path: filePath, exists, readSucceeded, rawLength })
    logger.info('PersistentStorage', `[PERSISTENCE_WRITE] path=${filePath} exists=${exists} readSucceeded=${readSucceeded} rawLength=${rawLength}`)

    if (!readSucceeded) return false

    let parsed: any = null
    try {
      parsed = JSON.parse(raw!)
    } catch (e) {
      logger.error('PersistentStorage', '[PERSISTENCE_WRITE] JSON.parse failed on readback', e)
      return false
    }

    if (!Array.isArray(parsed)) return false

    if (targetTemplateNameOrId) {
      const found = parsed.some((t: any) => t.id === targetTemplateNameOrId || t.name === targetTemplateNameOrId)
      if (!found) {
        logger.error('PersistentStorage', '[PERSISTENCE_WRITE] Target template was not found in readback array')
        return false
      }
    }

    logger.info('PersistentStorage', '[PERSISTENCE_WRITE] All verification steps succeeded')
    return true
  } else if (typeof require !== 'undefined') {
    try {
      const nodeFs = require('fs')
      if (!nodeFs.existsSync(dirPath)) nodeFs.mkdirSync(dirPath, { recursive: true })
      nodeFs.writeFileSync(filePath, rawJson, 'utf-8')
      const readBack = nodeFs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(readBack)
      if (targetTemplateNameOrId) {
        const found = parsed.some((t: any) => t.id === targetTemplateNameOrId || t.name === targetTemplateNameOrId)
        if (!found) return false
      }
      return true
    } catch {
      return false
    }
  }

  logger.error('PersistentStorage', 'No FileSystem object available for saving')
  return false
}

export function getSavedActiveTemplateId(): string {
  const filePath = getSettingsFilePath()
  const fs = getWpsFileSystem()
  if (fs) {
    try {
      const content = internalReadFile(fs, filePath)
      if (content && content.trim().length > 0) {
        const settings = JSON.parse(content)
        if (settings && settings.activeTemplateId) return settings.activeTemplateId
      }
    } catch {}
  }
  return 'template-government'
}

export function saveActiveTemplateId(id: string): void {
  const filePath = getSettingsFilePath()
  const dirPath = getTemplatesDirPath()
  const fs = getWpsFileSystem()
  if (fs) {
    try {
      ensureDirectoryExists(fs, dirPath)
      const settings = {
        schemaVersion: 1,
        activeTemplateId: id,
        updatedAt: new Date().toISOString()
      }
      internalWriteFile(fs, filePath, JSON.stringify(settings, null, 2))
    } catch {}
  }
}

let mockTestBackupHistory: any = { schemaVersion: 1, items: [] }

export function loadBackupHistoryFromDisk(): { schemaVersion: number; items: any[] } {
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
    return JSON.parse(JSON.stringify(mockTestBackupHistory))
  }

  const filePath = getBackupHistoryFilePath()
  const fs = getWpsFileSystem()
  if (fs) {
    try {
      const content = internalReadFile(fs, filePath)
      if (content && content.trim().length > 0) {
        const parsed = JSON.parse(content)
        if (parsed && Array.isArray(parsed.items)) return parsed
      }
    } catch (e) {
      logger.warn('PersistentStorage', `Failed to load backup history from ${filePath}`, e)
    }
  }
  return { schemaVersion: 1, items: [] }
}

export function saveBackupHistoryToDisk(history: { schemaVersion: number; items: any[] }): boolean {
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
    mockTestBackupHistory = JSON.parse(JSON.stringify(history))
    return true
  }

  const filePath = getBackupHistoryFilePath()
  const dirPath = getTemplatesDirPath()
  const fs = getWpsFileSystem()
  const rawJson = JSON.stringify(history, null, 2)

  if (fs) {
    ensureDirectoryExists(fs, dirPath)
    const written = internalWriteFile(fs, filePath, rawJson)
    if (!written) return false

    try {
      const exists = fs.Exists ? fs.Exists(filePath) : (fs.exists ? fs.exists(filePath) : false)
      if (!exists) return false
      const readBack = internalReadFile(fs, filePath)
      if (!readBack) return false
      const parsed = JSON.parse(readBack)
      return Array.isArray(parsed.items)
    } catch {
      return false
    }
  }
  return false
}
