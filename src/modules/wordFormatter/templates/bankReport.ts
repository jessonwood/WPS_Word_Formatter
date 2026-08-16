import type { FormatTemplate } from '../types/template'

export const bankReportTemplate: FormatTemplate = {
  id: 'template-bank-report',
  name: '金融与银行工作报告',
  description: '专为商业银行、证券公司及金融机构设计的信贷、风险、经营分析与监管报送文档排版模板。',
  isBuiltIn: true,
  version: 1,

  page: {
    paperSize: 'A4',
    topMarginPt: 72, // 2.54 cm
    bottomMarginPt: 72,
    leftMarginPt: 85.0, // 3.0 cm
    rightMarginPt: 73.7, // 2.6 cm
    headerDistancePt: 42.5,
    footerDistancePt: 49.6,
    orientation: 'portrait',
    applyToAllSections: true
  },

  mainTitle: {
    chineseFont: '方正小标宋简体',
    westernFont: 'Times New Roman',
    fontSizePt: 20, // 一号
    bold: true,
    alignment: 'center',
    lineSpacingPt: 26,
    lineSpacingRule: 'exact',
    spaceBeforePt: 6,
    spaceAfterPt: 12
  },

  subtitle: {
    chineseFont: '楷体_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 15, // 小三
    bold: false,
    alignment: 'center',
    lineSpacingPt: 24,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 8
  },

  heading1: {
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    fontSizePt: 15, // 小三 (15pt)
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 25,
    lineSpacingRule: 'exact',
    spaceBeforePt: 4,
    spaceAfterPt: 2,
    outlineLevel: 1
  },

  heading2: {
    chineseFont: '楷体_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 14, // 四号 (14pt)
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 24,
    lineSpacingRule: 'exact',
    spaceBeforePt: 2,
    spaceAfterPt: 0,
    outlineLevel: 2
  },

  heading3: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 14, // 四号 (14pt)
    bold: true,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 24,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: 3
  },

  heading4: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 14, // 四号 (14pt)
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 24,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    outlineLevel: 4
  },

  body: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 14, // 四号 (14pt)
    bold: false,
    alignment: 'justify',
    firstLineIndentChars: 2,
    lineSpacingPt: 24,
    lineSpacingRule: 'exact',
    spaceBeforePt: 0,
    spaceAfterPt: 0
  },

  attachment: {
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 14,
    bold: false,
    alignment: 'left',
    firstLineIndentChars: 2,
    lineSpacingPt: 24,
    lineSpacingRule: 'exact',
    spaceBeforePt: 6,
    spaceAfterPt: 0
  },

  tableCaption: {
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    fontSizePt: 11, // 五号加粗
    bold: true,
    alignment: 'center',
    lineSpacingPt: 16,
    lineSpacingRule: 'exact',
    spaceBeforePt: 6,
    spaceAfterPt: 4
  },

  figureCaption: {
    chineseFont: '楷体_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 10.5,
    bold: false,
    alignment: 'center',
    lineSpacingPt: 15,
    lineSpacingRule: 'exact',
    spaceBeforePt: 4,
    spaceAfterPt: 6
  },

  table: {
    enabled: true,
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    fontSizePt: 10, // 小五号
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
