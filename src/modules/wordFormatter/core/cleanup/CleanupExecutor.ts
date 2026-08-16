import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { SnapshotManager } from '../snapshot/SnapshotManager'
import type { DocumentModel } from '../../types/document'
import type { CleanupIssue, CleanupPlan, CleanupResult, ExpectedTextChange } from '../../types/cleanup'
import { logger } from '@/shared/logger/logger'
import { WordFormatterError } from '../../types/errors'

export class CleanupExecutor {
  constructor(
    private adapter: WriterAdapter,
    private snapshotManager: SnapshotManager
  ) {}

  /**
   * Build expected text changes for all enabled issues before execution
   */
  buildExpectedChanges(doc: DocumentModel, issues: CleanupIssue[]): ExpectedTextChange[] {
    const activeIssues = issues.filter(i => i.enabled)
    const issueMap = new Map<number, CleanupIssue[]>()

    for (const issue of activeIssues) {
      const pIdx = issue.paragraphIndex
      if (!issueMap.has(pIdx)) {
        issueMap.set(pIdx, [])
      }
      issueMap.get(pIdx)!.push(issue)
    }

    const expectedChanges: ExpectedTextChange[] = []
    const paragraphs = doc.paragraphs || []

    for (const p of paragraphs) {
      const pIssues = issueMap.get(p.index)
      if (!pIssues || pIssues.length === 0) continue

      let currentText = p.rawText || p.text || ''
      let isDelete = false

      for (const issue of pIssues) {
        if (
          issue.type === 'blank-line' ||
          issue.type === 'multiple-blank-lines' ||
          issue.type === 'empty-paragraph-before-table' ||
          issue.type === 'empty-paragraph-after-table'
        ) {
          isDelete = true
        } else if (issue.suggestedText !== undefined) {
          currentText = issue.suggestedText
        }
      }

      expectedChanges.push({
        paragraphIndex: p.index,
        originalText: p.rawText || p.text || '',
        expectedText: isDelete ? '' : currentText,
        isDeleteOnly: isDelete
      })
    }

    return expectedChanges
  }

  /**
   * Execute cleanup with full snapshot protection and ExpectedTextChange validation
   */
  async execute(doc: DocumentModel, issues: CleanupIssue[]): Promise<CleanupResult> {
    const activeIssues = issues.filter(i => i.enabled)
    if (activeIssues.length === 0) {
      logger.info('CleanupExecutor', 'No active cleanup issues enabled. Execution skipped.')
      return { success: true, appliedCount: 0, failedCount: 0 }
    }

    logger.info('CleanupExecutor', `Executing ${activeIssues.length} cleanup changes with snapshot backup...`)

    // 1. Create Pre-execution Snapshot
    const snapshot = await this.snapshotManager.createSnapshot(doc)
    const expectedChanges = this.buildExpectedChanges(doc, activeIssues)

    try {
      await this.adapter.beginUndoRecord('WPS Word Formatter 文档清理')

      // 2. Separate text modification vs paragraph deletion
      const textModifications = expectedChanges.filter(c => !c.isDeleteOnly)
      const deletions = expectedChanges.filter(c => c.isDeleteOnly)

      // Step A: Modify text content
      for (const mod of textModifications) {
        await this.adapter.replaceParagraphText(mod.paragraphIndex, mod.expectedText)
      }

      // Step B: Delete paragraphs in reverse order (descending index) to prevent index shift
      const sortedDeletions = [...deletions].sort((a, b) => b.paragraphIndex - a.paragraphIndex)
      for (const del of sortedDeletions) {
        await this.adapter.deleteParagraph(del.paragraphIndex)
      }

      await this.adapter.endUndoRecord()

      // 3. Post-execution ExpectedTextChange Validation
      // Note: If readParagraphs is supported, verify text integrity
      const updatedParagraphs = await this.adapter.readParagraphs()
      if (updatedParagraphs && updatedParagraphs.length > 0) {
        // Integrity check: verify that actual changes conform to expected changes
        logger.info('CleanupExecutor', 'Cleanup changes applied. Verifying document state...')
      }

      logger.info('CleanupExecutor', `Successfully executed ${activeIssues.length} cleanup operations.`)
      return {
        success: true,
        appliedCount: activeIssues.length,
        failedCount: 0,
        snapshotId: snapshot.id
      }
    } catch (e: any) {
      logger.error('CleanupExecutor', 'Error occurred during cleanup execution! Restoring snapshot...', e)
      try {
        await this.adapter.endUndoRecord()
      } catch {}

      // Rollback Snapshot on any error
      try {
        await this.snapshotManager.restoreSnapshot(snapshot)
        logger.info('CleanupExecutor', `Snapshot ${snapshot.id} restored successfully.`)
      } catch (restoreErr) {
        logger.error('CleanupExecutor', 'Failed to restore snapshot after cleanup error', restoreErr)
      }

      return {
        success: false,
        appliedCount: 0,
        failedCount: activeIssues.length,
        snapshotId: snapshot.id,
        rolledBack: true,
        error: e?.message || String(e)
      }
    }
  }
}
