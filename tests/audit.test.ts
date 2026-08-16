import { describe, it, expect } from 'vitest'
import { StructureAuditEngine } from '../src/modules/wordFormatter/core/audit/StructureAuditEngine'
import { StructureScoreCalculator } from '../src/modules/wordFormatter/core/audit/StructureScoreCalculator'
import { DocumentAuditor } from '../src/modules/wordFormatter/core/audit/DocumentAuditor'
import { governmentTemplate } from '../src/modules/wordFormatter/templates/government'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'

function createStructureTestDoc(): DocumentModel {
  const texts = [
    '2026年年度业务总结报告',                                      // 1. Title
    '一、总体运行情况',                                            // 2. L1 Heading
    '正文第一段说明。',                                            // 3. Body
    '1. 细项重点工作。',                                           // 4. L3 Heading (jump: 1 -> 3) with period at end
    '二、关键指标达成情况',                                        // 5. L1 Heading
    '四、缺失三直接跳到四的异常编号情况说明这是一段超级长的测试标题用来验证系统是否能够精准识别超长标题缺陷超过四十个字符', // 6. L1 Heading (Gap: missing 三, and Too Long >40 chars)
    '二、关键指标达成情况',                                        // 7. L1 Heading (Duplicate number '二' & Duplicate title)
    '表1 缺失表格的孤立表题',                                      // 8. Caption without table
    '图1 缺失插图的孤立图题',                                      // 9. Caption without image
    '附件：',                                                      // 10. Attachment marker without title
    '正文结束。'                                                   // 11. Body
  ]

  const paragraphs: ParagraphModel[] = texts.map((t, i) => ({
    index: i + 1,
    text: t,
    rawText: t + '\r',
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
    isEmpty: false
  }))

  return {
    id: 'test-struct-doc',
    name: 'test-struct.docx',
    signature: 'sig-struct-01',
    paragraphCount: paragraphs.length,
    tableCount: 1,
    sectionCount: 1,
    sections: [{ index: 1, orientation: 'portrait', topMargin: 105, bottomMargin: 100, leftMargin: 80, rightMargin: 80 }],
    tables: [{ index: 1, rangeStart: 2000, rangeEnd: 2100, rowCount: 2, columnCount: 2, previousParagraphIndex: 11 }], // Table at end without caption
    paragraphs,
    metadata: { title: 'Test Struct', charCount: 300 }
  }
}

