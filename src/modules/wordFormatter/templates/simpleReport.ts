import type { FormatTemplate } from '../types/template'

export const simpleReportTemplate: FormatTemplate = {
  id: 'template-simple-report',
  name: '现代简约汇报',
  description: '清爽易读的现代排版风格，适合团队周报、项目汇报、方案总结与内部交流材料。',
  isBuiltIn: true,
  version: 1,

  page: {
    paperSize: 'A4',
    topMarginPt: 56.7, // 2.0 cm
    bottomMarginPt: 56.7,
    leftMarginPt: 62.4, // 2.2 cm
    rightMarginPt: 62.4,
    headerDistancePt: 36,
    footerDistancePt: 36,
    orientation: 'portrait',
    applyToAllSections: true
  },

  mainTitle: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 20,
    bold: true,
    alignment: 'left',
    lineSpacingPt: 26,
    lineSpacingRule: 'multiple',
    spaceBeforePt: 0,
    spaceAfterPt: 12
  },

  subtitle: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 13,
    bold: false,
    alignment: 'left',
    lineSpacingPt: 20,
    spaceBeforePt: 0,
    spaceAfterPt: 10
  },

  heading1: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 14,
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 0,
    lineSpacingPt: 22,
    spaceBeforePt: 10,
    spaceAfterPt: 4,
    outlineLevel: 1
  },

  heading2: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 12.5,
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 0,
    lineSpacingPt: 20,
    spaceBeforePt: 6,
    spaceAfterPt: 2,
    outlineLevel: 2
  },

  heading3: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 11,
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 0,
    lineSpacingPt: 18,
    spaceBeforePt: 4,
    spaceAfterPt: 2,
    outlineLevel: 3
  },

  heading4: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 10.5,
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 0,
    lineSpacingPt: 18,
    spaceBeforePt: 2,
    spaceAfterPt: 0,
    outlineLevel: 4
  },

  body: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 10.5, // 五号
    bold: false,
    alignment: 'justify',
    firstLineIndentChars: 2,
    lineSpacingPt: 18,
    lineSpacingRule: 'multiple',
    spaceBeforePt: 0,
    spaceAfterPt: 4
  },

  attachment: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 10.5,
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 0,
    lineSpacingPt: 18,
    spaceBeforePt: 6,
    spaceAfterPt: 0
  },

  tableCaption: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 10,
    bold: true,
    alignment: 'center',
    lineSpacingPt: 16,
    spaceBeforePt: 6,
    spaceAfterPt: 2
  },

  figureCaption: {
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 9.5,
    bold: false,
    alignment: 'center',
    lineSpacingPt: 15,
    spaceBeforePt: 2,
    spaceAfterPt: 6
  },

  table: {
    enabled: true,
    chineseFont: '微软雅黑',
    westernFont: 'Arial',
    fontSizePt: 9.5,
    headerBold: true,
    headerAlignment: 'center',
    headerVerticalAlignment: 'center',
    dataVerticalAlignment: 'center',
    smartAlignNumbers: true,
    autofitToWindow: true
  },

  options: {
    blankLineMode: 'keep',
    normalizePunctuation: false,
    protectEmphasisFormatting: true,
    preserveImagesAndShapes: true,
    convertWesternNumbersFont: true,
    applyOutlineLevels: true,
    autoDetectInlineHeading2: true
  }
}
