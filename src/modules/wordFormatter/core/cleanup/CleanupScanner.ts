import type { DocumentModel, ParagraphModel } from '../../types/document'
import type { CleanupIssue, CleanupIssueType } from '../../types/cleanup'
import { logger } from '@/shared/logger/logger'

export class CleanupScanner {
  /**
   * Scans the document model and discovers all cleanup issues
   */
  scan(doc: DocumentModel): CleanupIssue[] {
    const issues: CleanupIssue[] = []
    const paragraphs = doc.paragraphs || []
    const pCount = paragraphs.length

    logger.info('CleanupScanner', `Starting cleanup scan across ${pCount} paragraphs and ${doc.sections?.length || 1} sections...`)

    let currentEmptyGroup: ParagraphModel[] = []

    const flushEmptyGroup = () => {
      if (currentEmptyGroup.length === 0) return
      const groupLen = currentEmptyGroup.length

      if (groupLen === 1) {
        const p = currentEmptyGroup[0]
        issues.push({
          id: `cleanup-blank-${p.index}`,
          type: 'blank-line',
          paragraphIndex: p.index,
          rangeStart: p.rangeStart,
          rangeEnd: p.rangeEnd,
          originalText: p.rawText || p.text || '',
          suggestedText: '',
          reason: '多余空白段落，建议删除',
          severity: 'info',
          enabled: true,
          safeAutoFix: true
        })
      } else {
        currentEmptyGroup.forEach((p, idx) => {
          issues.push({
            id: `cleanup-blank-${p.index}`,
            type: 'multiple-blank-lines',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: p.rawText || p.text || '',
            suggestedText: '',
            reason: `连续多余空行 (第 ${idx + 1}/${groupLen} 行)，建议删除`,
            severity: 'info',
            enabled: true,
            safeAutoFix: true
          })
        })
      }
      currentEmptyGroup = []
    }

    for (let i = 0; i < pCount; i++) {
      const p = paragraphs[i]
      const raw = p.rawText || p.text || ''
      const cleaned = (p.text || '').replace(/[\r\n\x07\s\u3000\t]/g, '')
      const isEmpty = p.isEmpty || cleaned.length === 0

      // 1. Check Blank Lines
      if (isEmpty) {
        currentEmptyGroup.push(p)
      } else {
        flushEmptyGroup()

        // 2. Check Tab Indentation
        if (/^\t+/.test(raw)) {
          const tabCount = (raw.match(/^\t+/) || [''])[0].length
          const fixedText = raw.replace(/^\t+/, '')
          issues.push({
            id: `cleanup-tab-${p.index}`,
            type: 'tab-indent',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: raw,
            suggestedText: fixedText,
            reason: `段首使用 ${tabCount} 个 Tab 模拟缩进，建议清除并交由标准段落首行缩进排版`,
            severity: 'info',
            enabled: true,
            safeAutoFix: true
          })
        }

        // 3. Check Leading Spaces (Halfwidth & Fullwidth)
        // If starts with 1+ spaces/fullwidth spaces (not tabs already caught)
        if (/^[ \u3000]+/.test(raw) && !/^\t+/.test(raw)) {
          const leadingMatch = raw.match(/^[ \u3000]+/)
          const spaceLen = leadingMatch ? leadingMatch[0].length : 0
          const fixedText = raw.replace(/^[ \u3000]+/, '')
          issues.push({
            id: `cleanup-leading-${p.index}`,
            type: 'leading-spaces',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: raw,
            suggestedText: fixedText,
            reason: `段首包含 ${spaceLen} 个手工空格，建议清除并应用模板首行缩进`,
            severity: 'info',
            enabled: true,
            safeAutoFix: true
          })
        }

        // 4. Check Trailing Spaces
        if (/[ \t\u3000]+[\r\n]*$/.test(raw) && raw.trim().length > 0) {
          const fixedText = raw.replace(/[ \t\u3000]+([\r\n]*)$/, '$1')
          if (fixedText !== raw) {
            issues.push({
              id: `cleanup-trailing-${p.index}`,
              type: 'trailing-spaces',
              paragraphIndex: p.index,
              rangeStart: p.rangeStart,
              rangeEnd: p.rangeEnd,
              originalText: raw,
              suggestedText: fixedText,
              reason: '段尾包含多余空白字符，建议清除',
              severity: 'info',
              enabled: true,
              safeAutoFix: true
            })
          }
        }

        // 5. Check Multiple Spaces within Text (Chinese context safe)
        // Avoid collapsing single space between English words (e.g. "Word Formatter" is kept)
        // Match 2 or more consecutive spaces or fullwidth spaces
        if (/[^\x00-\x7F][ ]{2,}[^\x00-\x7F]|[\u4e00-\u9fa5][ ]+[\u4e00-\u9fa5]|\u3000{2,}/.test(raw)) {
          // Replace 2+ spaces between Chinese characters with none or single space
          const fixedText = raw
            .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
            .replace(/ {2,}/g, ' ')
            .replace(/\u3000+/g, '')

          if (fixedText !== raw) {
            issues.push({
              id: `cleanup-multispace-${p.index}`,
              type: 'multiple-spaces',
              paragraphIndex: p.index,
              rangeStart: p.rangeStart,
              rangeEnd: p.rangeEnd,
              originalText: raw,
              suggestedText: fixedText,
              reason: '中文字符间包含多余连续空格，建议清除',
              severity: 'info',
              enabled: true,
              safeAutoFix: true
            })
          }
        }

        // 6. Check Manual Line Break (Shift+Enter / \v / \u000b)
        if (/[\v\u000b]/.test(raw)) {
          const fixedText = raw.replace(/[\v\u000b]/g, '\n')
          issues.push({
            id: `cleanup-manualbreak-${p.index}`,
            type: 'manual-line-break',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: raw,
            suggestedText: fixedText,
            reason: '段落中包含软回车/手工换行符 (Shift+Enter)，建议转换为标准段落回车',
            severity: 'warning',
            enabled: false, // Default unchecked for safety
            safeAutoFix: false
          })
        }
      }

      // 7. Check Empty Paragraphs Before / After Tables
      if (p.tableIndex !== undefined) {
        // Previous paragraph is empty?
        if (i > 0 && paragraphs[i - 1].isEmpty) {
          issues.push({
            id: `cleanup-empty-before-table-${paragraphs[i - 1].index}`,
            type: 'empty-paragraph-before-table',
            paragraphIndex: paragraphs[i - 1].index,
            originalText: '',
            suggestedText: '',
            reason: `表格 (第 ${p.index} 段) 前方存在多余空段落，建议移除`,
            severity: 'info',
            enabled: true,
            safeAutoFix: true
          })
        }
        // Next paragraph is empty?
        if (i < pCount - 1 && paragraphs[i + 1].isEmpty) {
          issues.push({
            id: `cleanup-empty-after-table-${paragraphs[i + 1].index}`,
            type: 'empty-paragraph-after-table',
            paragraphIndex: paragraphs[i + 1].index,
            originalText: '',
            suggestedText: '',
            reason: `表格 (第 ${p.index} 段) 后方存在多余空段落，建议移除`,
            severity: 'info',
            enabled: true,
            safeAutoFix: true
          })
        }
      }
    }

    // Flush any trailing empty paragraph group
    flushEmptyGroup()

    // 8. Check Duplicate Section Breaks
    const sections = doc.sections || []
    if (sections.length > 1) {
      for (let s = 1; s < sections.length; s++) {
        const prevSec = sections[s - 1]
        const currSec = sections[s]

        // Check if identical setup and neither section is landscape
        const sameOrientation = prevSec.orientation === currSec.orientation
        const sameMargins = 
          Math.abs((prevSec.topMargin || 0) - (currSec.topMargin || 0)) < 1 &&
          Math.abs((prevSec.leftMargin || 0) - (currSec.leftMargin || 0)) < 1

        const isLandscape = currSec.orientation === 'landscape'

        if (sameOrientation && sameMargins && !isLandscape) {
          issues.push({
            id: `cleanup-secbreak-${currSec.index}`,
            type: 'duplicate-section-break',
            paragraphIndex: 1,
            originalText: `Section ${currSec.index}`,
            suggestedText: '',
            reason: `第 ${currSec.index} 节与前一节页面属性完全一致，疑似多余分节符`,
            severity: 'warning',
            enabled: false,
            safeAutoFix: false
          })
        }
      }
    }

    logger.info('CleanupScanner', `Cleanup scan finished. Total issues discovered: ${issues.length}`)
    return issues
  }
}
