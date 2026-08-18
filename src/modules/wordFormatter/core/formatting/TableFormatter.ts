import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle, TableStyle } from '../../types/template'
import { getTableParagraphs } from '../planning/TableParagraphIsolation'

export class TableFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatTable(tableIndex: number, style: TableStyle): Promise<void> {
    if (!style.enabled) return

    // Repair table-cell paragraphs before applying table-level styling. WPS exposes cell
    // contents as ordinary paragraphs, so an earlier body-format pass may have left a
    // two-character first-line indent inside cells. Keep each cell's current alignment,
    // but force first-line/left/right indents to zero.
    const tableParagraphs = getTableParagraphs(tableIndex)
    for (const paragraph of tableParagraphs) {
      const alignment: ParagraphStyle['alignment'] =
        paragraph.alignment === 'center' ||
        paragraph.alignment === 'right' ||
        paragraph.alignment === 'justify'
          ? paragraph.alignment
          : 'left'

      const cellParagraphStyle: ParagraphStyle = {
        chineseFont: style.chineseFont,
        westernFont: style.westernFont,
        fontSizePt: style.fontSizePt,
        alignment,
        firstLineIndentChars: 0,
        leftIndentChars: 0,
        rightIndentChars: 0
      }
      await this.adapter.applyParagraphStyle(paragraph.index, cellParagraphStyle, false)
    }

    await this.adapter.applyTableStyle(tableIndex, style)
  }
}
