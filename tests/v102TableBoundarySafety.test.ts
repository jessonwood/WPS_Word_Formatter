import { describe, expect, it } from 'vitest'
import { CleanupScanner } from '../src/modules/wordFormatter/core/cleanup/CleanupScanner'
import { CleanupExecutor } from '../src/modules/wordFormatter/core/cleanup/CleanupExecutor'
import { TableScanner } from '../src/modules/wordFormatter/core/scanner/TableScanner'
import type { DocumentModel, ParagraphModel, TableModel } from '../src/modules/wordFormatter/types/document'

function paragraph(index: number, text: string, rangeStart: number, rangeEnd: number): ParagraphModel {
  return {
    index,
    text,
    rawText: text,
    normalizedText: text,
    rangeStart,
    rangeEnd,
    alignment: 'left',
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: text.trim().length === 0
  }
}

function documentModel(paragraphs: ParagraphModel[], tables: TableModel[]): DocumentModel {
  return {
    id: 'v102',
    name: 'v102.docx',
    paragraphCount: paragraphs.length,
    tableCount: tables.length,
    sectionCount: 1,
    paragraphs,
    tables,
    sections: [{ index: 1, orientation: 'portrait' }],
    metadata: {},
    signature: 'sig'
  }
}

describe('v1.0.2 table boundary cleanup safety', () => {
  it('marks paragraphs inside a table and records outside neighbors', async () => {
    const paragraphs = [
      paragraph(1, '表1 四类风险客户清退积分规则', 0, 18),
      paragraph(2, '业务分类', 20, 30),
      paragraph(3, '注：', 42, 46)
    ]

    const adapter = {
      readTables: async () => [
        { index: 1, rangeStart: 19, rangeEnd: 40, rowCount: 2, columnCount: 2 }
      ]
    } as any

    const tables = await new TableScanner(adapter).scan(paragraphs)

    expect(paragraphs[1].tableIndex).toBe(1)
    expect(tables[0].previousParagraphIndex).toBe(1)
    expect(tables[0].nextParagraphIndex).toBe(3)
  })

  it('does not create cleanup issues for table contents or table boundary anchors', () => {
    const paragraphs = [
      paragraph(1, '正文', 0, 4),
      paragraph(2, '表1 四类风险客户清退积分规则', 5, 23),
      paragraph(3, '', 24, 25),
      { ...paragraph(4, '业务分类', 30, 40), tableIndex: 1 },
      paragraph(5, '注：', 80, 84),
      paragraph(6, '', 100, 101)
    ]

    const tables: TableModel[] = [{
      index: 1,
      rangeStart: 30,
      rangeEnd: 79,
      rowCount: 5,
      columnCount: 2,
      previousParagraphIndex: 3,
      nextParagraphIndex: 5
    }]

    const issues = new CleanupScanner().scan(documentModel(paragraphs, tables))

    expect(issues.some(issue => issue.paragraphIndex === 3)).toBe(false)
    expect(issues.some(issue => issue.paragraphIndex === 4)).toBe(false)
    expect(issues.some(issue => issue.paragraphIndex === 5)).toBe(false)
    expect(issues.some(issue => issue.paragraphIndex === 6)).toBe(true)
    expect(issues.every(issue => issue.safeAutoFix === false)).toBe(true)
  })

  it('executor ignores stale cleanup requests for protected table boundary paragraphs', () => {
    const paragraphs = [
      paragraph(1, '表1 标题', 0, 8),
      paragraph(2, '', 9, 10),
      paragraph(3, '', 100, 101)
    ]
    const tables: TableModel[] = [{
      index: 1,
      rangeStart: 20,
      rangeEnd: 90,
      rowCount: 2,
      columnCount: 2,
      previousParagraphIndex: 2
    }]
    const doc = documentModel(paragraphs, tables)
    const issues = [
      {
        id: 'protected-boundary',
        type: 'blank-line',
        paragraphIndex: 2,
        originalText: '',
        suggestedText: '',
        reason: 'stale issue',
        severity: 'info',
        enabled: true,
        safeAutoFix: false
      },
      {
        id: 'normal-blank',
        type: 'blank-line',
        paragraphIndex: 3,
        originalText: '',
        suggestedText: '',
        reason: 'manual cleanup',
        severity: 'info',
        enabled: true,
        safeAutoFix: false
      }
    ] as any

    const executor = new CleanupExecutor({} as any, {} as any)
    const changes = executor.buildExpectedChanges(doc, issues)

    expect(changes.some(change => change.paragraphIndex === 2)).toBe(false)
    expect(changes.some(change => change.paragraphIndex === 3)).toBe(true)
  })

  it('marks every detected cleanup issue as manual-only', () => {
    const paragraphs = [
      paragraph(1, '第一章   总则', 0, 12),
      paragraph(2, '', 13, 14)
    ]
    const issues = new CleanupScanner().scan(documentModel(paragraphs, []))

    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every(issue => issue.safeAutoFix === false)).toBe(true)
  })
})
