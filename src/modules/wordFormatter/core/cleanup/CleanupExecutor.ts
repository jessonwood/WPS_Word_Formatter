import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { SnapshotManager } from '../snapshot/SnapshotManager'
import type { DocumentModel } from '../../types/document'
import type { CleanupIssue, CleanupResult, ExpectedTextChange } from '../../types/cleanup'
import { logger } from '@/shared/logger/logger'

export class CleanupExecutor {
  constructor(
    private adapter: WriterAdapter,
    private snapshotManager: SnapshotManager
  ) {}

  buildExpectedChanges(doc: DocumentModel, issues: CleanupIssue[]): ExpectedTextChange[] {
    const activeIssues = issues.filter(i => i.enabled)
    const issueMap = new Map<number, CleanupIssue[]>()

    for (const issue of activeIssues) {
      const pIdx = issue.paragraphIndex
      if (!issueMap.has(pIdx)) issueMap.set(pIdx, [])
      issueMap.get(pIdx)!.push(issue)
    }

    const expectedChanges: ExpectedTextChange[] = []
    const paragraphs = doc.paragraphs || []
    const protectedTableParagraphs = new Set<number>()
    for (const table of doc.tables || []) {
      if (table.previousParagraphIndex !== undefined) protectedTableParagraphs.add(table.previousParagraphIndex)
      if (table.nextParagraphIndex !== undefined) protectedTableParagraphs.add(table.nextParagraphIndex)
    }

    for (const p of paragraphs) {
      if (p.tableIndex !== undefined || protectedTableParagraphs.has(p.index)) {
        if (issueMap.has(p.index)) {
          logger.warn('CleanupExecutor', `Skipped cleanup for protected table paragraph P${p.index}`)
        }
        continue
      }

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

  async execute(doc: DocumentModel, issues: CleanupIssue[]): Promise<CleanupResult> {
    const activeIssues = issues.filter(i => i.enabled)
    if (activeIssues.length === 0) {
      logger.info('CleanupExecutor', 'No active cleanup issues enabled. Execution skipped.')
      return { success: true, appliedCount: 0, failedCount: 0 }
    }

    const snapshot = await this.snapshotManager.createSnapshot(doc)
    const expectedChanges = this.buildExpectedChanges(doc, activeIssues)

    if (expectedChanges.length === 0) {
      logger.info('CleanupExecutor', 'All requested cleanup operations were protected/skipped.')
      return { success: true, appliedCount: 0, failedCount: 0, snapshotId: snapshot.id }
    }

    try {
      await this.adapter.beginUndoRecord('WPS Word Formatter 文档清理')

      const textModifications = expectedChanges.filter(c => !c.isDeleteOnly)
      const deletions = expectedChanges.filter(c => c.isDeleteOnly)

      for (const mod of textModifications) {
        await this.adapter.replaceParagraphText(mod.paragraphIndex, mod.expectedText)
      }

      const sortedDeletions = [...deletions].sort((a, b) => b.paragraphIndex - a.paragraphIndex)
      for (const del of sortedDeletions) {
        await this.adapter.deleteParagraph(del.paragraphIndex)
      }

      await this.adapter.endUndoRecord()
      await this.adapter.readParagraphs()

      return {
        success: true,
        appliedCount: expectedChanges.length,
        failedCount: 0,
        snapshotId: snapshot.id
      }
    } catch (e: any) {
      logger.error('CleanupExecutor', 'Error occurred during cleanup execution! Restoring snapshot...', e)
      try { await this.adapter.endUndoRecord() } catch {}
      try { await this.snapshotManager.restoreSnapshot(snapshot) } catch (restoreErr) {
        logger.error('CleanupExecutor', 'Failed to restore snapshot after cleanup error', restoreErr)
      }

      return {
        success: false,
        appliedCount: 0,
        failedCount: expectedChanges.length,
        snapshotId: snapshot.id,
        rolledBack: true,
        error: e?.message || String(e)
      }
    }
  }
}
