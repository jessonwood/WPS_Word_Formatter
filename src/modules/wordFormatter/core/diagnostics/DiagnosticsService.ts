import type { DiagnosticsReport, StoragePathInfo, BackupDiagnosticsInfo } from '../../types/diagnostics'
import { WpsCapabilityScanner } from './WpsCapabilityScanner'
import { FileSystemDiagnostics } from './FileSystemDiagnostics'
import { DocumentApiDiagnostics } from './DocumentApiDiagnostics'
import { getWpsApplication } from '@/addin/wps/systemApi'
import { getAppDataPath, getTemplatesDirPath, getTemplatesFilePath, getSettingsFilePath, getBackupHistoryFilePath } from '@/shared/utils/persistentStorage'
import { BackupService } from '../backup/BackupService'
import type { DocumentInfo } from '../../types/document'

function getFs(): any {
  if (typeof window === 'undefined') return null
  try {
    const wpsObj = (window as any).wps
    return wpsObj?.FileSystem || getWpsApplication()?.FileSystem || (window as any).Application?.FileSystem || null
  } catch {
    return null
  }
}

function exists(fs: any, path: string): boolean {
  try { return Boolean(fs?.Exists ? fs.Exists(path) : fs?.exists ? fs.exists(path) : false) } catch { return false }
}

function buildStoragePath(name: string, path: string, fs: any): StoragePathInfo {
  const present = exists(fs, path)
  return {
    name,
    path,
    exists: present,
    readable: present,
    writable: Boolean(fs?.WriteFile || fs?.writeAsBinaryString),
    detail: present ? '存在' : '待初始化'
  }
}

export class DiagnosticsService {
  static runFullDiagnostics(): DiagnosticsReport {
    const app = getWpsApplication()
    let appData = ''
    try { appData = getAppDataPath() } catch { appData = 'UNRESOLVED' }

    let doc: any = null
    try { doc = app?.ActiveDocument || null } catch {}

    let docInfo: DocumentInfo | null = null
    if (doc) {
      try {
        docInfo = {
          id: String(doc.Name || 'active-document'),
          name: String(doc.Name || '未命名文档'),
          path: String(doc.FullName || ''),
          isSaved: Boolean(doc.Saved),
          isReadOnly: Boolean(doc.ReadOnly)
        }
      } catch {}
    }

    const apiCapabilities = WpsCapabilityScanner.scan()
    const fileSystemMatrix = FileSystemDiagnostics.runProbe()
    const documentApiDiagnostics = DocumentApiDiagnostics.inspect()
    const fs = getFs()

    let storagePaths: StoragePathInfo[] = []
    try {
      storagePaths = [
        buildStoragePath('AppData 主目录', getTemplatesDirPath(), fs),
        buildStoragePath('备份记录历史 (backup_history.json)', getBackupHistoryFilePath(), fs),
        buildStoragePath('自定义模板文件 (templates.json)', getTemplatesFilePath(), fs),
        buildStoragePath('全局设置文件 (settings.json)', getSettingsFilePath(), fs),
        buildStoragePath('诊断临时目录 (diagnostics)', `${getTemplatesDirPath()}\\diagnostics`, fs)
      ]
    } catch {}

    const readiness = BackupService.evaluateReadiness(docInfo)
    const binaryOk = fileSystemMatrix.some(x => x.api === 'readAsBinaryString' && x.status === 'PASS') &&
      fileSystemMatrix.some(x => x.api === 'writeAsBinaryString' && x.status === 'PASS')
    const backupDirectory = docInfo?.path && /[\\/]/.test(docInfo.path)
      ? docInfo.path.replace(/[\\/][^\\/]+$/, '')
      : ''

    const backupDiagnostics: BackupDiagnosticsInfo = {
      strategy: '当前活动文档所在目录',
      activeDocumentPath: docInfo?.path || '',
      backupDirectory,
      isSaved: Boolean(docInfo?.isSaved),
      directoryWritable: readiness.directoryWritable,
      binaryApiStatus: binaryOk ? 'PASS' : 'FAIL',
      readiness: { ...readiness, binaryApiAvailable: binaryOk }
    }

    const coreApiFailure = apiCapabilities.some(x => ['Application', 'ActiveDocument', 'Paragraphs', 'FileSystem'].includes(x.name) && x.status === 'unavailable')
    const primaryFsFailure = fileSystemMatrix.some(x => x.role === 'PRIMARY' && x.status === 'FAIL')
    const binaryFailure = fileSystemMatrix.some(x => x.role === 'PRIMARY-BINARY' && x.status === 'FAIL')

    let overall: DiagnosticsReport['overall'] = 'healthy'
    let summary = '当前 WPS 环境满足 WPS Word Formatter 核心功能要求。'
    if (coreApiFailure || primaryFsFailure) {
      overall = 'error'
      summary = '检测到核心 WPS API 或正式文件持久化链路不可用。'
    } else if (binaryFailure || readiness.status === 'unavailable') {
      overall = 'warning'
      summary = '核心环境可用，但物理备份能力或当前文档就绪状态存在限制。'
    } else {
      summary = '核心运行环境正常；非核心兼容接口差异不影响正式业务链路。'
    }

    return {
      timestamp: Date.now(),
      wpsVersion: String(app?.Version || app?.Build || 'unknown'),
      addinVersion: 'v0.9.0-beta.1',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'test',
      hostType: app ? 'wps' : 'unknown',
      environment: {
        os: typeof navigator !== 'undefined' ? navigator.platform : 'Node/Test',
        appDataPath: appData,
        isNodeEnv: typeof process !== 'undefined',
        hasWpsObject: typeof window !== 'undefined' && Boolean((window as any).wps),
        hasApplicationObject: Boolean(app)
      },
      apiCapabilities,
      fileSystemMatrix,
      documentApiDiagnostics,
      backupDiagnostics,
      storagePaths,
      overall,
      summary
    }
  }

