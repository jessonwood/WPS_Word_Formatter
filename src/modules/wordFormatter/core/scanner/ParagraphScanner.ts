import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { ParagraphModel } from '../../types/document'
import { cleanControlChars } from '@/shared/utils/stringUtils'
import { logger } from '@/shared/logger/logger'

export class ParagraphScanner {
  constructor(private adapter: WriterAdapter) {}

  async scan(): Promise<ParagraphModel[]> {
    logger.info('ParagraphScanner', 'Reading paragraphs from adapter...')
    const rawParagraphs = await this.adapter.readParagraphs()
    
    // Normalize and compute indices
    const paragraphs: ParagraphModel[] = rawParagraphs.map((p, idx) => {
      const normalized = cleanControlChars(p.text || p.rawText || '')
      return {
        ...p,
        index: idx + 1,
        text: normalized,
        normalizedText: normalized,
        isEmpty: normalized.length === 0
      }
    })

    logger.info('ParagraphScanner', `Read ${paragraphs.length} paragraphs successfully`)
    return paragraphs
  }
}
