import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { SectionModel } from '../../types/document'
import { logger } from '@/shared/logger/logger'

export class SectionScanner {
  constructor(private adapter: WriterAdapter) {}

  async scan(): Promise<SectionModel[]> {
    logger.info('SectionScanner', 'Reading sections from adapter...')
    const sections = await this.adapter.readSections()
    return sections
  }
}
