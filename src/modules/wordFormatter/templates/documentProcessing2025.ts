import type { FormatTemplate, ParagraphStyle } from '../types/template'
import type { ParagraphRole } from '../types/recognition'

const WESTERN_FONT = 'Times New Roman'
const CN_NUM = '一二三四五六七八九十百千零〇'
const HEADING_ROLES: ParagraphRole[] = ['heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5']

const page = {
  paperSize: 'A4' as const,
  topMarginPt: 104.9,
  bottomMarginPt: 99.2,
  leftMarginPt: 79.4,
  rightMarginPt: 73.7,
  headerDistancePt: 42.5,
  footerDistancePt: 49.6,
  orientation: 'portrait' as const,
  applyToAllSections: true
}

function headingStyle(level: number): ParagraphStyle {
  const chineseFont = level === 1 ? '黑体' : level === 2 ? '楷体_GB2312' : '仿宋_GB2312'
  return {
    chineseFont,
    westernFont: WESTERN_FONT,
    fontSizePt: 16,
    bold: false,
    alignment: 'justify',
    firstLineIndentChars: 2,
    lineSpacingPt: 30,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: level
  }
}

const mainTitle: ParagraphStyle = {
  chineseFont: '方正小标宋简体',
  westernFont: WESTERN_FONT,
  fontSizePt: 22,
  bold: false,
  alignment: 'center',
  lineSpacingRule: 'single',
  spaceBeforePt: 0,
  spaceAfterPt: 0
}

const subtitle: ParagraphStyle = {
  chineseFont: '楷体_GB2312',
  westernFont: WESTERN_FONT,
  fontSizePt: 16,
  bold: false,
  alignment: 'center',
  lineSpacingPt: 30,
  lineSpacingRule: 'exact',
  spaceBeforePt: 0,
  spaceAfterPt: 0
}

const body: ParagraphStyle = {
  chineseFont: '仿宋_GB2312',
  westernFont: WESTERN_FONT,
  fontSizePt: 16,
  bold: false,
  alignment: 'justify',
  firstLineIndentChars: 2,
  lineSpacingPt: 30,
  lineSpacingRule: 'exact',
  spaceBeforePt: 0,
  spaceAfterPt: 0
}

const attachment: ParagraphStyle = {
  chineseFont: '黑体',
  westernFont: WESTERN_FONT,
  fontSizePt: 16,
  bold: false,
  alignment: 'left',
  firstLineIndentChars: 0,
  leftIndentChars: 0,
  lineSpacingPt: 30,
  lineSpacingRule: 'exact',
  spaceBeforePt: 0,
  spaceAfterPt: 0
}

const tableCaption: ParagraphStyle = {
  chineseFont: '黑体',
  westernFont: WESTERN_FONT,
  fontSizePt: 16,
  bold: false,
  alignment: 'center',
  lineSpacingPt: 30,
  lineSpacingRule: 'exact',
  spaceBeforePt: 0,
  spaceAfterPt: 0
}

const figureCaption: ParagraphStyle = {
  chineseFont: '宋体',
  westernFont: WESTERN_FONT,
  fontSizePt: 12,
  bold: false,
  alignment: 'left',
  lineSpacingRule: 'single',
  spaceBeforePt: 0,
  spaceAfterPt: 0
}

const table = {
  enabled: true,
  chineseFont: '宋体',
  westernFont: WESTERN_FONT,
  fontSizePt: 12,
  headerBold: false,
  headerAlignment: 'center' as const,
  headerVerticalAlignment: 'center' as const,
  dataVerticalAlignment: 'center' as const,
  smartAlignNumbers: true,
  autofitToWindow: true
}

const options = {
  blankLineMode: 'keep' as const,
  normalizePunctuation: false,
  protectEmphasisFormatting: true,
  preserveImagesAndShapes: true,
  convertWesternNumbersFont: true,
  applyOutlineLevels: true,
  autoDetectInlineHeading2: true
}

