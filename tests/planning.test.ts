import { describe, it, expect } from 'vitest'
import { FormatPlanBuilder } from '../src/modules/wordFormatter/core/planning/FormatPlanBuilder'
import { FormatComparator } from '../src/modules/wordFormatter/core/planning/FormatComparator'
import { ChangeSetOptimizer } from '../src/modules/wordFormatter/core/planning/ChangeSetOptimizer'
import { isFloatEqual, normalizeFontName } from '../src/modules/wordFormatter/core/planning/FormatTolerances'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'
import type { FormatTemplate } from '../src/modules/wordFormatter/types/template'
import type { RecognitionResult } from '../src/modules/wordFormatter/types/recognition'

function makeParagraph(p: Partial<ParagraphModel> & { index: number; text: string }): ParagraphModel {
  return {
    rawText: p.text + '\r',
    normalizedText: p.text,
    rangeStart: (p.index - 1) * 50,
    rangeEnd: p.index * 50,
    alignment: 'left',
    fontSize: 16,
    bold: false,
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: false,
    ...p
  }
}

function makeDoc(doc: Partial<DocumentModel> & { id: string; name: string; signature: string; paragraphs: ParagraphModel[] }): DocumentModel {
  return {
    paragraphCount: doc.paragraphs.length,
    tableCount: 0,
    sectionCount: 1,
    sections: [],
    tables: [],
    metadata: { title: doc.name, charCount: doc.paragraphs.reduce((acc, p) => acc + p.text.length, 0) },
    ...doc
  }
}

