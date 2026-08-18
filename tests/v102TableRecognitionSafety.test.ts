import { describe, expect, it } from 'vitest'
import { TableScanner } from '../src/modules/wordFormatter/core/scanner/TableScanner'
import { RecognitionEngine } from '../src/modules/wordFormatter/core/recognition/RecognitionEngine'
import { FormatPlanBuilder } from '../src/modules/wordFormatter/core/planning/FormatPlanBuilder'
import { regulationTemplate } from '../src/modules/wordFormatter/templates/documentProcessing2025'
import type { DocumentModel, ParagraphModel, TableModel } from '../src/modules/wordFormatter/types/document'

function p(index: number, text: string, start: number, end: number): ParagraphModel {
  return {
    index,
    text,
    rawText: text,
    normalizedText: text,
    rangeStart: start,
    rangeEnd: end,
    alignment: 'left',
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: text.trim().length === 0
  }
}

function doc(paragraphs: ParagraphModel[], tables: TableModel[]): DocumentModel {
  return {
    id: 'table-recognition-safety',
    name: 'table-recognition-safety.docx',
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

describe('v1.0.2 table structure recognition safety', () => {
  it('marks only empty immediate table neighbors as structural boundaries', async () => {
    const paragraphs = [
      p(1, '表1 四类风险客户清退积分规则', 0, 20),
      p(2, '', 21, 22),
      p(3, '业务分类', 30, 40),
      p(4, '', 81, 82),
      p(5, '后续正文', 90, 100)
    ]
    const adapter = {
      readTables: async () => [{ index: 1, rangeStart: 30, rangeEnd: 80, rowCount: 2, columnCount: 2 }]
    } as any

    const tables = await new TableScanner(adapter).scan(paragraphs)

    expect(paragraphs[2].tableIndex).toBe(1)
    expect(paragraphs[1].isTableBoundary).toBe(true)
    expect(paragraphs[3].isTableBoundary).toBe(true)
    expect(paragraphs[0].isTableBoundary).not.toBe(true)
    expect(tables[0].previousParagraphIndex).toBe(2)
    expect(tables[0].nextParagraphIndex).toBe(4)
  })

  it('does not recognize table cells or empty table anchors as blank lines', () => {
    const paragraphs = [
      p(1, '表1 四类风险客户清退积分规则', 0, 20),
      { ...p(2, '', 21, 22), isTableBoundary: true },
      { ...p(3, '', 30, 40), tableIndex: 1 },
      { ...p(4, '业务分类', 41, 50), tableIndex: 1 },
      p(5, '', 81, 82),
      p(6, '后续正文', 90, 100)
    ]
    const tables: TableModel[] = [{ index: 1, rangeStart: 30, rangeEnd: 80, rowCount: 2, columnCount: 2 }]
    const results = new RecognitionEngine().analyze(doc(paragraphs, tables))

    expect(results.some(r => r.paragraphIndex === 2)).toBe(false)
    expect(results.some(r => r.paragraphIndex === 3)).toBe(false)
    expect(results.some(r => r.paragraphIndex === 4)).toBe(false)
    expect(results.find(r => r.paragraphIndex === 5)?.role).toBe('blank')
    expect(results.some(r => r.paragraphIndex === 1)).toBe(true)
    expect(results.some(r => r.paragraphIndex === 6)).toBe(true)
  })

  it('does not create paragraph format changes for an empty table boundary anchor', () => {
    const paragraphs = [
      p(1, '正文内容', 0, 20),
      { ...p(2, '', 21, 22), isTableBoundary: true },
      { ...p(3, '业务分类', 30, 40), tableIndex: 1 }
    ]
    const tables: TableModel[] = [{ index: 1, rangeStart: 30, rangeEnd: 80, rowCount: 1, columnCount: 1 }]
    const model = doc(paragraphs, tables)
    const recognition = new RecognitionEngine().analyze(model)
    const plan = FormatPlanBuilder.buildPlan({
      document: model,
      recognition,
      template: regulationTemplate,
      strategy: 'minimal',
      scope: 'all'
    })

    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 2)).toBe(false)
    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 3)).toBe(false)
  })
})
