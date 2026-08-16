import type { DocumentModel } from '../../types/document'
import type { RecognitionResult } from '../../types/recognition'
import type { FormatTemplate } from '../../types/template'
import type { AuditReport, AuditIssue } from '../../types/formatting'
import { StructureAuditEngine } from './StructureAuditEngine'
import { StructureScoreCalculator } from './StructureScoreCalculator'
import { CleanupScanner } from '../cleanup/CleanupScanner'
import { logger } from '@/shared/logger/logger'

export class DocumentAuditor {
  private static structureAuditEngine = new StructureAuditEngine()
  private static scoreCalculator = new StructureScoreCalculator()
  private static cleanupScanner = new CleanupScanner()

  /**
   * Perform comprehensive document health audit and compute multi-dimensional health score
   */
  static audit(
    document: DocumentModel,
    recognition: RecognitionResult[],
    template: FormatTemplate
  ): AuditReport {
    logger.info('DocumentAuditor', 'Starting pre-format document health audit...')
    const issues: AuditIssue[] = []
    let score = 100

    const paragraphs = document.paragraphs || []
    const totalP = paragraphs.length

    // 1. Run V2.3 Structure Audit Engine
    const structureIssues = this.structureAuditEngine.audit(document, recognition)

    // 2. Run V2.3 Cleanup Scanner
    const cleanupIssues = this.cleanupScanner.scan(document)

    // 3. Consecutive Blank Lines Audit
    let consecutiveBlankCount = 0
    let totalRedundantBlanks = 0

    for (let i = 0; i < totalP; i++) {
      const p = paragraphs[i]
      if (p.isEmpty) {
        consecutiveBlankCount++
        if (consecutiveBlankCount > 1) {
          totalRedundantBlanks++
        }
      } else {
        consecutiveBlankCount = 0
      }
    }

    if (totalRedundantBlanks > 0) {
      const deduction = Math.min(20, totalRedundantBlanks * 3)
      score -= deduction
      issues.push({
        id: 'issue-redundant-blanks',
        category: 'blank-lines',
        title: '存在多余连续空行',
        description: `文档中检测到 ${totalRedundantBlanks} 处多余连续空行，影响版面整洁度`,
        severity: totalRedundantBlanks > 5 ? 'high' : 'medium',
        count: totalRedundantBlanks
      })
    }

    // 4. Heading Outline Levels & Hierarchy Audit
    let missingOutlineCount = 0
    let headingCount = 0

    for (const rec of recognition) {
      if (rec.role.startsWith('heading-')) {
        headingCount++
        const p = paragraphs.find(para => para.index === rec.paragraphIndex)
        if (p && (!p.outlineLevel || p.outlineLevel >= 10)) {
          missingOutlineCount++
        }
      }
    }

    if (headingCount > 0 && missingOutlineCount > 0) {
      const deduction = Math.min(25, missingOutlineCount * 4)
      score -= deduction
      issues.push({
        id: 'issue-missing-outline',
        category: 'headings',
        title: '标题缺失原生大纲级别',
        description: `发现 ${missingOutlineCount} 处层级标题未设置大纲级别，导致导航窗格无法生成目录`,
        severity: 'high',
        count: missingOutlineCount
      })
    }

    // 5. Body Indents & Formatting Audit
    let unindentedBodyCount = 0
    let bodyCount = 0
    const targetIndentChars = template?.body?.firstLineIndentChars ?? 2

    for (const rec of recognition) {
      if (rec.role === 'body') {
        bodyCount++
        const p = paragraphs.find(para => para.index === rec.paragraphIndex)
        if (p && !p.isEmpty) {
          let indent = p.firstLineIndentChars
          if (indent === undefined || indent === 0) {
            if (p.firstLineIndent && p.firstLineIndent > 0) {
              indent = p.firstLineIndent / (p.fontSize || 16)
            }
          }
          if (indent === undefined || indent === 0) {
            const raw = p.rawText || p.text || ''
            if (/^\u3000{2}/.test(raw) || /^ {4}/.test(raw)) {
              indent = 2
            }
          }

          const effectiveIndent = indent ?? 0
          const isCompliant = Math.abs(effectiveIndent - targetIndentChars) <= 0.5 ||
            (targetIndentChars === 2 && effectiveIndent >= 1.4 && effectiveIndent <= 2.6)

          if (!isCompliant) {
            unindentedBodyCount++
          }
        }
      }
    }

    if (bodyCount > 0 && unindentedBodyCount > 0) {
      const deduction = Math.min(20, Math.ceil((unindentedBodyCount / bodyCount) * 20))
      score -= deduction
      issues.push({
        id: 'issue-body-indents',
        category: 'body',
        title: '正文首行缩进不规范',
        description: `约 ${unindentedBodyCount} 段正文未规范设置为标准首行缩进 ${targetIndentChars} 字符`,
        severity: 'medium',
        count: unindentedBodyCount
      })
    }

    // 6. Tables Standard Three-line & Alignment Audit
    const tables = document.tables || []
    if (tables.length > 0) {
      let nonStandardTables = 0
      for (const t of tables) {
        if (t.rowCount > 0 && t.columnCount > 0) {
          nonStandardTables++
        }
      }

      if (nonStandardTables > 0) {
        const deduction = Math.min(15, nonStandardTables * 5)
        score -= deduction
        issues.push({
          id: 'issue-nonstandard-tables',
          category: 'tables',
          title: '表格非标准三线表规范',
          description: `文档包含 ${nonStandardTables} 个表格未采用顶底 1.5pt、表头 0.75pt 的标准三线表`,
          severity: 'medium',
          count: nonStandardTables
        })
      }
    }

    // 7. Page Margins Audit
    const sections = document.sections || []
    if (sections.length > 0) {
      const firstSec = sections[0]
      if (firstSec.topMargin !== undefined && firstSec.leftMargin !== undefined && template?.page) {
        const topDiff = Math.abs((firstSec.topMargin || 0) - template.page.topMarginPt)
        const leftDiff = Math.abs((firstSec.leftMargin || 0) - template.page.leftMarginPt)
        if (topDiff > 5 || leftDiff > 5) {
          score -= 10
          issues.push({
            id: 'issue-page-margins',
            category: 'page',
            title: '页面边距未对齐模板规范',
            description: `当前文档边距偏离模板标准，建议一键应用标准版心`,
            severity: 'low',
            count: 1
          })
        }
      }
    }

    // 8. Calculate 7-dimensional health scores
    const healthScore = this.scoreCalculator.calculate(
      document,
      recognition,
      template,
      structureIssues,
      cleanupIssues
    )

    const finalScore = healthScore.overall

    let grade: 'excellent' | 'good' | 'average' | 'poor' = 'excellent'
    if (finalScore < 60) grade = 'poor'
    else if (finalScore < 80) grade = 'average'
    else if (finalScore < 95) grade = 'good'

    const totalIssuesCount = issues.length + structureIssues.length + cleanupIssues.length

    logger.info('DocumentAuditor', `Audit completed: Overall Score = ${finalScore} (${grade}), Total issues = ${totalIssuesCount}`)

    return {
      score: finalScore,
      grade,
      totalIssues: totalIssuesCount,
      issues,
      auditTime: Date.now(),
      healthScore,
      structureIssues
    }
  }
}
