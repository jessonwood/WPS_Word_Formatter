import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'
import { isTableStructuralParagraph } from '../planning/TableParagraphIsolation'
import { isEmbeddedObjectParagraphProtected } from '../protection/EmbeddedObjectProtection'

export class ParagraphFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatParagraph(paragraphIndex: number, style: ParagraphStyle, protectEmphasis: boolean = true): Promise<void> {
    // WPS exposes table cell text/table anchors and embedded object anchor paragraphs
    // through Document.Paragraphs. Applying ordinary paragraph styles to an inline chart
    // paragraph can clip it when the template uses exact line spacing.
    if (
      isTableStructuralParagraph(paragraphIndex) ||
      isEmbeddedObjectParagraphProtected(paragraphIndex)
    ) return

    await this.adapter.applyParagraphStyle(paragraphIndex, style, protectEmphasis)
  }
}
