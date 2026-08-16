import type { IRule, RuleContext } from './rules/BaseRule'
import { BlankRule } from './rules/BlankRule'
import { AttachmentRule } from './rules/AttachmentRule'
import { Heading1Rule } from './rules/Heading1Rule'
import { Heading2Rule } from './rules/Heading2Rule'
import { Heading3Rule } from './rules/Heading3Rule'
import { Heading4Rule } from './rules/Heading4Rule'
import { TableCaptionRule } from './rules/TableCaptionRule'
import { FigureCaptionRule } from './rules/FigureCaptionRule'
import { MainTitleRule } from './rules/MainTitleRule'
import { SubtitleRule } from './rules/SubtitleRule'
import { BodyRule } from './rules/BodyRule'
import type { ParagraphModel } from '../../types/document'
import type { RuleEvaluation } from '../../types/recognition'

import type { CustomRecognitionRule } from '../../types/template'
import { CustomPatternRule } from './rules/CustomPatternRule'

export class RuleEngine {
  private rules: IRule[] = []

  constructor() {
    this.registerDefaultRules()
  }

  private registerDefaultRules() {
    this.rules = [
      new BlankRule(),
      new AttachmentRule(),
      new Heading1Rule(),
      new Heading2Rule(),
      new Heading3Rule(),
      new Heading4Rule(),
      new TableCaptionRule(),
      new FigureCaptionRule(),
      new MainTitleRule(),
      new SubtitleRule(),
      new BodyRule()
    ].sort((a, b) => a.priority - b.priority)
  }

  evaluateParagraph(paragraph: ParagraphModel, context: RuleContext, customRules?: CustomRecognitionRule[]): RuleEvaluation {
    // 1. Evaluate enabled custom rules with highest priority
    if (customRules && customRules.length > 0) {
      for (const cr of customRules) {
        if (cr.enabled && cr.pattern) {
          const ruleInstance = new CustomPatternRule(cr)
          const evalResult = ruleInstance.evaluate(paragraph, context)
          if (evalResult.matched) {
            return evalResult
          }
        }
      }
    }

    // 2. Evaluate built-in heuristic rules
    for (const rule of this.rules) {
      const evalResult = rule.evaluate(paragraph, context)
      if (evalResult.matched) {
        return evalResult
      }
    }

    return {
      matched: true,
      role: 'body',
      confidence: 0.7,
      ruleId: 'fallback-body',
      reason: ['默认兜底为正文']
    }
  }
}
