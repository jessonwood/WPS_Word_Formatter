/**
 * Types for Header, Footer and Page Number configurations in WPS Word Formatter V2.2
 */

export interface HeaderFooterConfig {
  enabled: boolean
  headerEnabled: boolean
  footerEnabled: boolean
  headerText?: string
  footerText?: string
  headerAlignment?: 'left' | 'center' | 'right'
  footerAlignment?: 'left' | 'center' | 'right'
  differentFirstPage: boolean
  differentOddEven: boolean
  linkToPrevious: boolean
  headerDistancePt?: number
  footerDistancePt?: number
  fontNameChinese?: string
  fontNameWestern?: string
  fontSizePt?: number
}

export type PageNumberPosition = 'footer-left' | 'footer-center' | 'footer-right' | 'header-left' | 'header-center' | 'header-right'
export type PageNumberStyle = 'plain' | 'dash' | 'chinese-dash'
export type PageNumberFormat = 'arabic' | 'roman-lower' | 'roman-upper'

export interface PageNumberConfig {
  enabled: boolean
  position: PageNumberPosition
  style: PageNumberStyle
  startAt?: number
  restartPerSection: boolean
  showOnFirstPage: boolean
  numberFormat: 'arabic' | 'roman-lower' | 'roman-upper'
  fontNameChinese?: string
  fontNameWestern?: string
  fontSizePt?: number
}

export interface SectionHeaderFooterResolution {
  sectionIndex: number
  isLandscapeWideTable: boolean
  isCoverPage: boolean
  differentFirstPage: boolean
  differentOddEven: boolean
  linkToPrevious: boolean
  headerText?: string
  footerText?: string
  pageNumberStart?: number
  pageNumberRestart: boolean
  showPageNumber: boolean
}
