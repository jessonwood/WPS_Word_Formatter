export interface PageFormat {
  paperSize: 'A4' | 'A3' | 'B5' | 'Letter' | 'Custom'
  widthPt?: number
  heightPt?: number
  topMarginPt: number
  bottomMarginPt: number
  leftMarginPt: number
  rightMarginPt: number
  headerDistancePt?: number
  footerDistancePt?: number
  orientation?: 'portrait' | 'landscape'
  applyToAllSections: boolean
}

export interface ParagraphStyle {
  chineseFont: string
  westernFont?: string
  fontSizePt: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontColor?: string

  alignment: 'left' | 'center' | 'right' | 'justify'

  firstLineIndentChars?: number
  leftIndentChars?: number
  rightIndentChars?: number

  lineSpacingPt?: number
  lineSpacingRule?: 'multiple' | 'exact' | 'single' | 'oneAndHalf' | 'double' // exact = 固定值, multiple = 多倍
  spaceBeforePt?: number
  spaceAfterPt?: number

  outlineLevel?: number
  keepWithNext?: boolean
}

export interface TableStyle {
  enabled: boolean
  chineseFont: string
  westernFont?: string
  fontSizePt: number
  headerBold: boolean
  headerAlignment: 'center' | 'left' | 'right'
  headerVerticalAlignment: 'center' | 'top' | 'bottom'
  dataVerticalAlignment: 'center' | 'top' | 'bottom'
  headerBackground?: string
  borderColor?: string
  borderWidthPt?: number
  borderStyle?: 'three-line' | 'standard' | 'none'
  rowHeightPt?: number
  smartAlignNumbers: boolean
  autofitToWindow: boolean
}

export type BlankLineMode =
  | 'keep'
  | 'remove-single-collapse-multiple'
  | 'keep-single-collapse-multiple'
  | 'remove-all'

export interface FormatterOptions {
  blankLineMode: BlankLineMode
  normalizePunctuation: boolean
  protectEmphasisFormatting: boolean
  preserveImagesAndShapes: boolean
  convertWesternNumbersFont: boolean
  applyOutlineLevels: boolean
  autoDetectInlineHeading2: boolean
}

import type { ParagraphRole } from './recognition'

export interface CustomRecognitionRule {
  id: string
  name: string
  pattern: string
  role: ParagraphRole
  enabled: boolean
  description?: string
}

export interface CustomHeadingLevel {
  level: number
  name: string
  style: ParagraphStyle
}

export interface HeadingDefinition {
  level: number
  name: string
  pattern?: string
  style: ParagraphStyle
}

export interface FormatTemplate {
  id: string
  name: string
  description?: string
  isBuiltIn?: boolean
  version: number

  page: PageFormat

  mainTitle: ParagraphStyle
  subtitle: ParagraphStyle

  heading1: ParagraphStyle
  heading2?: ParagraphStyle
  heading3?: ParagraphStyle
  heading4?: ParagraphStyle
  heading5?: ParagraphStyle
  heading6?: ParagraphStyle

  // Unified dynamic headings list (Levels 1 ~ N)
  headings?: HeadingDefinition[]

  // Dynamic additional custom heading levels (Level 4, 5, 6, 7, etc.)
  customHeadings?: CustomHeadingLevel[]

  // User custom regex recognition rules
  customRecognitionRules?: CustomRecognitionRule[]

  body: ParagraphStyle

  attachment: ParagraphStyle

  tableCaption: ParagraphStyle
  figureCaption: ParagraphStyle

  table: TableStyle

  headerFooter?: import('./headersFooters').HeaderFooterConfig
  pageNumber?: import('./headersFooters').PageNumberConfig
  toc?: import('./toc').TocConfig

  options: FormatterOptions
}
