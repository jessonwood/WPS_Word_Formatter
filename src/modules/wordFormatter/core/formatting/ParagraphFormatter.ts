import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'
import { isTableStructuralParagraph } from '../planning/TableParagraphIsolation'

export class ParagraphFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatParagraph(paragraphIndex: number, style: ParagraphStyle, protectEmphasis: boolean = true): Promise<void> {
    // WPS exposes table cell text and empty table anchor/control ranges through
    // Document.Paragraphs. Neither may receive ordinary body/heading paragraph styles.
    if (isTableStructuralParagraph(paragraphIndex)) return

    await this.adapter.applyParagraphStyle(paragraphIndex, style, protectEmphasis)
  }
}
