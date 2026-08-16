import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'

export class CaptionFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatTableCaption(paragraphIndex: number, style: ParagraphStyle): Promise<void> {
    await this.adapter.applyParagraphStyle(paragraphIndex, style)
  }

  async formatFigureCaption(paragraphIndex: number, style: ParagraphStyle): Promise<void> {
    await this.adapter.applyParagraphStyle(paragraphIndex, style)
  }
}
