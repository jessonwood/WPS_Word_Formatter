import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { TocConfig, TocInfo } from '../../types/toc'
import { TocDetector } from './TocDetector'
import { DEFAULT_TOC_CONFIG } from './TocConfig'
import { logger } from '@/shared/logger/logger'

export class TocService {
  private detector: TocDetector

  constructor(private adapter: WriterAdapter) {
    this.detector = new TocDetector(adapter)
  }

  /**
   * Detect existing TOC in active document
   */
  async detect(): Promise<TocInfo> {
    return await this.detector.detect()
  }

  /**
   * Insert new TOC at designated position
   */
  async insert(config: Partial<TocConfig> = {}): Promise<void> {
    const fullConfig: TocConfig = { ...DEFAULT_TOC_CONFIG, ...config }
    logger.info('TocService', `Inserting TOC (Levels ${fullConfig.startLevel} ~ ${fullConfig.endLevel}, mode: ${fullConfig.insertMode})...`)
    await this.adapter.insertToc(fullConfig)
    logger.info('TocService', 'TOC inserted successfully.')
  }

  /**
   * Update existing TOC page numbers or entries
   */
  async update(tocIndex: number = 1): Promise<void> {
    logger.info('TocService', `Updating TOC #${tocIndex}...`)
    await this.adapter.updateToc(tocIndex)
    logger.info('TocService', 'TOC updated successfully.')
  }

  /**
   * Delete existing TOC
   */
  async delete(tocIndex: number = 1): Promise<void> {
    logger.info('TocService', `Deleting TOC #${tocIndex}...`)
    await this.adapter.deleteToc(tocIndex)
    logger.info('TocService', 'TOC deleted successfully.')
  }

  /**
   * Regenerate TOC (Deletes old and inserts new)
   */
  async regenerate(config: Partial<TocConfig> = {}): Promise<void> {
    const existing = await this.detect()
    if (existing.exists && existing.count > 0) {
      await this.delete(1)
    }
    await this.insert(config)
  }
}
