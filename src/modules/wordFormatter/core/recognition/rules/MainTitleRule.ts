import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'

export class MainTitleRule implements IRule {
  readonly id = 'rule-main-title'
  readonly name = '主标题识别规则'
  readonly priority = 50

  evaluate(paragraph: ParagraphModel, context: RuleContext): RuleEvaluation {
    // Only inspect first 8 non-empty paragraphs
    if (context.nonEmptyIndex > 8) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    const text = paragraph.normalizedText.trim()
    if (text.length < 2 || text.length > 80) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    // Exclude if matches heading numbering
    if (/^[一二三四五六七八九十百零〇]+[、．.]/.test(text) || /^[（(][一二三四五六七八九十百零〇\d]+[）)]/.test(text) || /^\d+[.．、]/.test(text)) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    // Exclude pure date pattern
    if (/^\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?$/.test(text)) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    // Exclude recipient pattern e.g. 各分行、各直属机构：
    if (/[：:]\s*$/.test(text) && (text.includes('各') || text.includes('部门') || text.includes('分行') || text.includes('单位'))) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    let score = 0
    const reasons: string[] = []

    // 1. Position score
    if (context.nonEmptyIndex === 1) {
      score += 35
      reasons.push('文档首个非空段落 (+35)')
    } else if (context.nonEmptyIndex <= 3) {
      score += 20
      reasons.push(`位于文档前部非空段落(第${context.nonEmptyIndex}段) (+20)`)
    }

    // 2. Alignment score
    if (paragraph.alignment === 'center') {
      score += 30
      reasons.push('段落居中对齐 (+30)')
    }

    // 3. Font size / bold score
    if (paragraph.fontSize && paragraph.fontSize >= 18) {
      score += 20
      reasons.push(`大字号排版(${paragraph.fontSize}pt) (+20)`)
    } else if (paragraph.fontSize && paragraph.fontSize >= 16) {
      score += 10
      reasons.push(`字号较大(${paragraph.fontSize}pt) (+10)`)
    }

    if (paragraph.bold) {
      score += 10
      reasons.push('加粗字体 (+10)')
    }

    // 4. Punctuation
    if (!/[。？！；]$/.test(text)) {
      score += 10
      reasons.push('段尾无句号/分号 (+10)')
    }

    // 5. Keyword boost (通知、报告、方案、意见、规定、办法、规划等)
    if (/(?:报告|通知|方案|意见|办法|规定|决议|通报|纪要|总结|规划|细则|制度|公报|通告|公告)$/.test(text) || text.includes('关于')) {
      score += 15
      reasons.push('包含标准公文/报告标题关键词 (+15)')
    }

    if (score >= 60 && !context.hasDetectedMainTitle) {
      const confidence = Math.min(0.99, 0.65 + (score / 200))
      return {
        matched: true,
        role: 'main-title',
        confidence,
        ruleId: this.id,
        reason: reasons
      }
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
