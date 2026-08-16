import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class AttachmentRule implements IRule {
  readonly id = 'rule-attachment'
  readonly name = '附件标识规则'
  readonly priority = 15

  // Regex matches 附件, 附件：, 附件1：, 附件一：, 附件 1： etc.
  private markerRegex = /^附件\s*(?:[一二三四五六七八九十百零〇\d]+)?\s*[：:]?\s*(.*)$/

  evaluate(paragraph: ParagraphModel, context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()
    const match = text.match(this.markerRegex)

    if (match) {
      const rest = match[1] || ''
      const reasons = ['匹配“附件”关键词标识']
      let confidence = 0.95

      if (rest.length > 0) {
        reasons.push(`包含附件标题描述：“${rest.slice(0, 30)}”`)
      }

      return {
        matched: true,
        role: 'attachment-marker',
        confidence,
        ruleId: this.id,
        reason: reasons
      }
    }

    // Check if previous paragraph was an attachment marker e.g.:
    // 附件：
    // 1. 2026年小微风险台账
    if (context.previousParagraph) {
      const prevText = context.previousParagraph.normalizedText.trim()
      if (/^附件\s*[：:]?$/.test(prevText) && /^(\d+|[一二三四五六七八九十]+)[.、．]/.test(text)) {
        return {
          matched: true,
          role: 'attachment-title',
          confidence: 0.92,
          ruleId: this.id,
          reason: ['紧随“附件：”标识之后的附件条目']
        }
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
