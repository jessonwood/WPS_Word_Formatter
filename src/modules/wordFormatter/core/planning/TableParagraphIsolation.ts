import type { DocumentModel, ParagraphModel } from '../../types/document'

let tableParagraphIndexes = new Set<number>()
let tableStructuralParagraphIndexes = new Set<number>()
let tableParagraphsByTable = new Map<number, ParagraphModel[]>()

/**
 * Register table-related paragraphs for the document currently being planned/formatted.
 * WPS exposes both cell text and table anchor/control ranges through Document.Paragraphs.
 * Cell paragraphs are handled by TableFormatter; empty table-boundary anchors must be
 * ignored by ordinary paragraph formatting altogether.
 */
export function registerTableParagraphs(document: DocumentModel): void {
  tableParagraphIndexes = new Set<number>()
  tableStructuralParagraphIndexes = new Set<number>()
  tableParagraphsByTable = new Map<number, ParagraphModel[]>()

  for (const paragraph of document.paragraphs || []) {
    if (paragraph.tableIndex !== undefined) {
      tableParagraphIndexes.add(paragraph.index)
      tableStructuralParagraphIndexes.add(paragraph.index)

      const list = tableParagraphsByTable.get(paragraph.tableIndex) || []
      list.push(paragraph)
      tableParagraphsByTable.set(paragraph.tableIndex, list)
    }

    if (paragraph.isTableBoundary) {
      tableStructuralParagraphIndexes.add(paragraph.index)
    }
  }
}

export function isTableParagraph(paragraphIndex: number): boolean {
  return tableParagraphIndexes.has(paragraphIndex)
}

export function isTableStructuralParagraph(paragraphIndex: number): boolean {
  return tableStructuralParagraphIndexes.has(paragraphIndex)
}

export function getTableParagraphs(tableIndex: number): ParagraphModel[] {
  return tableParagraphsByTable.get(tableIndex) || []
}
