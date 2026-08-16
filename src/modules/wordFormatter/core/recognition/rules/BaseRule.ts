import type { ParagraphModel, DocumentModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export interface RuleContext {
  document: DocumentModel
  currentIndex: number
  nonEmptyIndex: number
  totalNonEmpty: number
  previousParagraph?: ParagraphModel
  nextParagraph?: ParagraphModel
  hasDetectedMainTitle: boolean
}

export interface IRule {
  readonly id: string
  readonly name: string
  readonly priority: number // Lower number = higher priority

  evaluate(paragraph: ParagraphModel, context: RuleContext): RuleEvaluation
}
