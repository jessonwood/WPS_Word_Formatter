import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { TableModel, ParagraphModel } from '../../types/document'
import { logger } from '@/shared/logger/logger'

export class TableScanner {
  constructor(private adapter: WriterAdapter) {}

  async scan(paragraphs: ParagraphModel[]): Promise<TableModel[]> {
    logger.info('TableScanner', 'Reading tables from adapter...')
    const tables = await this.adapter.readTables()

    // Correlate tables with both contained paragraphs and the exact outside neighbors.
    for (const table of tables) {
      let prevIdx: number | undefined
      let nextIdx: number | undefined

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i]
        const overlapsTable = p.rangeStart < table.rangeEnd && p.rangeEnd > table.rangeStart

        if (overlapsTable) {
          p.tableIndex = table.index
          continue
        }

        if (p.rangeEnd <= table.rangeStart) {
          prevIdx = p.index
        } else if (p.rangeStart >= table.rangeEnd && nextIdx === undefined) {
          nextIdx = p.index
          break
        }
      }

      table.previousParagraphIndex = prevIdx
      table.nextParagraphIndex = nextIdx
    }

    logger.info('TableScanner', `Scanned ${tables.length} tables with structural paragraph correlation`)
    return tables
  }
}
