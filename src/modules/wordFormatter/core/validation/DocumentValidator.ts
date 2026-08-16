import type { DocumentModel } from '../../types/document'
import type { ValidationReport, ValidationIssue } from '../../types/formatting'

export class DocumentValidator {
  validateStructure(document: DocumentModel): ValidationReport {
    const issues: ValidationIssue[] = []

    if (document.paragraphs.length === 0) {
      issues.push({
        type: 'error',
        code: 'VAL001',
        message: '文档段落为空'
      })
    }

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      hasIntegrityIssue: false,
      issues
    }
  }
}
