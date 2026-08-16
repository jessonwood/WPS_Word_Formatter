import { describe, it, expect, vi } from 'vitest'
import { SectionHeaderFooterResolver } from '../src/modules/wordFormatter/core/headersFooters/SectionHeaderFooterResolver'
import { HeaderFooterService } from '../src/modules/wordFormatter/core/headersFooters/HeaderFooterService'
import { PageNumberService } from '../src/modules/wordFormatter/core/headersFooters/PageNumberService'
import type { DocumentModel } from '../src/modules/wordFormatter/types/document'
import type { HeaderFooterConfig, PageNumberConfig } from '../src/modules/wordFormatter/types/headersFooters'
import type { WriterAdapter } from '../src/modules/wordFormatter/adapters/WriterAdapter'

class MockWriterAdapter implements Partial<WriterAdapter> {
  appliedHfCalls: any[] = []
  appliedPnCalls: any[] = []

  async applyHeaderFooter(config: HeaderFooterConfig, sectionIndex?: number) {
    this.appliedHfCalls.push({ config, sectionIndex })
  }

  async applyPageNumbers(config: PageNumberConfig, sectionIndex?: number) {
    this.appliedPnCalls.push({ config, sectionIndex })
  }
}

describe('V2.2 Header, Footer and Page Number Suite', () => {
  const sampleDocWithLandscape: DocumentModel = {
    id: 'doc-multi-sec',
    name: 'MultiSectionReport.docx',
    signature: 'sig-multi-999',
    paragraphCount: 10,
    tableCount: 1,
    sectionCount: 3,
    sections: [
      { index: 1, orientation: 'portrait', topMargin: 105, bottomMargin: 100, leftMargin: 80, rightMargin: 80 },
      { index: 2, orientation: 'landscape', pageWidth: 841.9, pageHeight: 595.3, topMargin: 80, bottomMargin: 80, leftMargin: 80, rightMargin: 80 },
      { index: 3, orientation: 'portrait', topMargin: 105, bottomMargin: 100, leftMargin: 80, rightMargin: 80 }
    ],
    paragraphs: [],
    tables: [],
    metadata: { title: 'MultiSectionReport', charCount: 100 }
  }

  const hfConfig: HeaderFooterConfig = {
    enabled: true,
    headerEnabled: true,
    footerEnabled: true,
    headerText: '绝密 ★ 商业机密',
    footerText: '第 1 页',
    headerAlignment: 'right',
    footerAlignment: 'center',
    differentFirstPage: true,
    differentOddEven: false,
    linkToPrevious: true,
    headerDistancePt: 42.5,
    footerDistancePt: 49.6
  }

  const pnConfig: PageNumberConfig = {
    enabled: true,
    position: 'footer-center',
    style: 'chinese-dash',
    startAt: 1,
    restartPerSection: false,
    showOnFirstPage: false,
    numberFormat: 'arabic'
  }

  it('1. SectionHeaderFooterResolver correctly protects landscape wide-table sections', () => {
    const resolutions = SectionHeaderFooterResolver.resolve(sampleDocWithLandscape, hfConfig, pnConfig)

    expect(resolutions.length).toBe(3)

    // Section 1: Portrait cover/first section
    expect(resolutions[0].sectionIndex).toBe(1)
    expect(resolutions[0].isLandscapeWideTable).toBe(false)
    expect(resolutions[0].linkToPrevious).toBe(false)
    expect(resolutions[0].isCoverPage).toBe(true)
    expect(resolutions[0].showPageNumber).toBe(false) // First page hidden

    // Section 2: Landscape wide-table section -> Must unlink linkToPrevious to prevent margin/header corruption
    expect(resolutions[1].sectionIndex).toBe(2)
    expect(resolutions[1].isLandscapeWideTable).toBe(true)
    expect(resolutions[1].linkToPrevious).toBe(false)
    expect(resolutions[1].showPageNumber).toBe(true)

    // Section 3: Regular portrait body section -> linkToPrevious is preserved as configured
    expect(resolutions[2].sectionIndex).toBe(3)
    expect(resolutions[2].isLandscapeWideTable).toBe(false)
    expect(resolutions[2].linkToPrevious).toBe(true)
    expect(resolutions[2].showPageNumber).toBe(true)
  })

  it('2. HeaderFooterService invokes adapter per resolved section', async () => {
    const adapter = new MockWriterAdapter()
    const service = new HeaderFooterService(adapter as unknown as WriterAdapter)

    await service.applyHeaderFooter(sampleDocWithLandscape, hfConfig, pnConfig)

    expect(adapter.appliedHfCalls.length).toBe(3)
    expect(adapter.appliedHfCalls[0].sectionIndex).toBe(1)
    expect(adapter.appliedHfCalls[0].config.headerText).toBe('绝密 ★ 商业机密')
    expect(adapter.appliedHfCalls[1].sectionIndex).toBe(2)
    expect(adapter.appliedHfCalls[1].config.linkToPrevious).toBe(false)
  })

  it('3. PageNumberService applies native PageNumber configuration', async () => {
    const adapter = new MockWriterAdapter()
    const service = new PageNumberService(adapter as unknown as WriterAdapter)

    await service.applyPageNumbers(sampleDocWithLandscape, pnConfig, hfConfig)

    // Section 1 has showPageNumber = false, so only Sections 2 and 3 receive page numbers
    expect(adapter.appliedPnCalls.length).toBe(2)
    expect(adapter.appliedPnCalls[0].sectionIndex).toBe(2)
    expect(adapter.appliedPnCalls[0].config.style).toBe('chinese-dash')
    expect(adapter.appliedPnCalls[1].sectionIndex).toBe(3)
  })
})
