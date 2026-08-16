import type { WriterAdapter } from '../adapters/WriterAdapter'
import { DocumentScanner } from '../core/scanner/DocumentScanner'
import type { DocumentModel } from '../types/document'
import { defaultWriterAdapter } from '../adapters/adapterFactory'
import { logger } from '@/shared/logger/logger'

export class ScanService {
  private scanner: DocumentScanner

  constructor(private adapter: WriterAdapter = defaultWriterAdapter) {
    this.scanner = new DocumentScanner(adapter)
  }

  async getCurrentDocumentModel(): Promise<DocumentModel> {
    logger.info('ScanService', 'Scanning current active document...')
    return await this.scanner.scan()
  }

  async checkDocumentChanged(storedSignature: string): Promise<boolean> {
    const currentSignature = await this.adapter.getDocumentTextSignature()
    return currentSignature !== storedSignature
  }
}

export const scanService = new ScanService()
