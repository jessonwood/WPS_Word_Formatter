import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'
import { isTableParagraph } from '../planning/TableParagraphIsolation'

export class ParagraphFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatParagraph(paragraphIndex: number, style: ParagraphStyle, protectEmphasis: boolean = true): Promise<void> {
    // WPS exposes table-cell text through Document.Paragraphs. Those paragraphs must
    // never receive ordinary body/heading styles such as a two-character first-line indent.
    if (isTableParagraph(paragraphIndex)) return

    await this.adapter.applyParagraphStyle(paragraphIndex, style, protectEmphasis)
  }
}
