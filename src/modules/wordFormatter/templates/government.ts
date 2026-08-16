import type { FormatTemplate } from '../types/template'

export const governmentTemplate: FormatTemplate = {
  id: 'template-government',
  name: '机关公文标准 (GB/T 9704-2012)',
  description: '严格遵循国家标准《党政机关公文格式》(GB/T 9704-2012)，适用各类请示、报告、通报、决议等正式公文。',
  isBuiltIn: true,
  version: 1,

  page: {
    paperSize: 'A4',
    topMarginPt: 104.9, // 3.7 cm
    bottomMarginPt: 99.2, // 3.5 cm
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
    spaceAfterPt: 14
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
    fontSizePt: 16, // 三号 (16pt)
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
    spaceBeforePt: 8,
    spaceAfterPt: 0
  },

  tableCaption: {
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    fontSizePt: 12,
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
    fontSizePt: 10.5,
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
