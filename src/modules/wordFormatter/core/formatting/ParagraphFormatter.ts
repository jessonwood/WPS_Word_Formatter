import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'

export class ParagraphFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatParagraph(paragraphIndex: number, style: ParagraphStyle, protectEmphasis: boolean = true): Promise<void> {
    await this.adapter.applyParagraphStyle(paragraphIndex, style, protectEmphasis)
  }
}
