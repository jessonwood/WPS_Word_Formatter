import type { DocumentModel } from '../../types/document'
import type { FormatTemplate } from '../../types/template'
import type { RecognitionResult, ParagraphRole } from '../../types/recognition'
import type { FormatScope } from '../../types/formatting'
import type { FormatPlan, FormatApplyStrategy } from '../../types/planning'
import { FormatPlanBuilder } from './FormatPlanBuilder'
import { logger } from '@/shared/logger/logger'

export class DryRunEngine {
  /**
   * Perform dry-run preview: purely generates FormatPlan without mutating document
   */
  static preview(params: {
    document: DocumentModel
    recognition: RecognitionResult[]
    userOverrides?: Record<number, ParagraphRole>
    template: FormatTemplate
    strategy?: FormatApplyStrategy
    scope?: FormatScope
  }): FormatPlan {
    const startTime = Date.now()
    const plan = FormatPlanBuilder.buildPlan(params)
    const duration = Date.now() - startTime

    logger.info(
      'DryRunEngine',
      `[PLAN] strategy=${plan.strategy} totalChanges=${plan.summary.totalChanges} affectedParagraphs=${plan.summary.affectedParagraphs} skippedCompliant=${plan.summary.skippedAlreadyCompliant} (${duration}ms)`
    )

    return plan
  }
}
