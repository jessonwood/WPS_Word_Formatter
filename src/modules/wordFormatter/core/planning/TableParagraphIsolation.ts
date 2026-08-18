import type { DocumentModel, ParagraphModel } from '../../types/document'

let tableParagraphIndexes = new Set<number>()
let tableParagraphsByTable = new Map<number, ParagraphModel[]>()

/**
 * Register table-cell paragraphs for the document currently being planned/formatted.
 * WPS exposes cell text through Document.Paragraphs, so these paragraphs must be kept
 * out of ordinary body/heading formatting and handled by TableFormatter instead.
 */
export function registerTableParagraphs(document: DocumentModel): void {
  tableParagraphIndexes = new Set<number>()
  tableParagraphsByTable = new Map<number, ParagraphModel[]>()

  for (const paragraph of document.paragraphs || []) {
    if (paragraph.tableIndex === undefined) continue

    tableParagraphIndexes.add(paragraph.index)
    const list = tableParagraphsByTable.get(paragraph.tableIndex) || []
    list.push(paragraph)
    tableParagraphsByTable.set(paragraph.tableIndex, list)
  }
}

export function isTableParagraph(paragraphIndex: number): boolean {
  return tableParagraphIndexes.has(paragraphIndex)
}

export function getTableParagraphs(tableIndex: number): ParagraphModel[] {
  return tableParagraphsByTable.get(tableIndex) || []
}
