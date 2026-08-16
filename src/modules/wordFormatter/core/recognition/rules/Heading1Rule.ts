import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class Heading1Rule implements IRule {
  readonly id = 'heading-cn-1'
  readonly name = '中文一级标题规则'
  readonly priority = 10

  // Regex matches 一、, 二、, 十一、, 二十一、 etc.
  private regex = /^[一二三四五六七八九十百零〇]+[、．.]\s*(.*)$/

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()
    const match = text.match(this.regex)

    if (match) {
      const headingBody = match[1] || ''
      const reason = [
        '匹配中文一级标题编号（如“一、”、“十一、”）',
        `标题文本内容：“${text.slice(0, 30)}${text.length > 30 ? '...' : ''}”`
      ]

      let confidence = 0.96

      // Extra signals
      if (text.length <= 40) confidence += 0.03
      if (paragraph.bold) confidence += 0.01
      if (!/[。？！；]$/.test(text)) confidence += 0.01
      if (paragraph.alignment === 'center') {
        reason.push('段落居中排列，增强一级标题置信度')
      }

      return {
        matched: true,
        role: 'heading-1',
        confidence: Math.min(1.0, confidence),
        ruleId: this.id,
        reason
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
