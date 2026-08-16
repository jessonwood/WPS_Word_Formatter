import { describe, it, expect } from 'vitest'
import { RecognitionEngine } from '../src/modules/wordFormatter/core/recognition/RecognitionEngine'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'

function createMockDoc(paragraphsData: Array<{ text: string; align?: string; size?: number; bold?: boolean }>): DocumentModel {
  const paragraphs: ParagraphModel[] = paragraphsData.map((p, idx) => ({
    index: idx + 1,
    text: p.text.trim(),
    rawText: p.text,
    normalizedText: p.text.trim(),
    rangeStart: idx * 100,
    rangeEnd: (idx + 1) * 100,
    alignment: (p.align as any) || 'left',
    fontSize: p.size || 16,
    bold: !!p.bold,
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: p.text.trim().length === 0
  }))

  return {
    id: 'test_doc',
    name: '测试文档.docx',
    paragraphCount: paragraphs.length,
    tableCount: 1,
    sectionCount: 1,
    paragraphs,
    tables: [{ index: 1, rangeStart: 1000, rangeEnd: 1100, rowCount: 3, columnCount: 3, previousParagraphIndex: 8 }],
    sections: [{ index: 1, orientation: 'portrait' }],
    metadata: {},
    signature: 'mock_sig'
  }
}

describe('RecognitionEngine Rules & Exclusions', () => {
  const engine = new RecognitionEngine()

  it('correctly identifies Main Title and Subtitle', () => {
    const doc = createMockDoc([
      { text: '关于印发2026年小微企业信贷风险管理报告的通知', align: 'center', size: 22, bold: true },
      { text: '银发〔2026〕18号', align: 'center', size: 14 },
      { text: '各分行、各直属机构：' },
      { text: '现将有关事项通知如下。' }
    ])

    const results = engine.analyze(doc)
    expect(results[0].role).toBe('main-title')
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.90)
    expect(results[1].role).toBe('subtitle')
  })

  it('correctly identifies Heading 1 with multi-digit Chinese numbers', () => {
    const doc = createMockDoc([
      { text: '一、总体情况' },
      { text: '十、主要问题' },
      { text: '十一、重点工作' },
      { text: '二十一、其他事项' }
    ])

    const results = engine.analyze(doc)
    expect(results[0].role).toBe('heading-1')
    expect(results[1].role).toBe('heading-1')
    expect(results[2].role).toBe('heading-1')
    expect(results[3].role).toBe('heading-1')
  })

  it('correctly identifies Heading 2 and inline heading with body text', () => {
    const doc = createMockDoc([
      { text: '（一）基本情况' },
      { text: '(十一)主要风险' },
      { text: '（一）风险总体可控。截至6月末，全行小微企业信贷资产质量保持平稳可控态势。' }
    ])

    const results = engine.analyze(doc)
    expect(results[0].role).toBe('heading-2')
    expect(results[1].role).toBe('heading-2')
    expect(results[2].role).toBe('heading-2')
    expect(results[2].inlineRanges).toBeDefined()
    expect(results[2].inlineRanges?.length).toBe(2)
    expect(results[2].inlineRanges![0].role).toBe('heading-2')
    expect(results[2].inlineRanges![1].role).toBe('body')
  })

  it('correctly identifies Heading 3 and strictly EXCLUDES numbers/decimals/dates', () => {
    const doc = createMockDoc([
      { text: '1. 重点监测行业名单制管理' },
      { text: '2．优化担保与抵质押措施' },
      { text: '3、强化贷后主动跟踪' },
      // Exclusions
      { text: '1.25亿元贷款已经发放完毕。' },
      { text: '3.14%的不良率保持低位。' },
      { text: '2026.08至2026.12开展专项排查。' },
      { text: '下降了1.2个百分点。' },
      { text: '12.5%的增长速度超预期。' }
    ])

    const results = engine.analyze(doc)
    // 1~3 should be heading-3
    expect(results[0].role).toBe('heading-3')
    expect(results[1].role).toBe('heading-3')
    expect(results[2].role).toBe('heading-3')

    // Exclusions should NOT be heading-3
    expect(results[3].role).not.toBe('heading-3')
    expect(results[4].role).not.toBe('heading-3')
    expect(results[5].role).not.toBe('heading-3')
    expect(results[6].role).not.toBe('heading-3')
    expect(results[7].role).not.toBe('heading-3')
  })

  it('correctly identifies Heading 4', () => {
    const doc = createMockDoc([
      { text: '（1）严格贷前调查与核实' },
      { text: '(2)落实第一还款来源' }
    ])

    const results = engine.analyze(doc)
    expect(results[0].role).toBe('heading-4')
    expect(results[1].role).toBe('heading-4')
  })

  it('correctly identifies Attachments and Captions', () => {
    const doc = createMockDoc([
      { text: '表1 2026年小微信贷风险分类表', align: 'center' },
      { text: '图1 2026年资产质量走势图', align: 'center' },
      { text: '附件：1. 2026年重点小微企业风险台账' },
      { text: '附件一：分支机构信贷排查整改清单' }
    ])

    const results = engine.analyze(doc)
    expect(results[0].role).toBe('table-caption')
    expect(results[1].role).toBe('figure-caption')
    expect(results[2].role).toBe('attachment-marker')
    expect(results[3].role).toBe('attachment-marker')
  })
})
