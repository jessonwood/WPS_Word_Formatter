import type { FileSystemCapabilityResult } from '../../types/diagnostics'
import { getWpsApplication } from '@/addin/wps/systemApi'
import { getTemplatesDirPath } from '@/shared/utils/persistentStorage'

function getFileSystem(): any {
  if (typeof window === 'undefined') return null
  const wpsObj = (window as any).wps
  if (wpsObj?.FileSystem) return wpsObj.FileSystem
  try {
    const app = getWpsApplication()
    return app?.FileSystem || (window as any).Application?.FileSystem || null
  } catch {
    return null
  }
}

export class FileSystemDiagnostics {
  static runProbe(): FileSystemCapabilityResult[] {
    const fs = getFileSystem()
    const unsupported = (api: string, role: FileSystemCapabilityResult['role']): FileSystemCapabilityResult => ({
      api,
      role,
      status: 'NOT_FOUND',
      message: 'WPS FileSystem is not available in this context'
    })

    if (!fs) {
      return [
        unsupported('mkdirSync/Mkdir', 'PRIMARY'), unsupported('Exists', 'PRIMARY'),
        unsupported('WriteFile', 'PRIMARY'), unsupported('ReadFile', 'PRIMARY'),
        { api: 'writeFileString', role: 'UNUSED', status: 'NOT_USED', message: 'Not part of the production persistence path' },
        { api: 'readFileString', role: 'UNUSED', status: 'NOT_USED', message: 'Not part of the production persistence path' },
        unsupported('writeAsBinaryString', 'PRIMARY-BINARY'), unsupported('readAsBinaryString', 'PRIMARY-BINARY')
      ]
    }

    let base = ''
    try { base = `${getTemplatesDirPath()}\\diagnostics` } catch { base = '' }
    const probePath = base ? `${base}\\fs_probe_${Date.now()}.txt` : ''
    const payload = `WPSWordFormatter diagnostics ${Date.now()}`

    const result: FileSystemCapabilityResult[] = []
    const push = (api: string, role: FileSystemCapabilityResult['role'], status: FileSystemCapabilityResult['status'], message?: string) => result.push({ api, role, status, message })

    try {
      if (!base) throw new Error('Diagnostic directory unavailable')
      const exists = fs.Exists ? fs.Exists(base) : (fs.exists ? fs.exists(base) : false)
      if (!exists) {
        if (fs.mkdirSync) fs.mkdirSync(base)
        else if (fs.Mkdir) fs.Mkdir(base)
        else if (fs.mkdir) fs.mkdir(base)
        else throw new Error('No directory creation method')
      }
      push('mkdirSync/Mkdir', 'PRIMARY', 'PASS', 'Diagnostic directory is available')
    } catch (e: any) {
      push('mkdirSync/Mkdir', 'PRIMARY', 'FAIL', e?.message || String(e))
    }

    try {
      if (!fs.Exists && !fs.exists) throw new Error('Exists method unavailable')
      const exists = fs.Exists ? fs.Exists(probePath) : fs.exists(probePath)
      push('Exists', 'PRIMARY', 'PASS', `Absolute path probe available (initial exists=${Boolean(exists)})`)
    } catch (e: any) {
      push('Exists', 'PRIMARY', 'FAIL', e?.message || String(e))
    }

    try {
      if (!fs.WriteFile) throw new Error('WriteFile method unavailable')
      fs.WriteFile(probePath, payload)
      push('WriteFile', 'PRIMARY', 'PASS', 'Physical write succeeded')
    } catch (e: any) {
      push('WriteFile', 'PRIMARY', 'FAIL', e?.message || String(e))
    }

    try {
      if (!fs.ReadFile) throw new Error('ReadFile method unavailable')
      const v = fs.ReadFile(probePath)
      push('ReadFile', 'PRIMARY', v !== null && v !== undefined ? 'PASS' : 'FAIL', 'Physical read completed')
    } catch (e: any) {
      push('ReadFile', 'PRIMARY', 'FAIL', e?.message || String(e))
    }

    // WPS 12.0 has been observed rejecting absolute paths for writeFileString.
    push('writeFileString', 'UNUSED', 'NOT_USED', 'Production persistence uses WriteFile; this compatibility method is intentionally unused')
    push('readFileString', 'UNUSED', 'NOT_USED', 'Production persistence uses ReadFile; this compatibility method is intentionally unused')

    const binaryPath = probePath ? `${probePath}.bin` : ''
    try {
      if (!fs.writeAsBinaryString) throw new Error('writeAsBinaryString method unavailable')
      fs.writeAsBinaryString(binaryPath, payload)
      push('writeAsBinaryString', 'PRIMARY-BINARY', 'PASS', 'Binary string write succeeded')
    } catch (e: any) {
      push('writeAsBinaryString', 'PRIMARY-BINARY', 'FAIL', e?.message || String(e))
    }

    try {
      if (!fs.readAsBinaryString) throw new Error('readAsBinaryString method unavailable')
      const v = fs.readAsBinaryString(binaryPath)
      push('readAsBinaryString', 'PRIMARY-BINARY', v !== null && v !== undefined ? 'PASS' : 'FAIL', 'Binary string read completed')
    } catch (e: any) {
      push('readAsBinaryString', 'PRIMARY-BINARY', 'FAIL', e?.message || String(e))
    }

    // Best-effort cleanup; absence of a delete API does not affect the reported capability.
    try { if (fs.DeleteFile) fs.DeleteFile(probePath) } catch {}
    try { if (fs.DeleteFile) fs.DeleteFile(binaryPath) } catch {}

    return result
  }
}
