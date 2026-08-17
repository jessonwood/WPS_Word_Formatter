import { describe, expect, it } from 'vitest'
import { TemplateRecommendationEngine } from '../src/modules/wordFormatter/core/recommendation/TemplateRecommendationEngine'
import { TemplateRepository } from '../src/modules/wordFormatter/templates/templateRepository'
import { WpsWriterAdapter } from '../src/modules/wordFormatter/adapters/WpsWriterAdapter'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'
import type { RecognitionResult } from '../src/modules/wordFormatter/types/recognition'

function makeDocument(texts: string[]): DocumentModel {
  const paragraphs: ParagraphModel[] = texts.map((text, index) => ({
    index: index + 1,
    text,
    rawText: `${text}\r`,
    normalizedText: text.trim(),
    rangeStart: index * 100,
    rangeEnd: (index + 1) * 100,
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: text.trim().length === 0
  }))
  return {
    id: 'v1-test-doc',
    name: 'v1-test.docx',
    paragraphCount: paragraphs.length,
    tableCount: 0,
    sectionCount: 1,
    paragraphs,
    tables: [],
    sections: [{ index: 1, orientation: 'portrait' }],
    metadata: { charCount: texts.join('').length },
    signature: 'v1-test-signature'
  }
}

const templates = new TemplateRepository().loadBuiltinTemplates()
const recognition: RecognitionResult[] = []

describe('v1.0 simple workflow features', () => {
  it('recommends regulation template for chapter/article structure', () => {
    const doc = makeDocument([
      '某某管理办法',
      '第一章 总则',
      '第一条 为加强管理，制定本办法。',
      '第二条 本办法适用于相关业务。',
      '第二章 职责',
      '第三条 各部门按职责执行。'
    ])
    const result = TemplateRecommendationEngine.recommend(doc, recognition, templates)
    expect(result?.templateId).toBe('template-document-processing-2025-regulation')
    expect(result?.reasons.join(' ')).toContain('第×章')
  })

  it('recommends business-operation template for deep dotted numbering', () => {
    const doc = makeDocument([
      '业务操作手册',
      '1. 总体说明',
      '1.1 业务准备',
      '1.1.1 资料核验',
      '1.1.1.1 系统操作',
      '1.1.1.1.1 录入要求',
      '2. 后续处理'
    ])
    const result = TemplateRecommendationEngine.recommend(doc, recognition, templates)
    expect(result?.templateId).toBe('template-document-processing-2025-business-operation')
  })

  it('recommends ordinary official document for Chinese hierarchical numbering', () => {
    const doc = makeDocument([
      '工作情况报告',
      '一、总体情况',
      '（一）主要工作',
      '1. 第一项工作',
      '2. 第二项工作',
      '（二）下一步安排',
      '二、有关建议'
    ])
    const result = TemplateRecommendationEngine.recommend(doc, recognition, templates)
    expect(result?.templateId).toBe('template-document-processing-2025-ordinary')
  })

  it('legacy WPS adapter no longer invents an active mock document outside WPS', async () => {
    const adapter = new WpsWriterAdapter()
    expect(await adapter.hasActiveDocument()).toBe(false)
    expect(await adapter.getActiveDocumentInfo()).toBeNull()
    expect(await adapter.readParagraphs()).toEqual([])
    expect(await adapter.readTables()).toEqual([])
    expect(await adapter.readSections()).toEqual([])
  })
})
