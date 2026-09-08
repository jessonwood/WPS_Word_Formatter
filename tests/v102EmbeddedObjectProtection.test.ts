import { describe, expect, it } from 'vitest'
import { FormatPlanBuilder } from '../src/modules/wordFormatter/core/planning/FormatPlanBuilder'
import { ParagraphFormatter } from '../src/modules/wordFormatter/core/formatting/ParagraphFormatter'
import { CleanupScanner } from '../src/modules/wordFormatter/core/cleanup/CleanupScanner'
import { CleanupExecutor } from '../src/modules/wordFormatter/core/cleanup/CleanupExecutor'
import {
  paragraphContainsProtectedEmbeddedObject,
  registerEmbeddedObjectProtection
} from '../src/modules/wordFormatter/core/protection/EmbeddedObjectProtection'
import { regulationTemplate } from '../src/modules/wordFormatter/templates/documentProcessing2025'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'

function paragraph(index: number, text: string, overrides: Partial<ParagraphModel> = {}): ParagraphModel {
  return {
    index,
    text,
    rawText: text,
    normalizedText: text,
    rangeStart: (index - 1) * 100,
    rangeEnd: index * 100,
    alignment: 'left',
    chineseFont: '宋体',
    westernFont: 'Arial',
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
    firstLineIndentChars: 0,
    leftIndent: 0,
    rightIndent: 0,
    lineSpacing: 12,
    lineSpacingRule: 0,
    spaceBefore: 0,
    spaceAfter: 0,
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: text.length === 0,
    ...overrides
  }
}

function documentModel(paragraphs: ParagraphModel[]): DocumentModel {
  return {
    id: 'embedded-object-doc',
    name: 'embedded-object.docx',
    signature: 'sig',
    paragraphCount: paragraphs.length,
    tableCount: 0,
    sectionCount: 1,
    paragraphs,
    tables: [],
    sections: [{ index: 1, orientation: 'portrait' }],
    metadata: {}
  }
}

class MockAdapter {
  paragraphCalls: Array<{ index: number; style: any }> = []

  async applyParagraphStyle(index: number, style: any) {
    this.paragraphCalls.push({ index, style })
  }
}

describe('v1.0.2 embedded object protection', () => {
  it('classifies inline images/charts, floating shapes, fields and bookmarks as protected objects', () => {
    expect(paragraphContainsProtectedEmbeddedObject(paragraph(1, '', { hasImage: true }))).toBe(true)
    expect(paragraphContainsProtectedEmbeddedObject(paragraph(1, '', { hasShape: true }))).toBe(true)
    expect(paragraphContainsProtectedEmbeddedObject(paragraph(1, '', { hasField: true }))).toBe(true)
    expect(paragraphContainsProtectedEmbeddedObject(paragraph(1, '', { hasBookmark: true }))).toBe(true)
    expect(paragraphContainsProtectedEmbeddedObject(paragraph(1, '普通正文'))).toBe(false)
  })

  it('does not generate paragraph formatting changes for a protected chart paragraph', () => {
    const chartParagraph = paragraph(1, '', { hasImage: true, isEmpty: true })
    const bodyParagraph = paragraph(2, '普通正文')
    const doc = documentModel([chartParagraph, bodyParagraph])
    const template = {
      ...regulationTemplate,
      options: { ...regulationTemplate.options, preserveImagesAndShapes: true }
    }

    const plan = FormatPlanBuilder.buildPlan({
      document: doc,
      recognition: [
        { paragraphIndex: 1, role: 'body', confidence: 0.8, ruleId: 'test', reason: [], originalText: '' },
        { paragraphIndex: 2, role: 'body', confidence: 0.8, ruleId: 'test', reason: [], originalText: '普通正文' }
      ],
      template,
      strategy: 'minimal',
      scope: 'all'
    })

    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 1)).toBe(false)
    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 2)).toBe(true)
  })

  it('allows ordinary formatting when embedded-object protection is explicitly disabled', () => {
    const chartParagraph = paragraph(1, '图表锚点', { hasImage: true })
    const doc = documentModel([chartParagraph])
    const template = {
      ...regulationTemplate,
      options: { ...regulationTemplate.options, preserveImagesAndShapes: false }
    }

    const plan = FormatPlanBuilder.buildPlan({
      document: doc,
      recognition: [
        { paragraphIndex: 1, role: 'body', confidence: 0.8, ruleId: 'test', reason: [], originalText: '图表锚点' }
      ],
      template,
      strategy: 'minimal',
      scope: 'all'
    })

    expect(plan.changes.some(change => change.targetType === 'paragraph' && change.targetIndex === 1)).toBe(true)
  })

  it('ParagraphFormatter refuses to apply exact line spacing/body styles to registered chart paragraphs', async () => {
    const doc = documentModel([
      paragraph(1, '', { hasImage: true, isEmpty: true }),
      paragraph(2, '普通正文')
    ])
    registerEmbeddedObjectProtection(doc, true)

    const adapter = new MockAdapter()
    const formatter = new ParagraphFormatter(adapter as any)

    await formatter.formatParagraph(1, regulationTemplate.body)
    await formatter.formatParagraph(2, regulationTemplate.body)

    expect(adapter.paragraphCalls.some(call => call.index === 1)).toBe(false)
    expect(adapter.paragraphCalls.some(call => call.index === 2)).toBe(true)
  })

  it('never reports an object-only paragraph as a blank-line cleanup candidate', () => {
    const objectParagraph = paragraph(1, '', { hasImage: true, isEmpty: true })
    const normalBlank = paragraph(2, '', { isEmpty: true })
    const issues = new CleanupScanner().scan(documentModel([objectParagraph, normalBlank]))

    expect(issues.some(issue => issue.paragraphIndex === 1)).toBe(false)
    expect(issues.some(issue => issue.paragraphIndex === 2)).toBe(true)
  })

  it('CleanupExecutor rejects stale/manual deletion requests targeting embedded object paragraphs', () => {
    const objectParagraph = paragraph(1, '', { hasShape: true, isEmpty: true })
    const normalBlank = paragraph(2, '', { isEmpty: true })
    const doc = documentModel([objectParagraph, normalBlank])
    const issues = [
      {
        id: 'stale-object-delete',
        type: 'blank-line',
        paragraphIndex: 1,
        originalText: '',
        suggestedText: '',
        reason: 'stale request',
        severity: 'info',
        enabled: true,
        safeAutoFix: false
      },
      {
        id: 'normal-delete',
        type: 'blank-line',
        paragraphIndex: 2,
        originalText: '',
        suggestedText: '',
        reason: 'manual request',
        severity: 'info',
        enabled: true,
        safeAutoFix: false
      }
    ] as any

    const executor = new CleanupExecutor({} as any, {} as any)
    const changes = executor.buildExpectedChanges(doc, issues)

    expect(changes.some(change => change.paragraphIndex === 1)).toBe(false)
    expect(changes.some(change => change.paragraphIndex === 2)).toBe(true)
  })
})
