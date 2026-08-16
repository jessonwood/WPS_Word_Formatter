import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class SubtitleRule implements IRule {
  readonly id = 'rule-subtitle'
  readonly name = '副标题识别规则'
  readonly priority = 60

  evaluate(paragraph: ParagraphModel, context: RuleContext): RuleEvaluation {
    if (!context.hasDetectedMainTitle || context.nonEmptyIndex > 10) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    const text = paragraph.normalizedText.trim()
    if (text.length < 2 || text.length > 80) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    // Exclude heading numbers
    if (/^[一二三四五六七八九十百零〇]+[、．.]/.test(text) || /^[（(][一二三四五六七八九十百零〇\d]+[）)]/.test(text) || /^\d+[.．、]/.test(text)) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    const reasons: string[] = []
    let confidence = 0

    // Check explicit subtitle dash pattern e.g. ——在2026年全行工作会议上的讲话
    if (/^——|^--|^——/.test(text)) {
      confidence = 0.96
      reasons.push('以破折号“——”开头，符合公文/讲话副标题标准特征')
    } else if (/^[\(（〔\[]\s*(?:20\d\d|\d{4})\s*[\)）〕\]]/.test(text) || /^[^\s]+〔20\d\d〕\d+号/.test(text)) {
      // Document reference number like 银发〔2026〕18号
      confidence = 0.90
      reasons.push('符合发文字号/副标题特征')
    } else if (paragraph.alignment === 'center' && context.previousParagraph) {
      // Centered short line right after main title
      confidence = 0.82
      reasons.push('紧随主标题之后居中排列')
    }

    if (confidence >= 0.70) {
      return {
        matched: true,
        role: 'subtitle',
        confidence,
        ruleId: this.id,
        reason: reasons
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