  static generateTextReport(report: DiagnosticsReport): string {
    const lines: string[] = []
    lines.push('===============================================================')
    lines.push('       WPS Word Formatter - 环境与能力深度诊断报告')
    lines.push('===============================================================')
    lines.push(`诊断时间:     ${new Date(report.timestamp).toLocaleString()}`)
    lines.push(`WPS 版本:     ${report.wpsVersion}`)
    lines.push(`插件版本:     ${report.addinVersion}`)
    lines.push(`宿主类型:     ${report.hostType.toUpperCase()}`)
    lines.push(`系统平台:     ${report.environment.os}`)
    lines.push(`AppData 目录: ${report.environment.appDataPath}`)
    lines.push(`诊断总体结论: [${report.overall.toUpperCase()}] ${report.summary}`)
    lines.push('')
    lines.push('---------------------------------------------------------------')
    lines.push('一、WPS 全局 API 与对象能力探查')
    lines.push('---------------------------------------------------------------')
    report.apiCapabilities.forEach(x => lines.push(`${x.name.padEnd(26)} | ${x.status.toUpperCase()} | ${x.detail || ''}`))
    lines.push('')
    lines.push('---------------------------------------------------------------')
    lines.push('二、FileSystem 文件系统 Capability Matrix (Role / 实机读写探测)')
    lines.push('---------------------------------------------------------------')
    lines.push('API | Role | Status | Result')
    report.fileSystemMatrix.forEach(x => lines.push(`${x.api} | ${x.role} | ${x.status} | ${x.message || x.errorDetail || ''}`))
    lines.push('')
    lines.push('---------------------------------------------------------------')
    lines.push('三、活动文档对象与属性探查 (只读安全检查)')
    lines.push('---------------------------------------------------------------')
    report.documentApiDiagnostics.forEach(x => lines.push(`${x.api} | ${x.status} | ${x.value ?? x.message ?? ''}`))

    if (report.backupDiagnostics) {
      lines.push('')
      lines.push('---------------------------------------------------------------')
      lines.push('四、自动备份策略与能力诊断')
      lines.push('---------------------------------------------------------------')
      lines.push(`备份策略 | ${report.backupDiagnostics.strategy}`)
      lines.push(`当前活动文档 | ${report.backupDiagnostics.activeDocumentPath}`)
      lines.push(`当前备份目录 | ${report.backupDiagnostics.backupDirectory}`)
      lines.push(`Binary backup API | ${report.backupDiagnostics.binaryApiStatus}`)
      lines.push(`Backup readiness | ${report.backupDiagnostics.readiness.status.toUpperCase()} | ${report.backupDiagnostics.readiness.reason}`)
    }

    lines.push('')
    lines.push('---------------------------------------------------------------')
    lines.push('五、持久化存储路径状态')
    lines.push('---------------------------------------------------------------')
    report.storagePaths.forEach(x => lines.push(`${x.name} | ${x.exists ? '存在' : '待初始化'} | ${x.path}`))
    lines.push('===============================================================')
    return lines.join('\n')
  }
}
