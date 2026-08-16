import type { WriterAdapter } from '../../adapters/WriterAdapter'

export class OutlineFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatOutline(paragraphIndex: number, level: number): Promise<void> {
    await this.adapter.applyOutlineLevel(paragraphIndex, level)
  }
}