describe('V2.1 Planning & Minimal Formatting Suite', () => {
  const mockTemplate: FormatTemplate = {
    id: 'test-gov',
    name: '标准公文模板',
    description: '测试公文模板',
    isBuiltIn: true,
    version: 1,
    page: {
      paperSize: 'A4',
      topMarginPt: 105,
      bottomMarginPt: 100,
      leftMarginPt: 80,
      rightMarginPt: 80,
      orientation: 'portrait',
      applyToAllSections: true
    },
    mainTitle: {
      chineseFont: '方正小标宋简体',
      westernFont: 'Times New Roman',
      fontSizePt: 22,
      bold: false,
      alignment: 'center',
      lineSpacingPt: 30,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 0
    },
    subtitle: {
      chineseFont: '楷体_GB2312',
      westernFont: 'Times New Roman',
      fontSizePt: 16,
      bold: false,
      alignment: 'center',
      lineSpacingPt: 28,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 0
    },
    heading1: {
      chineseFont: '黑体',
      westernFont: 'Times New Roman',
      fontSizePt: 16,
      bold: false,
      alignment: 'left',
      lineSpacingPt: 28,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 2
    },
    heading2: {
      chineseFont: '楷体_GB2312',
      westernFont: 'Times New Roman',
      fontSizePt: 16,
      bold: false,
      alignment: 'left',
      lineSpacingPt: 28,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 2
    },
    body: {
      chineseFont: '仿宋_GB2312',
      westernFont: 'Times New Roman',
      fontSizePt: 16,
      bold: false,
      alignment: 'justify',
      lineSpacingPt: 28,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 2
    },
    attachment: {
      chineseFont: '仿宋_GB2312',
      westernFont: 'Times New Roman',
      fontSizePt: 16,
      bold: false,
      alignment: 'left',
      lineSpacingPt: 28,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 2
    },
    tableCaption: {
      chineseFont: '黑体',
      westernFont: 'Times New Roman',
      fontSizePt: 14,
      bold: false,
      alignment: 'center',
      lineSpacingPt: 20,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 0
    },
    figureCaption: {
      chineseFont: '黑体',
      westernFont: 'Times New Roman',
      fontSizePt: 14,
      bold: false,
      alignment: 'center',
      lineSpacingPt: 20,
      lineSpacingRule: 'exact',
      firstLineIndentChars: 0
    },
    table: {
      enabled: true,
      chineseFont: '宋体',
      westernFont: 'Times New Roman',
      fontSizePt: 10.5,
      headerBold: true,
      headerAlignment: 'center',
      headerVerticalAlignment: 'center',
      dataVerticalAlignment: 'center',
      borderStyle: 'three-line',
      smartAlignNumbers: true,
      autofitToWindow: true
    },
    options: {
      applyOutlineLevels: true,
      autoDetectInlineHeading2: true,
      protectEmphasisFormatting: true,
      blankLineMode: 'keep',
      normalizePunctuation: false,
      preserveImagesAndShapes: true,
      convertWesternNumbersFont: true
    }
  }

  it('1. Float tolerance and font name normalization', () => {
    // Float equality with default tolerances
    expect(isFloatEqual(16.02, 16.0, 0.05)).toBe(true)
    expect(isFloatEqual(15.98, 16.0, 0.05)).toBe(true)
    expect(isFloatEqual(15.5, 16.0, 0.05)).toBe(false)
    expect(isFloatEqual(28.09, 28.0, 0.15)).toBe(true)

    // Font name normalization
    expect(normalizeFontName('FZXBSJW--GB1-0')).toBe('方正小标宋简体')
    expect(normalizeFontName('FangSong_GB2312')).toBe('仿宋_GB2312')
    expect(normalizeFontName('KaiTi_GB2312')).toBe('楷体_GB2312')
    expect(normalizeFontName('SimSun')).toBe('宋体')
  })

  it('2. 100% Compliant Document must have totalChanges === 0 under minimal strategy', () => {
    const compliantDoc = makeDoc({
      id: 'doc-1',
      name: 'Compliant.docx',
      signature: 'sig-12345',
      sections: [{
        index: 1,
        topMargin: 105,
        bottomMargin: 100,
        leftMargin: 80,
        rightMargin: 80,
        orientation: 'portrait'
      }],
      paragraphs: [
        makeParagraph({
          index: 1,
          text: '关于做好2026年安全生产工作的通知',
          chineseFont: '方正小标宋简体',
          westernFont: 'Times New Roman',
          fontSize: 22,
          bold: false,
          alignment: 'center',
          firstLineIndentChars: 0,
          lineSpacing: 30,
          outlineLevel: 10
        }),
        makeParagraph({
          index: 2,
          text: '一、总体要求与工作目标',
          chineseFont: '黑体',
          westernFont: 'Times New Roman',
          fontSize: 16,
          bold: false,
          alignment: 'left',
          firstLineIndentChars: 2,
          lineSpacing: 28,
          outlineLevel: 1
        }),
        makeParagraph({
          index: 3,
          text: '各部门要高度重视，切实落实各项防范措施。',
          chineseFont: '仿宋_GB2312',
          westernFont: 'Times New Roman',
          fontSize: 16,
          bold: false,
          alignment: 'justify',
          firstLineIndentChars: 2,
          lineSpacing: 28,
          outlineLevel: 10
        })
      ]
    })

    const recognition: RecognitionResult[] = [
      { paragraphIndex: 1, role: 'main-title', confidence: 0.95, ruleId: 'title', reason: [], originalText: '' },
      { paragraphIndex: 2, role: 'heading-1', confidence: 0.95, ruleId: 'h1', reason: [], originalText: '' },
      { paragraphIndex: 3, role: 'body', confidence: 0.9, ruleId: 'body', reason: [], originalText: '' }
    ]

    const plan = FormatPlanBuilder.buildPlan({
      document: compliantDoc,
      recognition,
      template: mockTemplate,
      strategy: 'minimal',
      scope: 'all'
    })

    // Mandatory acceptance criteria:
    expect(plan.summary.totalChanges).toBe(0)
    expect(plan.summary.affectedParagraphs).toBe(0)
    expect(plan.summary.skippedAlreadyCompliant).toBe(3)
    expect(plan.changes.length).toBe(0)
  })

  it('3. Document with only font-size error generates ONLY font-size change', () => {
    const docWithFontSizeErr = makeDoc({
      id: 'doc-2',
      name: 'Doc2.docx',
      signature: 'sig-67890',
      sections: [{
        index: 1,
        topMargin: 105,
        bottomMargin: 100,
        leftMargin: 80,
        rightMargin: 80,
        orientation: 'portrait'
      }],
      paragraphs: [
        makeParagraph({
          index: 1,
          text: '各部门要高度重视，切实落实各项防范措施。',
          chineseFont: '仿宋_GB2312', // Already compliant
          westernFont: 'Times New Roman', // Already compliant
          fontSize: 14, // Non-compliant! (Template requires 16)
          bold: false, // Already compliant
          alignment: 'justify', // Already compliant
          firstLineIndentChars: 2, // Already compliant
          lineSpacing: 28, // Already compliant
          outlineLevel: 10
        })
      ]
    })

    const recognition: RecognitionResult[] = [
      { paragraphIndex: 1, role: 'body', confidence: 0.9, ruleId: 'body', reason: [], originalText: '' }
    ]

    const plan = FormatPlanBuilder.buildPlan({
      document: docWithFontSizeErr,
      recognition,
      template: mockTemplate,
      strategy: 'minimal',
      scope: 'all'
    })

    expect(plan.summary.totalChanges).toBe(1)
    expect(plan.changes[0].property).toBe('font-size')
    expect(plan.changes[0].before).toBe('14 pt')
    expect(plan.changes[0].after).toBe('16 pt')
    expect(plan.summary.affectedParagraphs).toBe(1)
    expect(plan.summary.skippedAlreadyCompliant).toBe(0)
  })

  it('4. ChangeSetOptimizer category and single item toggles', () => {
    const doc = makeDoc({
      id: 'doc-3',
      name: 'Doc3.docx',
      signature: 'sig-333',
      paragraphs: [
        makeParagraph({
          index: 1,
          text: '一、标题',
          chineseFont: '宋体', // Font error
          fontSize: 14, // Size error
          alignment: 'left',
          firstLineIndentChars: 2,
          lineSpacing: 28
        }),
        makeParagraph({
          index: 2,
          text: '正文内容',
          chineseFont: '宋体', // Font error
          fontSize: 16,
          alignment: 'justify',
          firstLineIndentChars: 0, // Indent error
          lineSpacing: 28
        })
      ]
    })

    const recognition: RecognitionResult[] = [
      { paragraphIndex: 1, role: 'heading-1', confidence: 0.9, ruleId: 'h1', reason: [], originalText: '' },
      { paragraphIndex: 2, role: 'body', confidence: 0.9, ruleId: 'body', reason: [], originalText: '' }
    ]

    const plan = FormatPlanBuilder.buildPlan({
      document: doc,
      recognition,
      template: mockTemplate,
      strategy: 'minimal'
    })

    expect(plan.summary.totalChanges).toBeGreaterThan(0)
    const initialEnabled = plan.summary.enabledChanges

    // Disable all font changes
    ChangeSetOptimizer.setCategoryEnabled(plan, 'font', false)
    expect(plan.summary.enabledChanges).toBeLessThan(initialEnabled)

    // Toggle a specific change
    const firstChange = plan.changes[0]
    ChangeSetOptimizer.setChangeEnabled(plan, firstChange.id, true)
    expect(firstChange.enabled).toBe(true)
  })

  it('5. Normalize strategy generates full standardization changes', () => {
    const doc = makeDoc({
      id: 'doc-4',
      name: 'Doc4.docx',
      signature: 'sig-444',
      paragraphs: [
        makeParagraph({
          index: 1,
          text: '正文内容',
          chineseFont: '仿宋_GB2312',
          fontSize: 16,
          alignment: 'justify',
          firstLineIndentChars: 2,
          lineSpacing: 28
        })
      ]
    })

    const recognition: RecognitionResult[] = [
      { paragraphIndex: 1, role: 'body', confidence: 0.9, ruleId: 'body', reason: [], originalText: '' }
    ]

    const plan = FormatPlanBuilder.buildPlan({
      document: doc,
      recognition,
      template: mockTemplate,
      strategy: 'normalize'
    })

    expect(plan.strategy).toBe('normalize')
    expect(plan.summary.totalChanges).toBe(1)
    expect(plan.summary.affectedParagraphs).toBe(1)
  })
})
