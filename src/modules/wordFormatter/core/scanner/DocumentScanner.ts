import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { DocumentModel } from '../../types/document'
import { ParagraphScanner } from './ParagraphScanner'
import { TableScanner } from './TableScanner'
import { SectionScanner } from './SectionScanner'
import { SpecialObjectScanner } from './SpecialObjectScanner'
import { calculateTextSignature } from '@/shared/utils/stringUtils'
import { logger } from '@/shared/logger/logger'

export class DocumentScanner {
  private paragraphScanner: ParagraphScanner
  private tableScanner: TableScanner
  private sectionScanner: SectionScanner
  private specialObjectScanner: SpecialObjectScanner

  constructor(private adapter: WriterAdapter) {
    this.paragraphScanner = new ParagraphScanner(adapter)
    this.tableScanner = new TableScanner(adapter)
    this.sectionScanner = new SectionScanner(adapter)
    this.specialObjectScanner = new SpecialObjectScanner()
  }

  async scan(): Promise<DocumentModel> {
    logger.info('DocumentScanner', 'Starting comprehensive document scan...')

    // 1. Get Document Info
    const docInfo = await this.adapter.getActiveDocumentInfo()
    const docName = docInfo?.name || '未命名文档'
    const docId = docInfo?.id || `doc_${Date.now()}`

    // 2. Scan Paragraphs
    const paragraphs = await this.paragraphScanner.scan()

    // 3. Scan Tables
    const tables = await this.tableScanner.scan(paragraphs)

    // 4. Scan Sections
    const sections = await this.sectionScanner.scan()

    // 5. Special Objects Summary
    const specialObjects = this.specialObjectScanner.scan(paragraphs)
    logger.info('DocumentScanner', 'Special objects detected', specialObjects)

    // 6. Text Signature
    const signature = calculateTextSignature(paragraphs.map(p => p.rawText || p.text))

    const model: DocumentModel = {
      id: docId,
      name: docName,
      paragraphCount: paragraphs.length,
      tableCount: tables.length,
      sectionCount: sections.length,
      paragraphs,
      tables,
      sections,
      metadata: {
        title: docName,
        charCount: paragraphs.reduce((sum, p) => sum + p.text.length, 0)
      },
      signature
    }

    logger.info('DocumentScanner', `Document model created: ${paragraphs.length} paragraphs, ${tables.length} tables, signature=${signature}`)
    return model
  }
}
