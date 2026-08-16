import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'

export class AttachmentFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatAttachment(paragraphIndex: number, style: ParagraphStyle): Promise<void> {
    await this.adapter.applyParagraphStyle(paragraphIndex, style)
  }
}
