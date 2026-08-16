import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { PageFormat } from '../../types/template'
import { logger } from '@/shared/logger/logger'

export class PageFormatter {
  constructor(private adapter: WriterAdapter) {}

  async format(pageFormat: PageFormat): Promise<void> {
    logger.info('PageFormatter', 'Applying page format settings...', pageFormat)
    await this.adapter.applyPageSettings(pageFormat)
  }
}
