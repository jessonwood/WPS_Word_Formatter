import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'
import { isDecimalOrDataPattern } from '@/shared/utils/stringUtils'

export class Heading3Rule implements IRule {
  readonly id = 'heading-cn-3'
  readonly name = '三级标题规则（阿拉伯数字）'
  readonly priority = 30

  // Regex matches 1. , 1．, 1、, 12. , etc.
  private regex = /^(\d+)[.．、]\s*(.*)$/

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()

    // Safety checks against decimals / data numbers
    if (isDecimalOrDataPattern(text)) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    const match = text.match(this.regex)
    if (match) {
      const numStr = match[1]
      const rest = match[2] || ''

      // 1. Exclude if rest starts with decimal digits or units without space/title pattern
      // e.g. "25亿元", "14%", "2个百分点"
      if (/^\d/.test(rest) || /^(?:%|％|‰|个百分点|亿元|万元|元|点)/.test(rest)) {
        return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
      }

      // 2. Exclude if numStr is a 4-digit year like 2026.08 or 2026.1.1
      if (numStr.length === 4 && parseInt(numStr, 10) >= 1900 && parseInt(numStr, 10) <= 2100) {
        if (/^\d{1,2}(?:\.\d{1,2})?/.test(rest)) {
          return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
        }
      }

      // 3. Must have meaningful title text or short outline text
      if (rest.length === 0) {
        return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
      }

      const reason = [
        `匹配三级标题阿拉伯数字编号（${numStr}.）`,
        `标题文本：“${text.slice(0, 30)}${text.length > 30 ? '...' : ''}”`
      ]

      let confidence = 0.92
      if (text.length <= 40) confidence += 0.05
      if (!/[。？！]$/.test(text)) confidence += 0.02

      return {
        matched: true,
        role: 'heading-3',
        confidence: Math.min(1.0, confidence),
        ruleId: this.id,
        reason
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
