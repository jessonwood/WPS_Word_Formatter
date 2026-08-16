import { describe, it, expect } from 'vitest'
import { CleanupScanner } from '../src/modules/wordFormatter/core/cleanup/CleanupScanner'
import { CleanupExecutor } from '../src/modules/wordFormatter/core/cleanup/CleanupExecutor'
import { CleanupEngine } from '../src/modules/wordFormatter/core/cleanup/CleanupEngine'
import { SnapshotManager } from '../src/modules/wordFormatter/core/snapshot/SnapshotManager'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'
import type { WriterAdapter } from '../src/modules/wordFormatter/adapters/WriterAdapter'

class MockCleanupWriterAdapter implements Partial<WriterAdapter> {
  replacedTexts: Record<number, string> = {}
  deletedParagraphs: number[] = []
  undoRecords: string[] = []
  signature: string = 'sig-cleanup-01'

  async beginUndoRecord(name: string) {
    this.undoRecords.push(name)
  }
  async endUndoRecord() {}
  async replaceParagraphText(paragraphIndex: number, text: string) {
    this.replacedTexts[paragraphIndex] = text
  }
  async deleteParagraph(paragraphIndex: number) {
    this.deletedParagraphs.push(paragraphIndex)
  }
  async readParagraphs() {
    return []
  }
  async getDocumentTextSignature() {
    return this.signature
  }
}

function createTestDoc(): DocumentModel {
  const texts = [
    '关于2026年企业发展的通知',                           // 1. Title
    '   段首手工空格段落，应该使用首行缩进。',            // 2. Leading spaces
    '\t\t使用Tab键模拟段落缩进。',                       // 3. Tab indent
    '中文字符之间   有三个多余空格。',                     // 4. Multiple spaces
    'This is a clean English sentence with spaces.',    // 5. English normal space
    '段尾有多余的空格和换行   \r',                        // 6. Trailing spaces
    '包含软回车\v手工换行符的段落。',                     // 7. Manual line break
    '',                                                 // 8. Blank line 1
    '',                                                 // 9. Blank line 2 (consecutive)
    '表1 业务数据统计表',                               // 10. Table caption
    '',                                                 // 11. Empty before table
    '表格正文段落',                                     // 12. Table
    '',                                                 // 13. Empty after table
    '结尾正文内容。'                                    // 14. Body
  ]

  const paragraphs: ParagraphModel[] = texts.map((t, i) => ({
    index: i + 1,
    text: t,
    rawText: t.endsWith('\r') ? t : t + '\r',
    normalizedText: t.trim(),
    rangeStart: i * 100,
    rangeEnd: (i + 1) * 100,
    alignment: 'left',
    fontSize: 16,
    bold: false,
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: t.trim().length === 0,
    tableIndex: i + 1 === 12 ? 1 : undefined
  }))

  return {
    id: 'test-cleanup-doc',
    name: 'test-cleanup.docx',
    signature: 'sig-cleanup-01',
    paragraphCount: paragraphs.length,
    tableCount: 1,
    sectionCount: 1,
    sections: [{ index: 1, orientation: 'portrait', topMargin: 105, bottomMargin: 100, leftMargin: 80, rightMargin: 80 }],
    tables: [{ index: 1, rangeStart: 1100, rangeEnd: 1200, rowCount: 2, columnCount: 2, previousParagraphIndex: 11, nextParagraphIndex: 13 }],
    paragraphs,
    metadata: { title: 'Test Cleanup', charCount: 200 }
  }
}

