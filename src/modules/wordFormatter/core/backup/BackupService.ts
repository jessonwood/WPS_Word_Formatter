import { logger } from '@/shared/logger/logger'
import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { DocumentInfo } from '../../types/document'
import type { BackupConfig, BackupRecord, BackupResult, BackupSummary, DocumentPathInfo, BackupReadinessResult } from '../../types/backup'
import { BackupRepository, getDocumentPathInfo } from './BackupRepository'
import { BackupRetention } from './BackupRetention'

export class BackupService {
  private config: BackupConfig = {
    enabled: true,
    locationMode: 'document-directory',
    retentionCount: 10
  }

  constructor(private adapter: WriterAdapter) {}

  /**
   * Get current backup configuration
   */
  getConfig(): BackupConfig {
    return { ...this.config }
  }

  /**
   * Update backup configuration
   */
  updateConfig(partial: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...partial }
    if (this.config.retentionCount < 1) this.config.retentionCount = 1
    logger.info('BackupService', 'Backup configuration updated', this.config)
  }

  /**
   * Evaluate backup readiness for the active document (Shared by Diagnostics & Backup Execution)
   */
  static evaluateReadiness(docInfo?: DocumentInfo | null): BackupReadinessResult {
    if (!docInfo || !docInfo.path || docInfo.path.trim().length === 0) {
      return {
        status: 'unavailable',
        documentFullName: docInfo?.name || '未命名文档',
        directory: '',
        documentSaved: false,
        directoryWritable: false,
        binaryApiAvailable: true,
        reason: '当前文档尚未保存到磁盘，没有可供复制的源文件'
      }
    }

    const pathInfo = getDocumentPathInfo(docInfo.path)
    if (!pathInfo.directory) {
      return {
        status: 'unavailable',
        documentFullName: docInfo.path,
        directory: '',
        documentSaved: false,
        directoryWritable: false,
        binaryApiAvailable: true,
        reason: `无法解析当前文档的所在目录: "${docInfo.path}"`
      }
    }

    if (docInfo.isSaved === false) {
      return {
        status: 'needs-save',
        documentFullName: docInfo.path,
        directory: pathInfo.directory,
        documentSaved: false,
        directoryWritable: true,
        binaryApiAvailable: true,
        reason: '当前文档存在未保存修改。直接复制磁盘文件只能备份最后一次保存版本，不包含当前尚未保存的修改。'
      }
    }

    return {
      status: 'ready',
      documentFullName: docInfo.path,
      directory: pathInfo.directory,
      documentSaved: true,
      directoryWritable: true,
      binaryApiAvailable: true,
      reason: '当前文档已保存，可创建包含最新内容的物理备份'
    }
  }

  /**
   * Instance method to evaluate readiness
   */
  getReadiness(docInfo?: DocumentInfo | null): BackupReadinessResult {
    return BackupService.evaluateReadiness(docInfo)
  }

  /**
   * Resolve target backup directory (always the current active document's directory)
   */
  resolveBackupDirectory(docInfo?: DocumentInfo | null): string {
    if (docInfo?.path) {
      const info = getDocumentPathInfo(docInfo.path)
      if (info.directory) return info.directory
    }
    return ''
  }

  /**
   * Generate formatted timestamp string: yyyyMMdd_HHmmss
   */
  static generateTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = date.getFullYear()
    const MM = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const HH = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`
  }

  /**
   * Generate safe backup filename: {baseName}_WPS排版备份_{yyyyMMdd_HHmmss}.{extension}
   */
  static generateBackupFileName(fullNameOrName: string, date: Date = new Date()): string {
    const timestamp = this.generateTimestamp(date)
    const info = getDocumentPathInfo(fullNameOrName)
    const base = info.baseName.replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名文档'
    const ext = info.extension ? `.${info.extension}` : '.docx'
    return `${base}_WPS排版备份_${timestamp}${ext}`
  }

  /**
   * Create physical backup directly for a validated document
   */
  async createPhysicalBackup(docInfo: DocumentInfo): Promise<BackupResult> {
    const docPath = docInfo.path || ''
    if (!docPath) {
      return {
        success: false,
        error: '文档无有效物理路径，无法创建同目录备份。'
      }
    }

    const pathInfo = getDocumentPathInfo(docPath)
    const backupDir = pathInfo.directory
    const backupFileName = BackupService.generateBackupFileName(docPath)
    const backupFilePath = `${backupDir}\\${backupFileName}`

    try {
      BackupRepository.ensureDirectory(backupDir)
      logger.info('BackupService', `Creating auto-backup in document directory -> "${backupFilePath}"...`)

      // Execute safe physical copy using verified binary stream copy & read-back validation
      const saved = await this.adapter.saveCopyAs(backupFilePath)
      if (!saved) {
        return {
          success: false,
          sourcePath: docPath,
          backupPath: backupFilePath,
          error: `自动备份写入失败或校验不通过。源文件: ${docPath}，目标文件: ${backupFilePath}`
        }
      }

      const record: BackupRecord = {
        id: `bk_${Date.now()}`,
        originalFileName: pathInfo.fileName || docInfo.name,
        originalFilePath: docPath,
        backupFileName,
        backupFilePath,
        createdAt: Date.now(),
        isAutoBackup: true
      }

      BackupRepository.addRecord(record)

      // Apply retention policy: keep only newest N backups for this document in backup_history.json
      this.enforceRetention(docPath)

      logger.info('BackupService', `Auto-backup completed successfully: ${backupFileName}`)
      return {
        success: true,
        sourcePath: docPath,
        backupPath: backupFilePath,
        backupRecord: record
      }
    } catch (e: any) {
      logger.error('BackupService', 'Auto-backup encountered error', e)
      return {
        success: false,
        sourcePath: docPath,
        backupPath: backupFilePath,
        error: e?.message || String(e)
      }
    }
  }

  /**
   * Trigger automatic backup before formatting or cleaning
   *
   * @param docInfo Active document info
   * @param hasPlannedChanges Whether there are actual planned changes to apply
   * @param skipPhysicalBackup Whether user explicitly opted to skip physical backup for this run
   */
  async backupBeforeFormat(
    docInfo: DocumentInfo | null,
    hasPlannedChanges: boolean,
    skipPhysicalBackup: boolean = false
  ): Promise<BackupResult> {
    if (!this.config.enabled) {
      logger.info('BackupService', 'Backup skipped: auto-backup is disabled by configuration.')
      return { success: true, skippedReason: 'backup-disabled' }
    }

    if (!hasPlannedChanges) {
      logger.info('BackupService', 'Backup skipped: no format changes planned.')
      return { success: true, skippedReason: 'no-changes-to-apply' }
    }

    if (skipPhysicalBackup) {
      logger.info('BackupService', 'Physical backup skipped by explicit user request.')
      return { success: true, skippedReason: 'skipped-by-user' }
    }

    const readiness = this.getReadiness(docInfo)

    if (readiness.status === 'unavailable') {
      logger.warn('BackupService', `Backup aborted: ${readiness.reason}`)
      return {
        success: false,
        readiness,
        requiresUserDecision: 'unsaved-new-doc',
        error: readiness.reason || '当前文档尚未保存，无法创建同目录物理备份。'
      }
    }

    if (readiness.status === 'needs-save') {
      logger.warn('BackupService', `Backup requires save: ${readiness.reason}`)
      return {
        success: false,
        readiness,
        requiresUserDecision: 'has-unsaved-modifications',
        sourcePath: docInfo?.path,
        error: readiness.reason || '当前文档存在未保存修改。请先保存文档后再进行自动备份和排版。'
      }
    }

    // Document is READY
    return await this.createPhysicalBackup(docInfo!)
  }

  /**
   * Enforce retention policy for a specific document based on backup_history.json
   */
  enforceRetention(sourcePath: string): void {
    if (!sourcePath) return
    try {
      const history = BackupRepository.getHistory()
      const result = BackupRetention.pruneHistory(
        history.items,
        sourcePath,
        this.config.retentionCount,
        (filePath) => BackupRepository.deleteFile(filePath)
      )

      if (result.deletedFiles.length > 0) {
        history.items = result.updatedHistory
        BackupRepository.saveHistory(history)
        logger.info('BackupService', `Retention policy pruned ${result.deletedFiles.length} excess backups for "${sourcePath}".`)
      }
    } catch (e) {
      logger.warn('BackupService', 'Failed to enforce backup retention', e)
    }
  }

  /**
   * Get backup summary and list of backups for the current document
   */
  getSummary(docInfo?: DocumentInfo | null): BackupSummary {
    const backupDir = this.resolveBackupDirectory(docInfo)
    const records = docInfo?.path ? BackupRepository.listBackupsForDocument(docInfo.path) : []
    const pathInfo = docInfo?.path ? getDocumentPathInfo(docInfo.path) : null
    const exampleBackupFileName = docInfo?.path ? BackupService.generateBackupFileName(docInfo.path) : undefined

    return {
      totalBackups: records.length,
      backupDirectory: backupDir || '当前文档所在目录',
      currentFileName: pathInfo?.fileName || docInfo?.name,
      exampleBackupFileName,
      latestBackup: records[0],
      records
    }
  }
}
