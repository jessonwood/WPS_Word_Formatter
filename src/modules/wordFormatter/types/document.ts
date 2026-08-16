export interface DocumentMetadata {
  title?: string
  author?: string
  lastModified?: string
  pageCount?: number
  charCount?: number
}

export interface RunModel {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontColor?: string
  fontSize?: number
  fontNameChinese?: string
  fontNameWestern?: string
  startOffset: number
  endOffset: number
}

export interface ParagraphModel {
  index: number
  text: string
  rawText: string
  normalizedText: string
  rangeStart: number
  rangeEnd: number

  styleName?: string
  alignment?: 'left' | 'center' | 'right' | 'justify' | string
  outlineLevel?: number

  chineseFont?: string
  westernFont?: string
  fontSize?: number

  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontColor?: string

  firstLineIndent?: number
  firstLineIndentChars?: number
  leftIndent?: number
  rightIndent?: number

  lineSpacing?: number
  lineSpacingRule?: number
  spaceBefore?: number
  spaceAfter?: number

  runs?: RunModel[]

  hasImage: boolean
  hasShape: boolean
  hasField: boolean
  hasBookmark: boolean
  hasCommentReference: boolean

  tableIndex?: number
  isEmpty: boolean
}

export interface TableCellModel {
  rowIndex: number
  colIndex: number
  text: string
  isNumeric: boolean
  alignment?: 'left' | 'center' | 'right' | 'justify'
}

export interface TableModel {
  index: number
  rangeStart: number
  rangeEnd: number
  rowCount: number
  columnCount: number
  cells?: TableCellModel[]
  previousParagraphIndex?: number
  nextParagraphIndex?: number
}

export interface SectionModel {
  index: number
  pageWidth?: number
  pageHeight?: number
  topMargin?: number
  bottomMargin?: number
  leftMargin?: number
  rightMargin?: number
  headerDistance?: number
  footerDistance?: number
  orientation?: 'portrait' | 'landscape'
}

export interface DocumentModel {
  id: string
  name: string
  paragraphCount: number
  tableCount: number
  sectionCount: number
  paragraphs: ParagraphModel[]
  tables: TableModel[]
  sections: SectionModel[]
  metadata: DocumentMetadata
  signature: string
}

export interface DocumentInfo {
  id: string
  name: string
  path?: string
  isSaved?: boolean
  isReadOnly?: boolean
}
