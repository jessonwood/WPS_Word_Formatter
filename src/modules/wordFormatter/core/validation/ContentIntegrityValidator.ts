import type { WriterAdapter } from '../../adapters/WriterAdapter'
import { WordFormatterError } from '../../types/errors'
import { logger } from '@/shared/logger/logger'

export class ContentIntegrityValidator {
  constructor(private adapter: WriterAdapter) {}

  async validate(beforeSignature: string): Promise<boolean> {
    logger.info('ContentIntegrityValidator', 'Validating post-formatting content integrity...')
    const afterSignature = await this.adapter.getDocumentTextSignature()

    if (beforeSignature !== afterSignature) {
      logger.error('ContentIntegrityValidator', `Signature mismatch! Before: ${beforeSignature}, After: ${afterSignature}`)
      throw new WordFormatterError({
        code: 'WF501',
        message: '排版后文档正文内容签名不一致，可能发生文本篡改或丢失！已触发安全拦截与恢复机制。',
        moduleName: 'ContentIntegrityValidator',
        details: `Expected ${beforeSignature} but got ${afterSignature}`
      })
    }

    logger.info('ContentIntegrityValidator', 'Integrity validation PASSED: Text signature is perfectly identical.')
    return true
  }
}
