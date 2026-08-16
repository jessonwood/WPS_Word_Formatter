import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class TableCaptionRule implements IRule {
  readonly id = 'rule-table-caption'
  readonly name = '表格标题规则'
  readonly priority = 25

  private regex = /^表\s*([一二三四五六七八九十\d]+(?:[-—–]\d+)?)\s*[:：、\s]?\s*(.*)$/

  evaluate(paragraph: ParagraphModel, context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()
    const match = text.match(this.regex)

    if (match) {
      const rest = match[2] || ''
      
      // Exclude body cross-reference sentences like "表1显示我行小微贷款余额在6月末突破历史新高。"
      if (text.length > 40 && /[，。！？；]/.test(rest)) {
        return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
      }

      const reasons = [`匹配表格标题编号（表${match[1]}）`]
      let confidence = 0.88

      // Check if adjacent to a table in the document
      const isNearTable = context.document.tables.some(t => {
        return Math.abs((t.previousParagraphIndex || 0) - paragraph.index) <= 2 ||
               Math.abs((t.nextParagraphIndex || 0) - paragraph.index) <= 2
      })

      if (isNearTable) {
        confidence = 0.98
        reasons.push('段落临近实际文档表格对象 (+10)')
      }

      if (paragraph.alignment === 'center') {
        confidence = Math.min(1.0, confidence + 0.05)
        reasons.push('居中对齐')
      }

      return {
        matched: true,
        role: 'table-caption',
        confidence,
        ruleId: this.id,
        reason: reasons
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
