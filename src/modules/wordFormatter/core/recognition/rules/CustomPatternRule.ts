import type { IRule, RuleContext } from './BaseRule'
import type { ParagraphModel } from '../../../types/document'
import type { RuleEvaluation } from '../../../types/recognition'
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
        return {
          matched: true,
          role: this.ruleConfig.role,
          confidence: 0.98, // High confidence for explicit user-defined regex
          ruleId: this.id,
          reason: [
            `命中用户自定义规则「${this.ruleConfig.name}」`,
            `正则表达式：/${this.ruleConfig.pattern}/`,
            `匹配文本：“${text.slice(0, 35)}${text.length > 35 ? '...' : ''}”`
          ]
        }
      }
    } catch (err) {
      logger.warn('CustomPatternRule', `Invalid regex pattern in custom rule "${this.ruleConfig.name}": ${this.ruleConfig.pattern}`, err)
    }

    return { matched: false, role: 'unknown', confidence: 0, ruleId: this.id, reason: [] }
  }
}
