import type { RecognitionResult } from '../../types/recognition'
import type { DocumentModel } from '../../types/document'

export class ConflictResolver {
  /**
   * Post-process recognition results to ensure document structure coherence
   */
  resolve(results: RecognitionResult[], _document: DocumentModel): RecognitionResult[] {
    const resolved = [...results]

    // 1. Ensure at most one primary main-title is identified at the top
    let mainTitleFound = false
    for (let i = 0; i < resolved.length; i++) {
      if (resolved[i].role === 'main-title') {
        if (!mainTitleFound && i <= 5) {
          mainTitleFound = true
        } else {
          // If a secondary main-title occurs far below, demote to body or subtitle
          resolved[i].role = 'body'
          resolved[i].ruleId = 'resolver-demote-main-title'
          resolved[i].confidence = 0.85
          resolved[i].reason.push('位于正文后部，取消多余主标题标记，调整为正文')
        }
      }
    }

    // 2. Normalize consecutive blank lines
    let inBlankSequence = false
    for (let i = 0; i < resolved.length; i++) {
      if (resolved[i].role === 'blank') {
        if (inBlankSequence) {
          resolved[i].reason.push('连续空行')
        }
        inBlankSequence = true
      } else {
        inBlankSequence = false
      }
    }

    return resolved
  }
}
