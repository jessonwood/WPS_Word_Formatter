/**
 * Types for Table of Contents (TOC) in WPS Word Formatter V2.2
 */

export type TocInsertMode = 'current-selection' | 'after-title' | 'beginning'
export type TocTabLeader = 'dots' | 'dash' | 'none'

export interface TocConfig {
  enabled: boolean
  startLevel: number
  endLevel: number
  showPageNumbers: boolean
  rightAlignPageNumbers: boolean
  useHyperlinks: boolean
  tabLeader: TocTabLeader
  insertMode: TocInsertMode
  separatePage?: boolean
}

export interface TocInfo {
  exists: boolean
  count: number
  upperLevel?: number
  lowerLevel?: number
  rangeStart?: number
  rangeEnd?: number
  isStale?: boolean
}
