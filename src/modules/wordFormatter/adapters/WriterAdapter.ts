import type { DocumentInfo, ParagraphModel, TableModel, SectionModel } from '../types/document'
import type { PageFormat, ParagraphStyle, TableStyle } from '../types/template'

export interface DocumentRange {
  start: number
  end: number
}

export interface RunStyleChange {
  chineseFont?: string
  westernFont?: string
  fontSizePt?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontColor?: string
}

export interface WriterAdapter {
  /**
   * Check whether an active document exists in WPS Writer
   */
  hasActiveDocument(): Promise<boolean>

  /**
   * Get active document basic information
   */
  getActiveDocumentInfo(): Promise<DocumentInfo | null>

  /**
   * Read all paragraphs from the active document
   */
  readParagraphs(): Promise<ParagraphModel[]>

  /**
   * Read all tables from the active document
   */
  readTables(): Promise<TableModel[]>

  /**
   * Read all sections (page setups) from the active document
   */
  readSections(): Promise<SectionModel[]>

  /**
   * Calculate text signature for the entire document content
   */
  getDocumentTextSignature(): Promise<string>

  /**
   * Apply page layout settings to document sections
   */
  applyPageSettings(settings: PageFormat): Promise<void>

  /**
   * Apply paragraph formatting (alignment, indents, line spacing, space before/after, emphasis protection)
   */
  applyParagraphStyle(paragraphIndex: number, style: ParagraphStyle, protectEmphasis?: boolean): Promise<void>

  /**
   * Apply font formatting to an inline range within a paragraph
   */
  applyRangeStyle(paragraphIndex: number, startOffset: number, endOffset: number, style: RunStyleChange): Promise<void>

  /**
   * Apply outline level to paragraph for navigation tree
   */
  applyOutlineLevel(paragraphIndex: number, level: number): Promise<void>

  /**
   * Apply styling to a table (header formatting, cell alignment, borders, padding)
   */
  applyTableStyle(tableIndex: number, style: TableStyle): Promise<void>

  /**
   * Start an undo record if supported by WPS JSAPI
   */
  beginUndoRecord(name: string): Promise<void>

  /**
   * End an undo record if supported by WPS JSAPI
   */
  endUndoRecord(): Promise<void>

  /**
   * Native undo execution
   */
  executeNativeUndo(): Promise<boolean>

  /**
   * Scroll and select a specific paragraph in the document view
   */
  selectParagraph(paragraphIndex: number): Promise<void>

  /**
   * Temporarily freeze screen updating during mass formatting operations for massive speedup
   */
  setScreenUpdating(updating: boolean): Promise<void>

  /**
   * Apply minimal/granular changes to a specific paragraph without touching compliant properties
   */
  applyGranularParagraphChanges(paragraphIndex: number, changes: import('../types/planning').FormatChange[], targetStyle: ParagraphStyle): Promise<void>

  /**
   * Apply minimal/granular changes to document section page setup
   */
  applyGranularSectionChanges(sectionIndex: number, changes: import('../types/planning').FormatChange[]): Promise<void>

  /**
   * Apply Header and Footer configuration to a section or all sections
   */
  applyHeaderFooter(config: import('../types/headersFooters').HeaderFooterConfig, sectionIndex?: number): Promise<void>

  /**
   * Apply Page Number fields to a section or all sections
   */
  applyPageNumbers(config: import('../types/headersFooters').PageNumberConfig, sectionIndex?: number): Promise<void>

  /**
   * Detect existing Tables of Contents in the document
   */
  detectToc(): Promise<import('../types/toc').TocInfo | null>

  /**
   * Insert Table of Contents at configured position
   */
  insertToc(config: import('../types/toc').TocConfig): Promise<void>

  /**
   * Update existing Table of Contents
   */
  updateToc(tocIndex?: number): Promise<void>

  /**
   * Delete existing Table of Contents
   */
  deleteToc(tocIndex?: number): Promise<void>

  /**
   * Replace the text content of a paragraph
   */
  replaceParagraphText(paragraphIndex: number, text: string): Promise<void>

  /**
   * Delete an entire paragraph (e.g. empty line)
   */
  deleteParagraph(paragraphIndex: number): Promise<void>

  /**
   * Save a copy of the active document without switching the document path (Safe physical backup)
   */
  saveCopyAs(targetPath: string): Promise<boolean>

  /**
   * Explicitly save current active document (ActiveDocument.Save) upon user confirmation
   */
  saveActiveDocument(): Promise<boolean>
}

