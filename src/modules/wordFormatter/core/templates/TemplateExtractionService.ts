import type { DocumentModel, ParagraphModel } from '../../types/document'
import type { RecognitionResult, ParagraphRole } from '../../types/recognition'
import type { FormatTemplate, ParagraphStyle } from '../../types/template'
import { templateService } from '../../services/TemplateService'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function roleToParagraph(
  role: ParagraphRole,
  document: DocumentModel,
  recognition: RecognitionResult[]
): ParagraphModel | undefined {
  const rec = recognition.find(r => r.role === role)
  if (!rec) return undefined
  return document.paragraphs.find(p => p.index === rec.paragraphIndex)
}

function styleFromParagraph(paragraph: ParagraphModel | undefined, fallback: ParagraphStyle): ParagraphStyle {
  if (!paragraph) return clone(fallback)

  const lineRule = paragraph.lineSpacingRule
  let normalizedLineRule: ParagraphStyle['lineSpacingRule'] = fallback.lineSpacingRule
  // Word/WPS constants commonly map 0=single, 1=1.5, 2=double, 4=exact, 5=multiple.
  if (lineRule === 0) normalizedLineRule = 'single'
  else if (lineRule === 1) normalizedLineRule = 'oneAndHalf'
  else if (lineRule === 2) normalizedLineRule = 'double'
  else if (lineRule === 4) normalizedLineRule = 'exact'
  else if (lineRule === 5) normalizedLineRule = 'multiple'

  return {
    ...clone(fallback),
    chineseFont: paragraph.chineseFont || fallback.chineseFont,
    westernFont: paragraph.westernFont || fallback.westernFont,
    fontSizePt: paragraph.fontSize || fallback.fontSizePt,
    bold: paragraph.bold ?? fallback.bold,
    italic: paragraph.italic ?? fallback.italic,
    underline: paragraph.underline ?? fallback.underline,
    alignment: (['left', 'center', 'right', 'justify'].includes(String(paragraph.alignment))
      ? paragraph.alignment
      : fallback.alignment) as ParagraphStyle['alignment'],
    firstLineIndentChars: paragraph.firstLineIndentChars ?? fallback.firstLineIndentChars,
    lineSpacingPt: paragraph.lineSpacing ?? fallback.lineSpacingPt,
    lineSpacingRule: normalizedLineRule,
    spaceBeforePt: paragraph.spaceBefore ?? fallback.spaceBeforePt,
    spaceAfterPt: paragraph.spaceAfter ?? fallback.spaceAfterPt
  }
}

export class TemplateExtractionService {
  static extractAndSave(
    document: DocumentModel,
    recognition: RecognitionResult[],
    baseTemplate: FormatTemplate,
    name?: string
  ): FormatTemplate {
    const section = document.sections?.[0]
    const mainTitleP = roleToParagraph('main-title', document, recognition)
    const subtitleP = roleToParagraph('subtitle', document, recognition)
    const bodyP = roleToParagraph('body', document, recognition)

    const headingParagraphs = [1, 2, 3, 4, 5, 6].map(level =>
      roleToParagraph(`heading-${level}` as ParagraphRole, document, recognition)
    )

    const extracted = templateService.createTemplate({
      name: name || `从“${document.name.replace(/\.[^.]+$/, '')}”提取`,
      description: '从当前文档已识别结构自动提取的本地自定义模板，可在模板详情中继续微调。',
      page: {
        ...clone(baseTemplate.page),
        topMarginPt: section?.topMargin ?? baseTemplate.page.topMarginPt,
        bottomMarginPt: section?.bottomMargin ?? baseTemplate.page.bottomMarginPt,
        leftMarginPt: section?.leftMargin ?? baseTemplate.page.leftMarginPt,
        rightMarginPt: section?.rightMargin ?? baseTemplate.page.rightMarginPt,
        headerDistancePt: section?.headerDistance ?? baseTemplate.page.headerDistancePt,
        footerDistancePt: section?.footerDistance ?? baseTemplate.page.footerDistancePt,
        orientation: section?.orientation ?? baseTemplate.page.orientation
      },
      mainTitle: styleFromParagraph(mainTitleP, baseTemplate.mainTitle),
      subtitle: styleFromParagraph(subtitleP, baseTemplate.subtitle),
      heading1: styleFromParagraph(headingParagraphs[0], baseTemplate.heading1),
      heading2: styleFromParagraph(headingParagraphs[1], baseTemplate.heading2 || baseTemplate.heading1),
      heading3: styleFromParagraph(headingParagraphs[2], baseTemplate.heading3 || baseTemplate.heading2 || baseTemplate.heading1),
      heading4: styleFromParagraph(headingParagraphs[3], baseTemplate.heading4 || baseTemplate.heading3 || baseTemplate.heading1),
      heading5: styleFromParagraph(headingParagraphs[4], baseTemplate.heading5 || baseTemplate.heading4 || baseTemplate.heading1),
      heading6: styleFromParagraph(headingParagraphs[5], baseTemplate.heading6 || baseTemplate.heading5 || baseTemplate.heading1),
      body: styleFromParagraph(bodyP, baseTemplate.body),
      attachment: clone(baseTemplate.attachment),
      tableCaption: clone(baseTemplate.tableCaption),
      figureCaption: clone(baseTemplate.figureCaption),
      table: clone(baseTemplate.table),
      options: clone(baseTemplate.options),
      customHeadings: [],
      customRecognitionRules: []
    })

    return extracted
  }
}
