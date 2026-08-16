import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class Heading4Rule implements IRule {
  readonly id = 'heading-cn-4'
  readonly name = '四级标题规则（括号阿拉伯数字）'
  readonly priority = 40

  // Regex matches （1）, (1), （12）, (12) etc.
  private regex = /^[（(](\d+)[）)]\s*(.*)$/

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()
    const match = text.match(this.regex)

    if (match) {
      const numStr = match[1]
      const rest = match[2] || ''

      if (rest.length === 0) {
        return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
      }

      const reason = [
        `匹配四级标题编号（（${numStr}））`,
        `标题文本：“${text.slice(0, 30)}${text.length > 30 ? '...' : ''}”`
      ]

      let confidence = 0.90
      if (text.length <= 40) confidence += 0.05
      if (!/[。？！]$/.test(text)) confidence += 0.03

      return {
        matched: true,
        role: 'heading-4',
        confidence: Math.min(1.0, confidence),
        ruleId: this.id,
        reason
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
