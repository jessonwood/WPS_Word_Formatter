import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation, InlineRoleRange } from '../../../types/recognition'
import type { CustomRecognitionRule } from '../../../types/template'
import { logger } from '@/shared/logger/logger'

export class CustomPatternRule implements IRule {
  readonly id: string
  readonly name: string
  readonly priority = 5 // Highest priority over built-in rules (lower number = higher priority in sorting or evaluated first)

  constructor(private ruleConfig: CustomRecognitionRule) {
    this.id = `custom-rule-${ruleConfig.id}`
    this.name = `自定义规则: ${ruleConfig.name}`
  }

  evaluate(paragraph: ParagraphModel, _context: RuleContext): RuleEvaluation {
    if (!this.ruleConfig.enabled || !this.ruleConfig.pattern) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    const text = paragraph.normalizedText.trim()
    if (!text) {
      return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
    }

    try {
      const regex = new RegExp(this.ruleConfig.pattern)
      const match = text.match(regex)

      if (match) {
        let inlineRanges: InlineRoleRange[] | undefined
        const articleMatch = this.ruleConfig.role === 'heading-2'
          ? text.match(/^(第[一二三四五六七八九十百千零〇]+条)([ \u3000]+)(.+)$/)
          : null
        if (articleMatch) {
          const headingLen = articleMatch[1].length
          inlineRanges = [
            { startOffset: 0, endOffset: headingLen, role: 'heading-2', text: articleMatch[1] },
            { startOffset: headingLen, endOffset: text.length, role: 'body', text: text.slice(headingLen) }
          ]
        }

        return {
          matched: true,
          role: this.ruleConfig.role,
          confidence: inlineRanges ? 0.99 : 0.98,
          ruleId: this.id,
          reason: [
            `命中用户自定义规则「${this.ruleConfig.name}」`,
            `正则表达式：/${this.ruleConfig.pattern}/`,
            `匹配文本：“${text.slice(0, 35)}${text.length > 35 ? '...' : ''}”`,
            ...(inlineRanges ? ['识别为“第×条 + 空格 + 正文”的同段二级标题，保留分界空格'] : [])
          ],
          inlineRanges
        }
      }
    } catch (err) {
      logger.warn('CustomPatternRule', `Invalid regex pattern in custom rule "${this.ruleConfig.name}": ${this.ruleConfig.pattern}`, err)
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