describe('V2.3 Document Cleanup Suite', () => {
  it('1. CleanupScanner discovers multiple cleanup issues correctly', () => {
    const scanner = new CleanupScanner()
    const doc = createTestDoc()
    const issues = scanner.scan(doc)

    expect(issues.length).toBeGreaterThan(0)

    // Check Leading Spaces detected
    const leading = issues.find(i => i.type === 'leading-spaces')
    expect(leading).toBeDefined()
    expect(leading?.paragraphIndex).toBe(2)
    expect(leading?.safeAutoFix).toBe(true)

    // Check Tab Indent detected
    const tab = issues.find(i => i.type === 'tab-indent')
    expect(tab).toBeDefined()
    expect(tab?.paragraphIndex).toBe(3)
    expect(tab?.safeAutoFix).toBe(true)

    // Check Multiple Spaces in Chinese detected
    const multiSpace = issues.find(i => i.type === 'multiple-spaces')
    expect(multiSpace).toBeDefined()
    expect(multiSpace?.paragraphIndex).toBe(4)

    // Check Trailing Spaces detected
    const trailing = issues.find(i => i.type === 'trailing-spaces')
    expect(trailing).toBeDefined()
    expect(trailing?.paragraphIndex).toBe(6)

    // Check Manual Line Break detected (and unchecked by default)
    const manualBreak = issues.find(i => i.type === 'manual-line-break')
    expect(manualBreak).toBeDefined()
    expect(manualBreak?.paragraphIndex).toBe(7)
    expect(manualBreak?.safeAutoFix).toBe(false)
    expect(manualBreak?.enabled).toBe(false)

    // Check Consecutive Blank lines detected (both P8 and P9)
    const blank8 = issues.find(i => i.paragraphIndex === 8 && i.type === 'multiple-blank-lines')
    const blank9 = issues.find(i => i.paragraphIndex === 9 && i.type === 'multiple-blank-lines')
    expect(blank8).toBeDefined()
    expect(blank9).toBeDefined()

    // Check Empty paragraph before/after table
    const emptyBeforeTable = issues.find(i => i.type === 'empty-paragraph-before-table')
    expect(emptyBeforeTable).toBeDefined()
    expect(emptyBeforeTable?.paragraphIndex).toBe(11)
  })

  it('2. Preserves English standard spaces without false positives', () => {
    const scanner = new CleanupScanner()
    const doc = createTestDoc()
    const issues = scanner.scan(doc)

    // Paragraph 5 is English sentence, should NOT have multiple-spaces issue
    const engIssue = issues.find(i => i.paragraphIndex === 5 && i.type === 'multiple-spaces')
    expect(engIssue).toBeUndefined()
  })

  it('3. CleanupEngine groups category summaries with safe auto-fix counts', () => {
    const adapter = new MockCleanupWriterAdapter()
    const engine = new CleanupEngine(adapter as unknown as WriterAdapter)
    const doc = createTestDoc()

    const issues = engine.scan(doc)
    const summaries = engine.getCategorySummaries(issues)

    expect(summaries.length).toBeGreaterThan(0)
    for (const sum of summaries) {
      expect(sum.count).toBeGreaterThan(0)
      expect(sum.name).toBeDefined()
    }
  })

  it('4. CleanupExecutor builds ExpectedTextChanges and executes with snapshot protection', async () => {
    const adapter = new MockCleanupWriterAdapter()
    const snapshotManager = new SnapshotManager(adapter as unknown as WriterAdapter)
    const executor = new CleanupExecutor(adapter as unknown as WriterAdapter, snapshotManager)
    const doc = createTestDoc()

    const scanner = new CleanupScanner()
    const issues = scanner.scan(doc)

    const expected = executor.buildExpectedChanges(doc, issues)
    expect(expected.length).toBeGreaterThan(0)

    const result = await executor.execute(doc, issues)
    expect(result.success).toBe(true)
    expect(result.appliedCount).toBeGreaterThan(0)
    expect(adapter.undoRecords).toContain('WPS Word Formatter 文档清理')

    // Verifies text replacements were applied
    expect(Object.keys(adapter.replacedTexts).length).toBeGreaterThan(0)
    // Verifies deleteParagraph was called for blank lines / table empty paragraphs
    expect(adapter.deletedParagraphs.length).toBeGreaterThan(0)
  })
})
