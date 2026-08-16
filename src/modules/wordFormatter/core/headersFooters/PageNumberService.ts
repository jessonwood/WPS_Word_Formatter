import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { DocumentModel } from '../../types/document'
import type { HeaderFooterConfig, PageNumberConfig } from '../../types/headersFooters'
import { SectionHeaderFooterResolver } from './SectionHeaderFooterResolver'
import { logger } from '@/shared/logger/logger'

export class PageNumberService {
  constructor(private adapter: WriterAdapter) {}

  /**
   * Applies page number fields across document sections
   */
  async applyPageNumbers(
    doc: DocumentModel,
    pnConfig: PageNumberConfig,
    hfConfig?: HeaderFooterConfig
  ): Promise<void> {
    if (!pnConfig.enabled) {
      logger.info('PageNumberService', 'Page numbering is disabled, skipping.')
      return
    }

    const defaultHfConfig: HeaderFooterConfig = hfConfig || {
      enabled: true,
      headerEnabled: false,
      footerEnabled: true,
      differentFirstPage: !pnConfig.showOnFirstPage,
      differentOddEven: false,
      linkToPrevious: true
    }

    const resolutions = SectionHeaderFooterResolver.resolve(doc, defaultHfConfig, pnConfig)
    logger.info('PageNumberService', `Applying native page numbers to ${resolutions.length} sections...`)

    for (const res of resolutions) {
      if (!res.showPageNumber) {
        logger.info('PageNumberService', `Section ${res.sectionIndex} page number hidden (e.g. cover page).`)
        continue
      }

      await this.adapter.applyPageNumbers({
        ...pnConfig,
        startAt: res.pageNumberStart,
        restartPerSection: res.pageNumberRestart
      }, res.sectionIndex)
    }

    logger.info('PageNumberService', 'Page numbering application completed.')
  }
}
