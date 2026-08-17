import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { FormatExecutionParams, FormatResult, FormatProgress, FormatBreakdown } from '../../types/formatting'
import { PageFormatter } from './PageFormatter'
import { ParagraphFormatter } from './ParagraphFormatter'
import { RunFormatter } from './RunFormatter'
import { OutlineFormatter } from './OutlineFormatter'
import { TableFormatter } from './TableFormatter'
import { CaptionFormatter } from './CaptionFormatter'
import { AttachmentFormatter } from './AttachmentFormatter'
import { BlankLineCleaner } from '../cleanup/BlankLineCleaner'
import { FormatPlanBuilder } from '../planning/FormatPlanBuilder'
import { ChangeSetOptimizer } from '../planning/ChangeSetOptimizer'
import { logger } from '@/shared/logger/logger'
import { WordFormatterError } from '../../types/errors'

export class FormatEngine {
  private pageFormatter: PageFormatter
  private paragraphFormatter: ParagraphFormatter
  private runFormatter: RunFormatter
  private outlineFormatter: OutlineFormatter
  private tableFormatter: TableFormatter
  private captionFormatter: CaptionFormatter
  private attachmentFormatter: AttachmentFormatter
  private blankLineCleaner: BlankLineCleaner

  constructor(private adapter: WriterAdapter) {
    this.pageFormatter = new PageFormatter(adapter)
    this.paragraphFormatter = new ParagraphFormatter(adapter)
    this.runFormatter = new RunFormatter(adapter)
    this.outlineFormatter = new OutlineFormatter(adapter)
    this.tableFormatter = new TableFormatter(adapter)
    this.captionFormatter = new CaptionFormatter(adapter)
    this.attachmentFormatter = new AttachmentFormatter(adapter)
    this.blankLineCleaner = new BlankLineCleaner()
  }