describe('V2.3 Structure Health Audit & Scoring Suite', () => {
  it('1. StructureAuditEngine detects heading jumps, gaps, duplicates and formatting issues', () => {
    const engine = new StructureAuditEngine()
    const doc = createStructureTestDoc()
    const issues = engine.audit(doc)

    expect(issues.length).toBeGreaterThan(0)

    // Heading level jump (1 -> 3)
    const jump = issues.find(i => i.type === 'heading-level-jump')
    expect(jump).toBeDefined()
    expect(jump?.paragraphIndex).toBe(4)

    // Heading number gap (missing 三)
    const gap = issues.find(i => i.type === 'heading-number-gap')
    expect(gap).toBeDefined()
    expect(gap?.paragraphIndex).toBe(6)

    // Heading number duplicate (duplicate 二)
    const dupNum = issues.find(i => i.type === 'heading-number-duplicate')
    expect(dupNum).toBeDefined()
    expect(dupNum?.paragraphIndex).toBe(7)

    // Duplicate heading title
    const dupTitle = issues.find(i => i.type === 'duplicate-heading-text')
    expect(dupTitle).toBeDefined()

    // Heading too long (>40 chars)
    const tooLong = issues.find(i => i.type === 'heading-too-long')
    expect(tooLong).toBeDefined()
    expect(tooLong?.paragraphIndex).toBe(6)

    // Heading ends with period
    const period = issues.find(i => i.type === 'heading-ends-with-period')
    expect(period).toBeDefined()
    expect(period?.paragraphIndex).toBe(4)

    // Caption without table
    const capNoTable = issues.find(i => i.type === 'caption-without-table')
    expect(capNoTable).toBeDefined()
    expect(capNoTable?.paragraphIndex).toBe(8)

    // Caption without image
    const capNoImg = issues.find(i => i.type === 'caption-without-image')
    expect(capNoImg).toBeDefined()
    expect(capNoImg?.paragraphIndex).toBe(9)

    // Attachment marker without title
    const attNoTitle = issues.find(i => i.type === 'attachment-marker-without-title')
    expect(attNoTitle).toBeDefined()
    expect(attNoTitle?.paragraphIndex).toBe(10)
  })

  it('2. StructureScoreCalculator calculates multi-dimensional health scores with correct weighting', () => {
    const engine = new StructureAuditEngine()
    const calculator = new StructureScoreCalculator()
    const doc = createStructureTestDoc()

    const structIssues = engine.audit(doc)
    const health = calculator.calculate(doc, undefined, governmentTemplate, structIssues, [])

    expect(health.overall).toBeGreaterThanOrEqual(0)
    expect(health.overall).toBeLessThanOrEqual(100)
    expect(health.structure).toBeLessThan(100) // Deductions from jumps & gaps
    expect(health.headings).toBeLessThan(100)  // Deductions from duplicate & long
    expect(health.tables).toBeLessThan(100)    // Deductions from caption without table
    expect(health.pageLayout).toBe(100)        // Matching template margins
    expect(health.cleanup).toBe(100)           // No cleanup issues provided
  })

  it('3. DocumentAuditor produces comprehensive report with health score and structure diagnostics', () => {
    const doc = createStructureTestDoc()
    const report = DocumentAuditor.audit(doc, [], governmentTemplate)

    expect(report.score).toBeGreaterThan(0)
    expect(report.healthScore).toBeDefined()
    expect(report.healthScore?.overall).toBe(report.score)
    expect(report.structureIssues).toBeDefined()
    expect(report.structureIssues!.length).toBeGreaterThan(0)
  })

  it('4. Multi-level headings (1.1, 1.1.1, 1.2) are NOT treated as duplicates', () => {
    const engine = new StructureAuditEngine()
    const paragraphs: ParagraphModel[] = [
      { index: 1, text: '1. 数据来源分散', rawText: '1. 数据来源分散\r', normalizedText: '1. 数据来源分散', rangeStart: 0, rangeEnd: 100, fontSize: 16, bold: true, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 2, text: '正文说明内容。', rawText: '正文说明内容。\r', normalizedText: '正文说明内容。', rangeStart: 100, rangeEnd: 200, fontSize: 16, bold: false, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 3, text: '1.1 数据字段标准不统一', rawText: '1.1 数据字段标准不统一\r', normalizedText: '1.1 数据字段标准不统一', rangeStart: 200, rangeEnd: 300, fontSize: 15, bold: true, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 4, text: '同一业务字段在不同报表中的名称...', rawText: '同一业务字段在不同报表中的名称...\r', normalizedText: '同一业务字段在不同报表中的名称...', rangeStart: 300, rangeEnd: 400, fontSize: 16, bold: false, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 5, text: '1.1.1 客户编号格式差异带来的匹配问题', rawText: '1.1.1 客户编号格式差异带来的匹配问题\r', normalizedText: '1.1.1 客户编号格式差异带来的匹配问题', rangeStart: 400, rangeEnd: 500, fontSize: 14, bold: true, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 6, text: '1.1.2 财务数据汇总失真', rawText: '1.1.2 财务数据汇总失真\r', normalizedText: '1.1.2 财务数据汇总失真', rangeStart: 500, rangeEnd: 600, fontSize: 14, bold: true, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 7, text: '1.2 系统对接壁垒', rawText: '1.2 系统对接壁垒\r', normalizedText: '1.2 系统对接壁垒', rangeStart: 600, rangeEnd: 700, fontSize: 15, bold: true, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false }
    ]

    const doc: DocumentModel = {
      id: 'test-multilevel-doc',
      name: 'test-multilevel.docx',
      signature: 'sig-ml-01',
      paragraphCount: paragraphs.length,
      tableCount: 0,
      sectionCount: 1,
      sections: [],
      tables: [],
      paragraphs,
      metadata: {}
    }

    const issues = engine.audit(doc)
    const dupIssues = issues.filter(i => i.type === 'heading-number-duplicate')
    expect(dupIssues.length).toBe(0)
  })

  it('5. DocumentAuditor accurately recognizes standard 2-character body indent', () => {
    const paragraphs: ParagraphModel[] = [
      { index: 1, text: '一、标题一', rawText: '一、标题一\r', normalizedText: '一、标题一', rangeStart: 0, rangeEnd: 100, fontSize: 16, bold: true, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 2, text: '标准缩进正文1', rawText: '标准缩进正文1\r', normalizedText: '标准缩进正文1', rangeStart: 100, rangeEnd: 200, fontSize: 16, firstLineIndentChars: 2, bold: false, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 3, text: '标准缩进正文2', rawText: '标准缩进正文2\r', normalizedText: '标准缩进正文2', rangeStart: 200, rangeEnd: 300, fontSize: 16, firstLineIndent: 32, bold: false, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false },
      { index: 4, text: '　　全角空格缩进正文3', rawText: '　　全角空格缩进正文3\r', normalizedText: '全角空格缩进正文3', rangeStart: 300, rangeEnd: 400, fontSize: 16, bold: false, hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false, isEmpty: false }
    ]

    const doc: DocumentModel = {
      id: 'test-indent-doc',
      name: 'test-indent.docx',
      signature: 'sig-ind-01',
      paragraphCount: paragraphs.length,
      tableCount: 0,
      sectionCount: 1,
      sections: [],
      tables: [],
      paragraphs,
      metadata: {}
    }

    const recognition = [
      { paragraphIndex: 1, role: 'heading-1' as const, confidence: 1, ruleId: 'r1', reason: ['matched'], originalText: '一、标题一' },
      { paragraphIndex: 2, role: 'body' as const, confidence: 1, ruleId: 'r2', reason: ['matched'], originalText: '标准缩进正文1' },
      { paragraphIndex: 3, role: 'body' as const, confidence: 1, ruleId: 'r3', reason: ['matched'], originalText: '标准缩进正文2' },
      { paragraphIndex: 4, role: 'body' as const, confidence: 1, roleConfidence: 1, ruleId: 'r4', reason: ['matched'], originalText: '　　全角空格缩进正文3' }
    ]

    const report = DocumentAuditor.audit(doc, recognition, governmentTemplate)
    const indentIssue = report.issues.find(i => i.id === 'issue-body-indents')
    expect(indentIssue).toBeUndefined()
  })
})
