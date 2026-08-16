import type { DocumentModel } from '../../types/document'
import type { FormatTemplate, ParagraphStyle } from '../../types/template'
import type { RecognitionResult, ParagraphRole } from '../../types/recognition'
import type { FormatScope } from '../../types/formatting'
import type { FormatPlan, FormatChange, FormatPlanSummary, FormatApplyStrategy } from '../../types/planning'
import { FormatComparator } from './FormatComparator'

export class FormatPlanBuilder {
  /**
   * Build a FormatPlan containing all necessary FormatChanges
   */
  static buildPlan(params: {
    document: DocumentModel
    recognition: RecognitionResult[]
    userOverrides?: Record<number, ParagraphRole>
    template: FormatTemplate
    strategy?: FormatApplyStrategy
    scope?: FormatScope
  }): FormatPlan {
    const {
      document,
      recognition,
      userOverrides = {},
      template,
      strategy = 'minimal',
      scope = 'all'
    } = params

    const changes: FormatChange[] = []
    let affectedParagraphs = 0
    let affectedTables = 0
    let skippedAlreadyCompliant = 0

    const shouldFormatPage = scope === 'all' || scope === 'page-only'
    const shouldFormatHeadings = scope === 'all' || scope === 'headings-only'
    const shouldFormatBody = scope === 'all' || scope === 'body-only'
    const shouldFormatTables = scope === 'all' || scope === 'tables-only'

    // 1. Process Page Setup / Sections
    if (shouldFormatPage && document.sections && template.page) {
      document.sections.forEach(sec => {
        const secChanges = FormatComparator.compareSection(sec, template.page)
        changes.push(...secChanges)
      })
    }

    // 2. Build map of paragraph recognition
    const recMap = new Map<number, RecognitionResult>()
    recognition.forEach(r => recMap.set(r.paragraphIndex, r))

    // 3. Process Paragraphs
    document.paragraphs.forEach(p => {
      const pIdx = p.index
      const rec = recMap.get(pIdx)
      const role: ParagraphRole = userOverrides[pIdx] || rec?.role || 'body'
      
      const { style, displayName, outlineLevel, isHeading, isBody } = this.resolveTargetStyle(role, template)

      // Filter by scope
      const inScope = (isHeading && shouldFormatHeadings) || (isBody && shouldFormatBody)
      if (!inScope) {
        return
      }

      if (strategy === 'minimal') {
        const pChanges = FormatComparator.compareParagraph(
          p,
          style,
          role,
          displayName,
          template.options.applyOutlineLevels ? outlineLevel : undefined
        )

        if (pChanges.length === 0) {
          skippedAlreadyCompliant++
        } else {
          affectedParagraphs++
          changes.push(...pChanges)
        }
      } else {
        // Strategy === 'normalize': generate full standard change
        affectedParagraphs++
        changes.push({
          id: `p-${pIdx}-full-normalize`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'font-chinese',
          propertyName: `${displayName}全量标准化重写`,
          before: `${p.chineseFont || '默认'} ${p.fontSize || ''}pt`,
          after: `${style.chineseFont} ${style.fontSizePt}pt`,
          reason: `按模板规范完整重写${displayName}全部格式属性`,
          category: isHeading ? 'heading' : 'body',
          enabled: true,
          impact: 'high',
          paragraphSnippet: p.text.trim().slice(0, 30)
        })
      }
    })

    // 4. Process Tables
    if (shouldFormatTables && document.tables && template.table && template.table.enabled) {
      document.tables.forEach(table => {
        const tChanges = FormatComparator.compareTable(table, template.table)
        if (tChanges.length > 0) {
          affectedTables++
          changes.push(...tChanges)
        }
      })
    }

    // 5. Build Summary
    const summary: FormatPlanSummary = {
      totalChanges: changes.length,
      enabledChanges: changes.filter(c => c.enabled).length,
      pageChanges: changes.filter(c => c.category === 'page').length,
      headingChanges: changes.filter(c => c.category === 'heading').length,
      bodyChanges: changes.filter(c => c.category === 'body').length,
      tableChanges: changes.filter(c => c.category === 'table').length,
      fontChanges: changes.filter(c => c.category === 'font').length,
      outlineChanges: changes.filter(c => c.category === 'outline').length,
      affectedParagraphs,
      affectedTables,
      skippedAlreadyCompliant
    }

    return {
      documentId: document.id || `doc-${Date.now()}`,
      documentSignature: document.signature,
      createdAt: Date.now(),
      strategy,
      scope,
      changes,
      summary
    }
  }

  /**
   * Resolve target style and metadata from paragraph role
   */
  private static resolveTargetStyle(
    role: ParagraphRole,
    template: FormatTemplate
  ): {
    style: ParagraphStyle
    displayName: string
    outlineLevel: number
    isHeading: boolean
    isBody: boolean
  } {
    switch (role) {
      case 'main-title':
        return {
          style: template.mainTitle,
          displayName: '主标题',
          outlineLevel: 10,
          isHeading: true,
          isBody: false
        }
      case 'subtitle':
        return {
          style: template.subtitle || template.body,
          displayName: '副标题',
          outlineLevel: 10,
          isHeading: true,
          isBody: false
        }
      case 'heading-1':
        return {
          style: template.heading1 || template.headings?.[0]?.style || template.body,
          displayName: template.headings?.[0]?.name || '一级标题',
          outlineLevel: 1,
          isHeading: true,
          isBody: false
        }
      case 'heading-2':
        return {
          style: template.heading2 || template.headings?.[1]?.style || template.heading1 || template.body,
          displayName: template.headings?.[1]?.name || '二级标题',
          outlineLevel: 2,
          isHeading: true,
          isBody: false
        }
      case 'heading-3':
        return {
          style: template.heading3 || template.headings?.[2]?.style || template.heading2 || template.heading1 || template.body,
          displayName: template.headings?.[2]?.name || '三级标题',
          outlineLevel: 3,
          isHeading: true,
          isBody: false
        }
      case 'heading-4':
        return {
          style: template.heading4 || template.headings?.[3]?.style || template.customHeadings?.find(h => h.level === 4)?.style || template.heading3 || template.heading2 || template.heading1 || template.body,
          displayName: template.headings?.[3]?.name || '四级标题',
          outlineLevel: 4,
          isHeading: true,
          isBody: false
        }
      case 'heading-5':
        return {
          style: template.heading5 || template.headings?.[4]?.style || template.customHeadings?.find(h => h.level === 5)?.style || template.heading4 || template.heading3 || template.body,
          displayName: template.headings?.[4]?.name || '五级标题',
          outlineLevel: 5,
          isHeading: true,
          isBody: false
        }
      case 'heading-6':
        return {
          style: template.heading6 || template.headings?.[5]?.style || template.customHeadings?.find(h => h.level === 6)?.style || template.heading5 || template.heading4 || template.body,
          displayName: template.headings?.[5]?.name || '六级标题',
          outlineLevel: 6,
          isHeading: true,
          isBody: false
        }
      case 'attachment-title':
      case 'attachment-marker':
        return {
          style: template.attachment || template.body,
          displayName: '附件',
          outlineLevel: 10,
          isHeading: false,
          isBody: true
        }
      case 'table-caption':
      case 'figure-caption':
        return {
          style: template.tableCaption || template.figureCaption || template.body,
          displayName: '图表题',
          outlineLevel: 10,
          isHeading: false,
          isBody: true
        }
      case 'body':
      default:
        return {
          style: template.body,
          displayName: '正文',
          outlineLevel: 10,
          isHeading: false,
          isBody: true
        }
    }
  }
}