function createTemplate(
  id: string,
  name: string,
  description: string,
  headingNames: string[],
  headingPatterns: string[]
): FormatTemplate {
  const styles = [1, 2, 3, 4, 5].map(headingStyle)
  return {
    id,
    name,
    description,
    isBuiltIn: true,
    version: 1,
    page: { ...page },
    mainTitle: { ...mainTitle },
    subtitle: { ...subtitle },
    heading1: styles[0],
    heading2: styles[1],
    heading3: styles[2],
    heading4: styles[3],
    heading5: styles[4],
    headings: styles.map((style, index) => ({
      level: index + 1,
      name: headingNames[index],
      pattern: headingPatterns[index],
      style
    })),
    customRecognitionRules: headingPatterns.map((pattern, index) => ({
      id: `${id}-heading-${index + 1}`,
      name: `${name} ${headingNames[index]}`,
      pattern,
      role: HEADING_ROLES[index],
      enabled: true,
      description: `按《公文处理规范（2025年版）》识别${headingNames[index]}`
    })),
    body: { ...body },
    attachment: { ...attachment },
    tableCaption: { ...tableCaption },
    figureCaption: { ...figureCaption },
    table: { ...table },
    options: { ...options }
  }
}

function withHeading1Overrides(template: FormatTemplate, overrides: Partial<ParagraphStyle>): FormatTemplate {
  const heading1 = { ...template.heading1, ...overrides }
  return {
    ...template,
    heading1,
    headings: template.headings?.map(item =>
      item.level === 1 ? { ...item, style: { ...heading1 } } : item
    )
  }
}

export const ordinaryOfficialDocumentTemplate = createTemplate(
  'template-document-processing-2025-ordinary',
  '普通公文（2025）',
  '依据《公文处理规范（2025年版）》照片所示主体格式配置：一级“一、”、二级“（一）”、三级“1.”、四级“（1）”、五级“①”。',
  ['一级标题（一、）', '二级标题（（一））', '三级标题（1.）', '四级标题（（1））', '五级标题（①）'],
  [
    `^[${CN_NUM}]+、`,
    `^（[${CN_NUM}]+）`,
    '^\\d+[.．](?!\\d)',
    '^（\\d+）',
    '^[①②③④⑤⑥⑦⑧⑨⑩]'
  ]
)

export const regulationTemplate = withHeading1Overrides(
  createTemplate(
    'template-document-processing-2025-regulation',
    '规章制度（2025）',
    '依据《公文处理规范（2025年版）》照片所示主体格式配置：章、条、中文括号序号、阿拉伯数字、括号数字五级结构。一级“第一章”默认居中；支持“第一条 + 空格 + 正文”同段结构，第一条按二级标题格式、后续内容按正文格式处理并保留分界空格。',
    ['一级标题（第一章）', '二级标题（第一条）', '三级标题（（一））', '四级标题（1.）', '五级标题（（1））'],
    [
      `^第[${CN_NUM}]+章`,
      `^第[${CN_NUM}]+条`,
      `^（[${CN_NUM}]+）`,
      '^\\d+[.．](?!\\d)',
      '^（\\d+）'
    ]
  ),
  {
    alignment: 'center',
    firstLineIndentChars: 0
  }
)

export const businessOperationTemplate = createTemplate(
  'template-document-processing-2025-business-operation',
  '业务操作（2025）',
  '依据《公文处理规范（2025年版）》照片所示主体格式配置，采用 1、1.1、1.1.1、1.1.1.1、1.1.1.1.1 的层级数字结构。',
  ['一级标题（1.）', '二级标题（1.1）', '三级标题（1.1.1）', '四级标题（1.1.1.1）', '五级标题（1.1.1.1.1）'],
  [
    '^\\d+[.．](?!\\d)',
    '^\\d+\\.\\d+(?!\\.)',
    '^\\d+\\.\\d+\\.\\d+(?!\\.)',
    '^\\d+\\.\\d+\\.\\d+\\.\\d+(?!\\.)',
    '^\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+(?!\\.)'
  ]
)
