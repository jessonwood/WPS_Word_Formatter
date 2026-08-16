import type { DocumentModel } from '../../types/document'
import type { RecognitionResult } from '../../types/recognition'
import type { FormatTemplate } from '../../types/template'
import type { StructureIssue, DocumentHealthScore } from '../../types/audit'
import type { CleanupIssue } from '../../types/cleanup'

export class StructureScoreCalculator {
  /**
   * Calculate 7-dimensional health score
   */
  calculate(
    doc: DocumentModel,
    recognition?: RecognitionResult[],
    template?: FormatTemplate,
    structureIssues: StructureIssue[] = [],
    cleanupIssues: CleanupIssue[] = []
  ): DocumentHealthScore {
    // 1. Structure Score (Weight: 25%)
    let structureScore = 100
    for (const issue of structureIssues) {
      if (issue.type === 'heading-level-jump') structureScore -= 15
      else if (issue.type === 'orphan-heading') structureScore -= 10
      else if (issue.type === 'empty-section') structureScore -= 10
    }
    structureScore = Math.max(0, Math.min(100, structureScore))

    // 2. Headings Score (Weight: 15%)
    let headingsScore = 100
    for (const issue of structureIssues) {
      if (issue.type === 'heading-number-duplicate') headingsScore -= 12
      else if (issue.type === 'heading-number-gap') headingsScore -= 10
      else if (issue.type === 'duplicate-heading-text') headingsScore -= 6
      else if (issue.type === 'heading-ends-with-period') headingsScore -= 4
      else if (issue.type === 'heading-too-long') headingsScore -= 3
    }
    headingsScore = Math.max(0, Math.min(100, headingsScore))

    // 3. Tables & Objects Score (Weight: 10%)
    let tablesScore = 100
    for (const issue of structureIssues) {
      if (issue.type === 'caption-without-table') tablesScore -= 12
      else if (issue.type === 'table-without-caption') tablesScore -= 10
      else if (issue.type === 'caption-without-image') tablesScore -= 8
      else if (issue.type === 'image-without-caption') tablesScore -= 6
      else if (issue.type === 'attachment-marker-without-title') tablesScore -= 8
      else if (issue.type === 'attachment-title-without-content') tablesScore -= 8
    }
    tablesScore = Math.max(0, Math.min(100, tablesScore))

    // 4. Page Layout Score (Weight: 10%)
    let pageLayoutScore = 100
    if (template && doc.sections && doc.sections.length > 0) {
      const sec1 = doc.sections[0]
      const tPage = template.page
      if (sec1.topMargin && Math.abs(sec1.topMargin - tPage.topMarginPt) > 2) pageLayoutScore -= 10
      if (sec1.leftMargin && Math.abs(sec1.leftMargin - tPage.leftMarginPt) > 2) pageLayoutScore -= 10
      if (sec1.orientation && sec1.orientation !== tPage.orientation) pageLayoutScore -= 15
    }
    pageLayoutScore = Math.max(0, Math.min(100, pageLayoutScore))

    // 5. Cleanup Score (Weight: 5%)
    let cleanupScore = 100
    const cleanupPenalty = cleanupIssues.length * 3
    cleanupScore = Math.max(0, Math.min(100, 100 - cleanupPenalty))

    // 6. Formatting Score (Weight: 35%)
    let formattingScore = 90
    if (recognition && recognition.length > 0) {
      const lowConfCount = recognition.filter(p => (p.confidence || 1) < 0.7).length
      formattingScore -= lowConfCount * 4
    }
    formattingScore = Math.max(0, Math.min(100, formattingScore))

    // 7. Overall Score (Weighted Sum)
    const overall = Math.round(
      formattingScore * 0.35 +
      structureScore * 0.25 +
      headingsScore * 0.15 +
      tablesScore * 0.10 +
      pageLayoutScore * 0.10 +
      cleanupScore * 0.05
    )

    return {
      overall: Math.max(0, Math.min(100, overall)),
      formatting: formattingScore,
      structure: structureScore,
      headings: headingsScore,
      tables: tablesScore,
      pageLayout: pageLayoutScore,
      cleanup: cleanupScore
    }
  }
}