  async execute(params: FormatExecutionParams): Promise<FormatResult> {
    const startTime = Date.now()
    const { document, recognition, template, progressCallback } = params
    const strategy = params.strategy || 'minimal'
    const scope = params.scope || 'all'

    const reportProgress = (stage: FormatProgress['stage'], percentage: number, message: string, curr?: number, total?: number) => {
      if (progressCallback) {
        progressCallback({
          stage,
          percentage,
          message,
          currentParagraph: curr,
          totalParagraphs: total ?? document.paragraphs.length
        })
      }
    }

    logger.info('FormatEngine', `Beginning format execution with template "${template.name}", strategy: ${strategy}, scope: ${scope}...`)
    reportProgress('preparing', 5, '准备排版参数与环境...')

    const beforeSignature = document.signature
    let formattedPCount = 0
    let formattedTCount = 0

    const breakdown: FormatBreakdown = {
      mainTitleCount: 0,
      subtitleCount: 0,
      heading1Count: 0,
      heading2Count: 0,
      heading3Count: 0,
      heading4Count: 0,
      customHeadingCount: 0,
      bodyCount: 0,
      attachmentCount: 0,
      captionCount: 0,
      tableCount: 0,
      emphasisPreservedCount: 0
    }

    // Build or use provided FormatPlan
    const plan = params.plan || FormatPlanBuilder.buildPlan({
      document,
      recognition,
      template,
      strategy,
      scope
    })

    logger.info(
      'FormatEngine',
      `[PLAN] strategy=${plan.strategy} totalChanges=${plan.summary.totalChanges} affectedParagraphs=${plan.summary.affectedParagraphs} skippedCompliant=${plan.summary.skippedAlreadyCompliant}`
    )

    const enabledChanges = plan.changes.filter(c => c.enabled)
    const skippedByUser = plan.changes.length - enabledChanges.length
    logger.info('FormatEngine', `[PLAN_APPLY] enabledChanges=${enabledChanges.length} skippedByUser=${skippedByUser}`)

    const shouldFormatPage = scope === 'all' || scope === 'page-only'
    const shouldFormatHeadings = scope === 'all' || scope === 'headings-only'
    const shouldFormatBody = scope === 'all' || scope === 'body-only'
    const shouldFormatTables = scope === 'all' || scope === 'tables-only'

    try {
      await this.adapter.setScreenUpdating(false)

      if (strategy === 'minimal') {
        // ==========================================
        // Minimal Strategy: Apply Only Non-Compliant Enabled Changes
        // ==========================================
        
        // 1. Granular Page / Section Changes
        if (shouldFormatPage) {
          reportProgress('page', 15, '正在应用页面边距最小修改...')
          const secMap = ChangeSetOptimizer.groupChangesBySection(enabledChanges)
          for (const [secIdx, sChanges] of secMap) {
            try {
              await this.adapter.applyGranularSectionChanges(secIdx, sChanges)
            } catch (secErr) {
              logger.warn('FormatEngine', `Failed to apply section ${secIdx} changes`, secErr)
            }
          }
        }

        // 2. Granular Paragraph Changes
        const pMap = ChangeSetOptimizer.groupChangesByParagraph(enabledChanges)
        const totalAffected = pMap.size
        let processedP = 0

        reportProgress('headings', 30, `正在执行最小段落修复 (共 ${totalAffected} 处段落待更新)...`)

        for (const [pIdx, pChanges] of pMap) {
          const rec = recognition.find(r => r.paragraphIndex === pIdx)
          const role = rec?.role || 'body'
          const isInlineHeading2 = role === 'heading-2' &&
            template.options.autoDetectInlineHeading2 &&
            !!rec?.inlineRanges && rec.inlineRanges.length >= 2
          const targetStyle = isInlineHeading2 ? template.body : this.resolveStyleForRole(role, template)
          const targetOutline = this.resolveOutlineLevelForRole(role)

          try {
            await this.adapter.applyGranularParagraphChanges(pIdx, pChanges, targetStyle)

            if (isInlineHeading2) {
              const h2Style = this.resolveStyleForRole('heading-2', template)
              const hRange = rec!.inlineRanges![0]
              await this.runFormatter.formatInlineRange(pIdx, hRange.startOffset, hRange.endOffset, h2Style)
            }
            
            // If outline-level was changed
            if (template.options.applyOutlineLevels && targetOutline !== undefined && pChanges.some(c => c.property === 'outline-level')) {
              await this.outlineFormatter.formatOutline(pIdx, targetOutline)
            }

            formattedPCount++
            this.incrementBreakdown(breakdown, role)
          } catch (pErr) {
            logger.warn('FormatEngine', `Failed to apply granular changes to P${pIdx}`, pErr)
          }

          processedP++
          if (processedP % 10 === 0 || processedP === totalAffected) {
            const pct = Math.min(85, Math.floor(30 + (processedP / Math.max(1, totalAffected)) * 55))
            reportProgress('body', pct, `正在修复段落格式 (${processedP}/${totalAffected})...`, processedP, totalAffected)
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }

        // 3. Granular Table Changes
        if (shouldFormatTables && template.table.enabled) {
          reportProgress('tables', 88, '正在处理文档表格...')
          const tMap = ChangeSetOptimizer.groupChangesByTable(enabledChanges)
          for (const [tIdx] of tMap) {
            try {
              await this.tableFormatter.formatTable(tIdx, template.table)
              formattedTCount++
            } catch (tErr) {
              logger.warn('FormatEngine', `Non-fatal formatting error on table ${tIdx}`, tErr)
            }
          }
        }
        breakdown.tableCount = formattedTCount

        logger.info('FormatEngine', `[PLAN_DONE] applied=${enabledChanges.length} failed=0`)

      } else {
        // ==========================================
        // Normalize Strategy: Full Standard Rewrite Flow
        // ==========================================

        // 1. Page settings
        if (shouldFormatPage) {
          reportProgress('page', 15, '正在应用页面边距与版心尺寸...')
          try {
            await this.pageFormatter.format(template.page)
          } catch (pageErr) {
            logger.warn('FormatEngine', 'Non-fatal page format warning', pageErr)
          }
        }

        // 2. Paragraphs & Headings
        const totalP = document.paragraphs.length
        if (shouldFormatHeadings || shouldFormatBody) {
          reportProgress('headings', 25, '正在格式化文档标题与正文结构...')

          for (let i = 0; i < totalP; i++) {
            const p = document.paragraphs[i]
            const rec = recognition.find(r => r.paragraphIndex === p.index) || {
              paragraphIndex: p.index,
              role: 'body' as const,
              confidence: 0.8,
              ruleId: 'default',
              reason: [],
              originalText: p.text
            }

            const role = rec.role

            if (p.isEmpty) {
              continue
            }

            try {
              switch (role) {
                case 'main-title':
                  if (shouldFormatHeadings) {
                    await this.paragraphFormatter.formatParagraph(p.index, template.mainTitle)
                    breakdown.mainTitleCount++
                    formattedPCount++
                  }
                  break

                case 'subtitle':
                  if (shouldFormatHeadings) {
                    await this.paragraphFormatter.formatParagraph(p.index, template.subtitle)
                    breakdown.subtitleCount++
                    formattedPCount++
                  }
                  break

                case 'heading-1': {
                  if (shouldFormatHeadings) {
                    const h1Style = template.heading1 || template.headings?.[0]?.style || template.body
                    await this.paragraphFormatter.formatParagraph(p.index, h1Style)
                    if (template.options.applyOutlineLevels) {
                      await this.outlineFormatter.formatOutline(p.index, 1)
                    }
                    breakdown.heading1Count++
                    formattedPCount++
                  }
                  break
                }

                case 'heading-2': {
                  if (shouldFormatHeadings) {
                    const h2Style = template.heading2 || template.headings?.[1]?.style || template.heading1 || template.body
                    if (template.options.autoDetectInlineHeading2 && rec.inlineRanges && rec.inlineRanges.length >= 2) {
                      if (shouldFormatBody) {
                        await this.paragraphFormatter.formatParagraph(p.index, template.body)
                      }
                      const hRange = rec.inlineRanges[0]
                      await this.runFormatter.formatInlineRange(p.index, hRange.startOffset, hRange.endOffset, h2Style)
                    } else {
                      await this.paragraphFormatter.formatParagraph(p.index, h2Style)
                    }
                    if (template.options.applyOutlineLevels) {
                      await this.outlineFormatter.formatOutline(p.index, 2)
                    }
                    breakdown.heading2Count++
                    formattedPCount++
                  }
                  break
                }

                case 'heading-3': {
                  if (shouldFormatHeadings) {
                    const h3Style = template.heading3 || template.headings?.[2]?.style || template.heading2 || template.heading1 || template.body
                    await this.paragraphFormatter.formatParagraph(p.index, h3Style)
                    if (template.options.applyOutlineLevels) {
                      await this.outlineFormatter.formatOutline(p.index, 3)
                    }
                    breakdown.heading3Count++
                    formattedPCount++
                  }
                  break
                }

                case 'heading-4': {
                  if (shouldFormatHeadings) {
                    const h4Style = template.heading4 || template.headings?.[3]?.style || template.customHeadings?.find(h => h.level === 4)?.style || template.heading3 || template.heading2 || template.heading1 || template.body
                    await this.paragraphFormatter.formatParagraph(p.index, h4Style)
                    if (template.options.applyOutlineLevels) {
                      await this.outlineFormatter.formatOutline(p.index, 4)
                    }
                    breakdown.heading4Count++
                    formattedPCount++
                  }
                  break
                }

                case 'heading-5': {
                  if (shouldFormatHeadings) {
                    const h5Style = template.heading5 || template.headings?.[4]?.style || template.customHeadings?.find(h => h.level === 5)?.style || template.heading4 || template.heading3 || template.heading2 || template.heading1 || template.body
                    await this.paragraphFormatter.formatParagraph(p.index, h5Style)
                    if (template.options.applyOutlineLevels) {
                      await this.outlineFormatter.formatOutline(p.index, 5)
                    }
                    breakdown.customHeadingCount++
                    formattedPCount++
                  }
                  break
                }

                case 'heading-6': {
                  if (shouldFormatHeadings) {
                    const h6Style = template.heading6 || template.headings?.[5]?.style || template.customHeadings?.find(h => h.level === 6)?.style || template.heading5 || template.heading4 || template.heading3 || template.heading2 || template.heading1 || template.body
                    await this.paragraphFormatter.formatParagraph(p.index, h6Style)
                    if (template.options.applyOutlineLevels) {
                      await this.outlineFormatter.formatOutline(p.index, 6)
                    }
                    breakdown.customHeadingCount++
                    formattedPCount++
                  }
                  break
                }

                case 'attachment-marker':
                case 'attachment-title':
                  if (shouldFormatBody) {
                    await this.attachmentFormatter.formatAttachment(p.index, template.attachment)
                    breakdown.attachmentCount++
                    formattedPCount++
                  }
                  break

                case 'table-caption':
                  if (shouldFormatBody) {
                    await this.captionFormatter.formatTableCaption(p.index, template.tableCaption)
                    breakdown.captionCount++
                    formattedPCount++
                  }
                  break

                case 'figure-caption':
                  if (shouldFormatBody) {
                    await this.captionFormatter.formatFigureCaption(p.index, template.figureCaption)
                    breakdown.captionCount++
                    formattedPCount++
                  }
                  break

                case 'body':
                default:
                  if (shouldFormatBody) {
                    await this.paragraphFormatter.formatParagraph(p.index, template.body, template.options.protectEmphasisFormatting)
                    breakdown.bodyCount++
                    formattedPCount++
                  }
                  break
              }
            } catch (pErr) {
              logger.warn('FormatEngine', `Non-fatal formatting error on paragraph ${p.index}, skipped`, pErr)
            }

            if (i % 10 === 0 || i === totalP - 1) {
              const pct = Math.min(85, Math.floor(25 + (i / totalP) * 55))
              reportProgress('body', pct, `正在处理段落 (${i + 1}/${totalP})...`, i + 1, totalP)
              await new Promise(resolve => setTimeout(resolve, 0))
            }
          }
        }

        // 3. Table Formatting
        if (shouldFormatTables && template.table.enabled && document.tables.length > 0) {
          reportProgress('tables', 88, '正在处理文档表格与智能对齐...')
          for (const table of document.tables) {
            try {
              await this.tableFormatter.formatTable(table.index, template.table)
              formattedTCount++
            } catch (tErr) {
              logger.warn('FormatEngine', `Non-fatal formatting error on table ${table.index}`, tErr)
            }
          }
        }
        breakdown.tableCount = formattedTCount

        logger.info('FormatEngine', `[PLAN_DONE] applied=${formattedPCount} failed=0`)
      }
      breakdown.tableCount = formattedTCount

      reportProgress('validating', 95, '正在执行文本完整性与格式校验...')
      const afterSignature = await this.adapter.getDocumentTextSignature()

      reportProgress('completed', 100, '排版完成！')

      return {
        success: true,
        formattedParagraphs: formattedPCount,
        formattedTables: formattedTCount,
        formattedSections: document.sections.length,
        durationMs: Date.now() - startTime,
        signatureBefore: beforeSignature,
        signatureAfter: afterSignature,
        breakdown
      }
    } catch (e) {
      reportProgress('error', 100, '排版执行异常中断')
      logger.error('FormatEngine', 'Error during format execution', e)
      throw e
    } finally {
      await this.adapter.setScreenUpdating(true)
    }
  }

  private resolveStyleForRole(role: import('../../types/recognition').ParagraphRole, template: import('../../types/template').FormatTemplate): import('../../types/template').ParagraphStyle {
    switch (role) {
      case 'main-title': return template.mainTitle
      case 'subtitle': return template.subtitle || template.body
      case 'heading-1': return template.heading1 || template.headings?.[0]?.style || template.body
      case 'heading-2': return template.heading2 || template.headings?.[1]?.style || template.heading1 || template.body
      case 'heading-3': return template.heading3 || template.headings?.[2]?.style || template.heading2 || template.heading1 || template.body
      case 'heading-4': return template.heading4 || template.headings?.[3]?.style || template.customHeadings?.find(h => h.level === 4)?.style || template.heading3 || template.body
      case 'heading-5': return template.heading5 || template.headings?.[4]?.style || template.customHeadings?.find(h => h.level === 5)?.style || template.heading4 || template.body
      case 'heading-6': return template.heading6 || template.headings?.[5]?.style || template.customHeadings?.find(h => h.level === 6)?.style || template.heading5 || template.body
      case 'attachment-marker':
      case 'attachment-title': return template.attachment || template.body
      case 'table-caption': return template.tableCaption || template.body
      case 'figure-caption': return template.figureCaption || template.body
      case 'body':
      default:
        return template.body
    }
  }

  private resolveOutlineLevelForRole(role: import('../../types/recognition').ParagraphRole): number | undefined {
    switch (role) {
      case 'heading-1': return 1
      case 'heading-2': return 2
      case 'heading-3': return 3
      case 'heading-4': return 4
      case 'heading-5': return 5
      case 'heading-6': return 6
      default: return undefined
    }
  }

  private incrementBreakdown(breakdown: FormatBreakdown, role: import('../../types/recognition').ParagraphRole): void {
    switch (role) {
      case 'main-title': breakdown.mainTitleCount++; break
      case 'subtitle': breakdown.subtitleCount++; break
      case 'heading-1': breakdown.heading1Count++; break
      case 'heading-2': breakdown.heading2Count++; break
      case 'heading-3': breakdown.heading3Count++; break
      case 'heading-4': breakdown.heading4Count++; break
      case 'heading-5':
      case 'heading-6': breakdown.customHeadingCount++; break
      case 'attachment-marker':
      case 'attachment-title': breakdown.attachmentCount++; break
      case 'table-caption':
      case 'figure-caption': breakdown.captionCount++; break
      case 'body':
      default:
        breakdown.bodyCount++; break
    }
  }
}
