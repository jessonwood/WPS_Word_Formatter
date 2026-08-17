import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation, InlineRoleRange } from '../../../types/recognition'

export class Heading2Rule implements IRule {
  readonly id = 'heading-cn-2'
  readonly name = '中文二级标题规则'
  readonly priority = 20

  // Regex matches （一）, (一), （十一）, (十一) etc.
  private regex = /^[（(][一二三四五六七八九十百零〇]+[）)]\s*(.*)$/
  // Clause-style inline heading: 第×条 + at least one half/full-width space + body.
  private articleInlineRegex = /^(第[一二三四五六七八九十百千零〇]+条)([ \u3000]+)(.+)$/

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    const text = paragraph.normalizedText.trim()

    const articleMatch = text.match(this.articleInlineRegex)
    if (articleMatch) {
      const headingText = articleMatch[1]
      const headingLen = headingText.length
      return {
        matched: true,
        role: 'heading-2',
        confidence: 0.99,
        ruleId: this.id,
        reason: ['匹配“第×条 + 空格 + 正文”的同段二级标题结构，空格作为标题与正文边界保留'],
        inlineRanges: [
          { startOffset: 0, endOffset: headingLen, role: 'heading-2', text: headingText },
          { startOffset: headingLen, endOffset: text.length, role: 'body', text: text.slice(headingLen) }
        ]
      }
    }

    const match = text.match(this.regex)

    if (match) {
      const rest = match[1] || ''
      const reason = ['匹配中文二级标题编号（如“（一）”、“（十一）”）']
      let confidence = 0.95

      // Check if this paragraph contains inline body (二级标题与正文同段)
      // Example: （一）风险总体可控。截至6月末，全行……
      // Or: （一）基本情况：本报告主要...
      const inlineRanges: InlineRoleRange[] = []
      
      // Look for first sentence boundary (。 or ： or ；) if text is long
      const punctIndex = rest.search(/[。：；\n]/)

      if (punctIndex !== -1 && rest.length > 25) {
        // Heading boundary includes the delimiter
        const headingLen = (text.length - rest.length) + punctIndex + 1
        const headingText = text.slice(0, headingLen)
        const bodyText = text.slice(headingLen)

        inlineRanges.push({
          startOffset: 0,
          endOffset: headingLen,
          role: 'heading-2',
          text: headingText
        })

        inlineRanges.push({
          startOffset: headingLen,
          endOffset: text.length,
          role: 'body',
          text: bodyText
        })

        reason.push(`检测到“二级标题与正文同段”结构：标题部分[0..${headingLen}]，正文部分[${headingLen}..${text.length}]`)
        confidence = 0.98
      } else {
        reason.push(`独立二级标题：“${text.slice(0, 30)}”`)
      }

      return {
        matched: true,
        role: 'heading-2',
        confidence,
        ruleId: this.id,
        reason,
        inlineRanges: inlineRanges.length > 0 ? inlineRanges : undefined
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
