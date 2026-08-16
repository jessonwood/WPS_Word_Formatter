import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class FigureCaptionRule implements IRule {
  readonly id = 'rule-figure-caption'
  readonly name = '图片/图表标题规则'
  readonly priority = 26

  private regex = /^图\s*([一二三四五六七八九十\d]+(?:[-—–]\d+)?)\s*[:：、\s]?\s*(.*)$/

  evaluate(paragraph: ParagraphModel, context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()
    const match = text.match(this.regex)

    if (match) {
      const rest = match[2] || ''

      // Exclude body sentences like "图1显示信贷增速呈现回升态势，主要得益于政策支持。"
      if (text.length > 40 && /[，。！？；]/.test(rest)) {
        return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
      }

      const reasons = [`匹配图表标题编号（图${match[1]}）`]
      let confidence = 0.88

      // Check if adjacent paragraph has image / shape
      const prevHasImg = context.previousParagraph?.hasImage || context.previousParagraph?.hasShape
      const nextHasImg = context.nextParagraph?.hasImage || context.nextParagraph?.hasShape

      if (prevHasImg || nextHasImg) {
        confidence = 0.98
        reasons.push('临近包含图片/Shape对象的段落')
      }

      if (paragraph.alignment === 'center') {
        confidence = Math.min(1.0, confidence + 0.05)
        reasons.push('居中对齐')
      }

      return {
        matched: true,
        role: 'figure-caption',
        confidence,
        ruleId: this.id,
        reason: reasons
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
