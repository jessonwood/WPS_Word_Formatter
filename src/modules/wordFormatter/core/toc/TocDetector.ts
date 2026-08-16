import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { TocInfo } from '../../types/toc'
import { logger } from '@/shared/logger/logger'

export class TocDetector {
  constructor(private adapter: WriterAdapter) {}

  /**
   * Detects if the active document has existing Table of Contents (TOC) fields
   */
  async detect(): Promise<TocInfo> {
    try {
      const tocInfo = await this.adapter.detectToc()
      if (tocInfo && tocInfo.exists) {
        logger.info('TocDetector', `Existing TOC detected (${tocInfo.count} table(s)).`)
        return tocInfo
      }
      return { exists: false, count: 0 }
    } catch (e: any) {
      logger.warn('TocDetector', `Error during TOC detection: ${e.message}`)
      return { exists: false, count: 0 }
    }
  }
}
