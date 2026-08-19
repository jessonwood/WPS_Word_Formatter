import { describe, expect, it } from 'vitest'
import { FormatPlanBuilder } from '../src/modules/wordFormatter/core/planning/FormatPlanBuilder'
import { registerTableParagraphs } from '../src/modules/wordFormatter/core/planning/TableParagraphIsolation'
import { ParagraphFormatter } from '../src/modules/wordFormatter/core/formatting/ParagraphFormatter'
import { TableFormatter } from '../src/modules/wordFormatter/core/formatting/TableFormatter'
import { regulationTemplate } from '../src/modules/wordFormatter/templates/documentProcessing2025'
import type { DocumentModel, ParagraphModel, TableModel } from '../src/modules/wordFormatter/types/document'

function makeParagraph(
  index: number,
  text: string,
  tableIndex?: number,
  firstLineIndentChars = 0,
  alignment: ParagraphModel['alignment'] = 'left'
): ParagraphModel {
  return {
    index,
    text,
    rawText: text,
    normalizedText: text,
    rangeStart: (index - 1) * 100,
    rangeEnd: index * 100,
    alignment,
    fontSize: 16,
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    bold: false,
    firstLineIndentChars,
    leftIndent: 0,
    rightIndent: 0,
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: false,
    tableIndex
  }
}

function makeDocument(tableIndent = 2): DocumentModel {
  const paragraphs = [
    makeParagraph(1, '这是表格外正文。'),
    makeParagraph(2, '业务分类', 1, tableIndent, 'center'),
    makeParagraph(3, '风险客户退出标准', 1, tableIndent, 'left')
  ]

  const tables: TableModel[] = [{
    index: 1,
    rangeStart: 100,
    rangeEnd: 300,
    rowCount: 2,
    columnCount: 2
  }]

  return {
    id: 'v102-table-indent',
    name: 'v102-table-indent.docx',
    signature: 'sig',
    paragraphCount: paragraphs.length,
    tableCount: 1,
    sectionCount: 1,
    paragraphs,
    tables,
    sections: [{ index: 1, orientation: 'portrait' }],
    metadata: {}
  }
}

class MockAdapter {
  paragraphCalls: Array<{ index: number; style: any; protectEmphasis?: boolean }> = []
  tableCalls: number[] = []

  async applyParagraphStyle(index: number, style: any, protectEmphasis?: boolean) {
    this.paragraphCalls.push({ index, style, protectEmphasis })
  }

  async applyTableStyle(index: number, _style: any) {
    this.tableCalls.push(index)
  }
}

describe('v1.0.2 table-cell indentation safety', () => {
  it('excludes table-cell paragraphs from body planning and creates a table-level indent repair', () => {
    const doc = makeDocument(2)
    const plan = FormatPlanBuilder.buildPlan({
      document: doc,
      recognition: [],
      template: regulationTemplate,
      strategy: 'minimal',
      scope: 'all'
    })

    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 2)).toBe(false)
    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 3)).toBe(false)
    expect(plan.changes.some(change =>
      change.targetType === 'table' &&
      change.targetIndex === 1 &&
      change.property === 'table-paragraph-indent'
    )).toBe(true)
  })

  it('does not create an indent repair when table-cell paragraph indents are already zero', () => {
    const doc = makeDocument(0)
    const plan = FormatPlanBuilder.buildPlan({
      document: doc,
      recognition: [],
      template: regulationTemplate,
      strategy: 'minimal',
      scope: 'all'
    })

    expect(plan.changes.some(change => change.property === 'table-paragraph-indent')).toBe(false)
  })

  it('ParagraphFormatter never applies ordinary body/heading styles to registered table-cell paragraphs', async () => {
    const doc = makeDocument(2)
    registerTableParagraphs(doc)
    const adapter = new MockAdapter()
    const formatter = new ParagraphFormatter(adapter as any)

    await formatter.formatParagraph(2, regulationTemplate.body)
    await formatter.formatParagraph(1, regulationTemplate.body)

    expect(adapter.paragraphCalls.some(call => call.index === 2)).toBe(false)
    expect(adapter.paragraphCalls.some(call => call.index === 1)).toBe(true)
  })

  it('TableFormatter resets first-line/left/right indents to zero and preserves existing cell alignment', async () => {
    const doc = makeDocument(2)
    registerTableParagraphs(doc)
    const adapter = new MockAdapter()
    const formatter = new TableFormatter(adapter as any)

    await formatter.formatTable(1, regulationTemplate.table)

    const cell2 = adapter.paragraphCalls.find(call => call.index === 2)
    const cell3 = adapter.paragraphCalls.find(call => call.index === 3)

    expect(cell2).toBeDefined()
    expect(cell3).toBeDefined()
    expect(cell2?.style.firstLineIndentChars).toBe(0)
    expect(cell2?.style.leftIndentChars).toBe(0)
    expect(cell2?.style.rightIndentChars).toBe(0)
    expect(cell2?.style.alignment).toBe('center')
    expect(cell3?.style.alignment).toBe('left')
    expect(cell2?.protectEmphasis).toBe(false)
    expect(adapter.tableCalls).toEqual([1])
  })
})
