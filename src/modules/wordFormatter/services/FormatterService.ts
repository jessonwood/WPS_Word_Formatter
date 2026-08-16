import type { WriterAdapter } from '../adapters/WriterAdapter'
import type { DocumentModel } from '../types/document'
import type { RecognitionResult, ParagraphRole } from '../types/recognition'
import type { FormatTemplate } from '../types/template'
import type { FormatResult, FormatProgress, FormatScope } from '../types/formatting'
import { FormatEngine } from '../core/formatting/FormatEngine'
import { SnapshotManager } from '../core/snapshot/SnapshotManager'
import { ContentIntegrityValidator } from '../core/validation/ContentIntegrityValidator'
import { BackupService } from '../core/backup/BackupService'
import { WordFormatterError } from '../types/errors'
import { defaultWriterAdapter } from '../adapters/adapterFactory'
import { logger } from '@/shared/logger/logger'

export class FormatterService {
  private formatEngine: FormatEngine
  private snapshotManager: SnapshotManager
  private integrityValidator: ContentIntegrityValidator
  private backupService: BackupService

  constructor(private adapter: WriterAdapter = defaultWriterAdapter) {
    this.formatEngine = new FormatEngine(adapter)
    this.snapshotManager = new SnapshotManager(adapter)
    this.integrityValidator = new ContentIntegrityValidator(adapter)
    this.backupService = new BackupService(adapter)
  }

  getSnapshotManager(): SnapshotManager {
    return this.snapshotManager
  }

  getBackupService(): BackupService {
    return this.backupService
  }

  async executeFormat(
    document: DocumentModel,
    recognitionResults: RecognitionResult[],
    userOverrides: Record<number, ParagraphRole>,
    template: FormatTemplate,
    scope: FormatScope = 'all',
    strategy: import('../types/planning').FormatApplyStrategy = 'minimal',
    plan?: import('../types/planning').FormatPlan,
    progressCallback?: (progress: FormatProgress) => void,
    skipPhysicalBackup: boolean = false
  ): Promise<FormatResult> {
    logger.info('FormatterService', `Starting format execution with template: ${template.name} (strategy: ${strategy}, scope: ${scope}, skipBackup: ${skipPhysicalBackup})`)

    const finalRecognition: RecognitionResult[] = recognitionResults.map(r => {
      if (userOverrides[r.paragraphIndex] !== undefined) {
        return {
          ...r,
          role: userOverrides[r.paragraphIndex],
          userOverridden: true,
          reason: [...r.reason, `用户手动指定为：${userOverrides[r.paragraphIndex]}`]
        }
      }
      return r
    })

    const hasPlannedChanges = plan ? plan.summary.totalChanges > 0 : true
    const docInfo = await this.adapter.getActiveDocumentInfo()
    if (this.backupService.getConfig().enabled && hasPlannedChanges && !skipPhysicalBackup) {
      const backupResult = await this.backupService.backupBeforeFormat(
        docInfo || { id: document.id, name: document.name, path: '', isSaved: true, isReadOnly: false },
        hasPlannedChanges,
        skipPhysicalBackup
      )
      if (!backupResult.success) {
        throw new WordFormatterError({
          code: 'WF1201',
          message: backupResult.error || '自动物理备份失败',
          moduleName: 'BackupService'
        })
      }
    }

    const beforeSignature = await this.adapter.getDocumentTextSignature()
    await this.adapter.beginUndoRecord(`智能文档排版 - ${template.name}`)
    const snapshot = await this.snapshotManager.createSnapshot(document)

    try {
      const result = await this.formatEngine.execute({
        document,
        recognition: finalRecognition,
        template,
        scope,
        strategy,
        plan,
        progressCallback
      })

      await this.integrityValidator.validate(beforeSignature)
      await this.adapter.endUndoRecord()

      logger.info('FormatterService', 'Formatting executed and verified successfully')
      return result
    } catch (error) {
      logger.error('FormatterService', 'Error during format execution, executing automatic rollback...', error)
      await this.adapter.endUndoRecord()
      await this.snapshotManager.restoreSnapshot(snapshot)
      throw error
    }
  }

  async undoLastFormat(): Promise<boolean> {
    logger.info('FormatterService', 'Undo last formatting requested')
    return await this.snapshotManager.restoreSnapshot()
  }
}

export const formatterService = new FormatterService()
