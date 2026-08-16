import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { TableModel, ParagraphModel } from '../../types/document'
import { logger } from '@/shared/logger/logger'

export class TableScanner {
  constructor(private adapter: WriterAdapter) {}

  async scan(paragraphs: ParagraphModel[]): Promise<TableModel[]> {
    logger.info('TableScanner', 'Reading tables from adapter...')
    const tables = await this.adapter.readTables()

    // Correlate tables with adjacent paragraphs
    for (const table of tables) {
      // Find previous paragraph before table rangeStart
      let prevIdx: number | undefined
      let nextIdx: number | undefined

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i]
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

    logger.info('TableScanner', `Scanned ${tables.length} tables`)
    return tables
  }
}
