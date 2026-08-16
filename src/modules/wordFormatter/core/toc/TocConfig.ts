import type { TocConfig } from '../../types/toc'

export const DEFAULT_TOC_CONFIG: TocConfig = {
  enabled: true,
  startLevel: 1,
  endLevel: 3,
  showPageNumbers: true,
  rightAlignPageNumbers: true,
  useHyperlinks: true,
  tabLeader: 'dots',
  insertMode: 'current-selection',
  separatePage: true
}
