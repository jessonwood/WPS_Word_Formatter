import type { FormatTemplate } from '../types/template'

export const defaultTemplate: FormatTemplate = {
  id: 'template-default',
  name: '标准通用报告',
  description: '适用于企事业单位日常工作报告、总结、纪要等通用文档排版。',
  isBuiltIn: true,
  version: 1,

  page: {
    paperSize: 'A4',
    topMarginPt: 72, // 2.54 cm
    bottomMarginPt: 72,
    leftMarginPt: 79.4, // 2.8 cm
    rightMarginPt: 73.7, // 2.6 cm
    headerDistancePt: 42.5, // 1.5 cm
    footerDistancePt: 49.6, // 1.75 cm
    orientation: 'portrait',
    applyToAllSections: true
  },

  mainTitle: {
    chineseFont: '方正小标宋简体',
    westernFont: 'Times New Roman',
    fontSizePt: 22, // 二号
    bold: false,
    alignment: 'center',
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 12
  },

  subtitle: {
    chineseFont: '楷体_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 16, // 三号
    bold: false,
    alignment: 'center',
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 6
  },

  heading1: {
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    fontSizePt: 16, // 三号
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: 1
  },

  heading2: {
    chineseFont: '楷体_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 16, // 三号
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: 2
  },

  heading3: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 16, // 三号
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: 3
  },

  heading4: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 16, // 三号
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: 4
  },

  body: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 16, // 三号
    bold: false,
    alignment: 'justify',
    firstLineIndentChars: 2,
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0
  },

  attachment: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 16,
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 28,
    lineSpacingRule: 'exact',
    spaceBeforePt: 6,
    spaceAfterPt: 0
  },

  tableCaption: {
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    fontSizePt: 12, // 小四
    bold: true,
    alignment: 'center',
    lineSpacingPt: 18,
    lineSpacingRule: 'exact',
    spaceBeforePt: 6,
    spaceAfterPt: 4
  },

  figureCaption: {
    chineseFont: '宋体',
    westernFont: 'Times New Roman',
    fontSizePt: 10.5, // 五号
    bold: false,
    alignment: 'center',
    lineSpacingPt: 16,
    lineSpacingRule: 'exact',
    spaceBeforePt: 4,
    spaceAfterPt: 6
  },

  table: {
    enabled: true,
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 10.5, // 五号
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
