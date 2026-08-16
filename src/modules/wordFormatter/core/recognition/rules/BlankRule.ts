import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class BlankRule implements IRule {
  readonly id = 'rule-blank'
  readonly name = '空行规则'
  readonly priority = 1

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    if (paragraph.isEmpty || paragraph.normalizedText.trim().length === 0) {
      return {
        matched: true,
        role: 'blank',
        confidence: 1.0,
        ruleId: this.id,
        reason: ['段落无可见字符（空白段落）']
      }
    }
    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
