import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { TableStyle } from '../../types/template'

export class TableFormatter {
  constructor(private adapter: WriterAdapter) {}

  async formatTable(tableIndex: number, style: TableStyle): Promise<void> {
    if (!style.enabled) return
    await this.adapter.applyTableStyle(tableIndex, style)
  }
}
