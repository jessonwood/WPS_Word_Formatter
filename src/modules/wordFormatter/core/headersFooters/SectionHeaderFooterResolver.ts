import type { DocumentModel, SectionModel } from '../../types/document'
import type { HeaderFooterConfig, PageNumberConfig, SectionHeaderFooterResolution } from '../../types/headersFooters'

export class SectionHeaderFooterResolver {
  /**
   * Resolves per-section header, footer, and page number strategies for multi-section documents,
   * safeguarding landscape wide-table sections and cover sections.
   */
  static resolve(
    doc: DocumentModel,
    hfConfig: HeaderFooterConfig,
    pnConfig: PageNumberConfig
  ): SectionHeaderFooterResolution[] {
    const sections = doc.sections && doc.sections.length > 0
      ? doc.sections
      : [{ index: 1, orientation: 'portrait' }] as SectionModel[]

    return sections.map((sec, idx) => {
      const sectionIndex = sec.index || idx + 1
      const isLandscape = sec.orientation === 'landscape' || (sec.pageWidth !== undefined && sec.pageHeight !== undefined && sec.pageWidth > sec.pageHeight)
      const isFirstSection = idx === 0

      // Section 1 might be cover/title page if differentFirstPage is true
      const isCoverPage = isFirstSection && hfConfig.differentFirstPage

      // If this is a landscape wide-table section, unlink to previous so header/footer dimensions don't corrupt
      const linkToPrevious = isFirstSection ? false : (isLandscape ? false : hfConfig.linkToPrevious)

      // Page numbering resolution
      let pageNumberRestart = false
      let pageNumberStart = pnConfig.startAt ?? 1
      let showPageNumber = pnConfig.enabled

      if (isFirstSection && !pnConfig.showOnFirstPage && hfConfig.differentFirstPage) {
        showPageNumber = false
      }

      if (!isFirstSection && pnConfig.restartPerSection) {
        pageNumberRestart = true
      }

      return {
        sectionIndex,
        isLandscapeWideTable: isLandscape,
        isCoverPage,
        differentFirstPage: hfConfig.differentFirstPage,
        differentOddEven: hfConfig.differentOddEven,
        linkToPrevious,
        headerText: hfConfig.headerEnabled ? (hfConfig.headerText || '') : undefined,
        footerText: hfConfig.footerEnabled ? (hfConfig.footerText || '') : undefined,
        pageNumberStart: pageNumberRestart ? pageNumberStart : undefined,
        pageNumberRestart,
        showPageNumber
      }
    })
  }
}
