import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { DocumentModel } from '../../types/document'
import type { CleanupIssue, CleanupPlan, CleanupResult, CleanupCategorySummary } from '../../types/cleanup'
import { CleanupScanner } from './CleanupScanner'
import { CleanupExecutor } from './CleanupExecutor'
import { SnapshotManager } from '../snapshot/SnapshotManager'
import { logger } from '@/shared/logger/logger'

export class CleanupEngine {
  private scanner: CleanupScanner
  private executor: CleanupExecutor

  constructor(private adapter: WriterAdapter) {
    this.scanner = new CleanupScanner()
    this.executor = new CleanupExecutor(adapter, new SnapshotManager(adapter))
  }

  /**
   * Scan document and return all discovered cleanup issues
   */
  scan(doc: DocumentModel): CleanupIssue[] {
    return this.scanner.scan(doc)
  }

  /**
   * Build a complete preview plan from current issues
   */
  buildPlan(doc: DocumentModel, issues: CleanupIssue[]): CleanupPlan {
    const activeIssues = issues.filter(i => i.enabled)
    const expectedChanges = this.executor.buildExpectedChanges(doc, activeIssues)

    return {
      documentId: doc.id,
      documentSignature: doc.signature,
      createdAt: Date.now(),
      totalIssues: issues.length,
      enabledIssues: activeIssues.length,
      issues,
      expectedChanges
    }
  }

  /**
   * Execute cleanup for selected issues
   */
  async execute(doc: DocumentModel, issues: CleanupIssue[]): Promise<CleanupResult> {
    return this.executor.execute(doc, issues)
  }

  /**
   * Group issues by category with counts and safe auto-fix counts
   */
  getCategorySummaries(issues: CleanupIssue[]): CleanupCategorySummary[] {
    const categoryNames: Record<string, string> = {
      'blank-line': '多余空行',
      'multiple-blank-lines': '连续空行',
      'multiple-spaces': '多余空格',
      'trailing-spaces': '段尾空格',
      'leading-spaces': '段首手工空格',
      'tab-indent': 'Tab 模拟缩进',
      'manual-line-break': '手工换行 (软回车)',
      'duplicate-page-break': '重复分页符',
      'duplicate-section-break': '异常分节符',
      'empty-paragraph-before-table': '表格前空段',
      'empty-paragraph-after-table': '表格后空段'
    }

    const map = new Map<string, { count: number; safeCount: number }>()

    for (const issue of issues) {
      if (!map.has(issue.type)) {
        map.set(issue.type, { count: 0, safeCount: 0 })
      }
      const data = map.get(issue.type)!
      data.count++
      if (issue.safeAutoFix) data.safeCount++
    }

    const summaries: CleanupCategorySummary[] = []
    for (const [type, data] of map.entries()) {
      summaries.push({
        type: type as any,
        name: categoryNames[type] || type,
        count: data.count,
        safeCount: data.safeCount
      })
    }

    return summaries
  }
}
