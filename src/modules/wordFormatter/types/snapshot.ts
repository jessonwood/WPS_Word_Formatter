import type { ParagraphStyle, PageFormat, TableStyle } from './template'

export interface ParagraphSnapshot {
  index: number
  text: string
  styleName?: string
  alignment?: string
  outlineLevel?: number
  chineseFont?: string
  westernFont?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontColor?: string
  firstLineIndent?: number
  leftIndent?: number
  rightIndent?: number
  lineSpacing?: number
  lineSpacingRule?: number
  spaceBefore?: number
  spaceAfter?: number
}

export interface TableSnapshot {
  index: number
  rowCount: number
  columnCount: number
}

export interface SectionSnapshot {
  index: number
  pageWidth?: number
  pageHeight?: number
  topMargin?: number
  bottomMargin?: number
  leftMargin?: number
  rightMargin?: number
  headerDistance?: number
  footerDistance?: number
  orientation?: string
}

export interface DocumentSnapshot {
  id: string
  documentId: string
  documentName: string
  createdAt: number
  textSignature: string
  pageSettings: SectionSnapshot[]
  paragraphs: ParagraphSnapshot[]
  tables: TableSnapshot[]
}
