import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphStyle } from '../../types/template'

export class RunFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatInlineRange(
    paragraphIndex: number,
    startOffset: number,
    endOffset: number,
    style: ParagraphStyle
  ): Promise<void> {
    await this.adapter.applyRangeStyle(paragraphIndex, startOffset, endOffset, {
      chineseFont: style.chineseFont,
      westernFont: style.westernFont,
      fontSizePt: style.fontSizePt,
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      fontColor: style.fontColor
    })
  }
}
