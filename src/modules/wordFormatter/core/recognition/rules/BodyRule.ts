import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class BodyRule implements IRule {
  readonly id = 'rule-body-default'
  readonly name = '正文默认规则'
  readonly priority = 999

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()
    const reasons = ['未命中特殊标题或标识规则，归类为正文']
    let confidence = 0.90

    if (text.length > 50) {
      reasons.push('段落字符数较长，符合正文特征')
      confidence = 0.95
    }

    if (/[。！？]$/.test(text)) {
      reasons.push('段尾包含标准句末标点符号')
      confidence = Math.min(0.98, confidence + 0.03)
    }

    return {
      matched: true,
      role: 'body',
      confidence,
      ruleId: this.id,
      reason: reasons
    }
  }
}
