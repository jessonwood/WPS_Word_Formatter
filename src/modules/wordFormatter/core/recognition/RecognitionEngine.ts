import type { DocumentModel } from '../../types/document'
import type { RecognitionResult } from '../../types/recognition'
import type { CustomRecognitionRule } from '../../types/template'
import { RuleEngine } from './RuleEngine'
import { ConflictResolver } from './ConflictResolver'
import type { RuleContext } from './rules/BaseRule'

export class RecognitionEngine {
  private ruleEngine: RuleEngine
  private conflictResolver: ConflictResolver

  constructor() {
    this.ruleEngine = new RuleEngine()
    this.conflictResolver = new ConflictResolver()
  }

  analyze(document: DocumentModel, customRules?: CustomRecognitionRule[]): RecognitionResult[] {
    const paragraphs = document.paragraphs
    const results: RecognitionResult[] = []

    let nonEmptyCount = 0
    const totalNonEmpty = paragraphs.filter(p => !p.isEmpty).length
    let hasDetectedMainTitle = false

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]
      if (!p.isEmpty) {
        nonEmptyCount++
      }

      const context: RuleContext = {
        document,
        currentIndex: i + 1,
        nonEmptyIndex: nonEmptyCount,
        totalNonEmpty,
        previousParagraph: i > 0 ? paragraphs[i - 1] : undefined,
        nextParagraph: i < paragraphs.length - 1 ? paragraphs[i + 1] : undefined,
        hasDetectedMainTitle
      }

      const evalResult = this.ruleEngine.evaluateParagraph(p, context, customRules)

      if (evalResult.role === 'main-title') {
        hasDetectedMainTitle = true
      }

      results.push({
        paragraphIndex: p.index,
        role: evalResult.role,
        confidence: evalResult.confidence,
        ruleId: evalResult.ruleId,
        reason: evalResult.reason,
        originalText: p.text,
        inlineRanges: evalResult.inlineRanges,
        userOverridden: false
      })
    }

    // Apply conflict resolution
    return this.conflictResolver.resolve(results, document)
  }
}

export const recognitionEngine = new RecognitionEngine()
