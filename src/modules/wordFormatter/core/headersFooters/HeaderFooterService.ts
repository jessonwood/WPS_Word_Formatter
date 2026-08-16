import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { DocumentModel } from '../../types/document'
import type { HeaderFooterConfig, PageNumberConfig } from '../../types/headersFooters'
import { SectionHeaderFooterResolver } from './SectionHeaderFooterResolver'
import { logger } from '@/shared/logger/logger'

export class HeaderFooterService {
  constructor(private adapter: WriterAdapter) {}

  /**
   * Applies header and footer configuration to all document sections safely
   */
  async applyHeaderFooter(
    doc: DocumentModel,
    hfConfig: HeaderFooterConfig,
    pnConfig?: PageNumberConfig
  ): Promise<void> {
    if (!hfConfig.enabled) {
      logger.info('HeaderFooterService', 'Header/Footer is disabled in configuration, skipping.')
      return
    }

    const defaultPnConfig: PageNumberConfig = pnConfig || {
      enabled: false,
      position: 'footer-center',
      style: 'plain',
      restartPerSection: false,
      showOnFirstPage: true,
      numberFormat: 'arabic'
    }

    const resolutions = SectionHeaderFooterResolver.resolve(doc, hfConfig, defaultPnConfig)
    logger.info('HeaderFooterService', `Applying header/footer to ${resolutions.length} sections...`)

    for (const res of resolutions) {
      await this.adapter.applyHeaderFooter({
        ...hfConfig,
        linkToPrevious: res.linkToPrevious,
        differentFirstPage: res.differentFirstPage,
        differentOddEven: res.differentOddEven,
        headerText: res.headerText,
        footerText: res.footerText
      }, res.sectionIndex)
    }

    logger.info('HeaderFooterService', 'Header/Footer application completed successfully.')
  }
}
