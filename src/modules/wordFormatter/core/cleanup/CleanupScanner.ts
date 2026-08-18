import type { DocumentModel, ParagraphModel } from '../../types/document'
import type { CleanupIssue, CleanupIssueType } from '../../types/cleanup'
import { logger } from '@/shared/logger/logger'

export class CleanupScanner {
  /** Scans the document model and discovers cleanup issues. */
  scan(doc: DocumentModel): CleanupIssue[] {
    const issues: CleanupIssue[] = []
    const paragraphs = doc.paragraphs || []
    const pCount = paragraphs.length

    // WPS table boundaries are structural. Deleting the paragraph mark immediately
    // before/after a table can pull a caption/body paragraph into a table cell.
    const protectedTableParagraphs = new Set<number>()
    for (const table of doc.tables || []) {
      if (table.previousParagraphIndex !== undefined) protectedTableParagraphs.add(table.previousParagraphIndex)
      if (table.nextParagraphIndex !== undefined) protectedTableParagraphs.add(table.nextParagraphIndex)
    }

    logger.info('CleanupScanner', `Starting cleanup scan across ${pCount} paragraphs and ${doc.sections?.length || 1} sections...`)

    let currentEmptyGroup: ParagraphModel[] = []

    const flushEmptyGroup = () => {
      if (currentEmptyGroup.length === 0) return
      const group = currentEmptyGroup
      currentEmptyGroup = []

      // Never offer deletion for table-cell paragraphs or table-boundary anchors.
      const candidates = group.filter(p => p.tableIndex === undefined && !protectedTableParagraphs.has(p.index))
      const groupLen = candidates.length
      if (groupLen === 0) return

      if (groupLen === 1) {
        const p = candidates[0]
        issues.push({
          id: `cleanup-blank-${p.index}`,
          type: 'blank-line',
          paragraphIndex: p.index,
          rangeStart: p.rangeStart,
          rangeEnd: p.rangeEnd,
          originalText: p.rawText || p.text || '',
          suggestedText: '',
          reason: '空白段落（仅手动清理；自动排版不会删除）',
          severity: 'info',
          enabled: true,
          safeAutoFix: false
        })
      } else {
        candidates.forEach((p, idx) => {
          issues.push({
            id: `cleanup-blank-${p.index}`,
            type: 'multiple-blank-lines',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: p.rawText || p.text || '',
            suggestedText: '',
            reason: `连续空行 (第 ${idx + 1}/${groupLen} 行)，仅允许用户手动确认清理`,
            severity: 'info',
            enabled: true,
            safeAutoFix: false
          })
        })
      }
    }

    for (let i = 0; i < pCount; i++) {
      const p = paragraphs[i]
      const raw = p.rawText || p.text || ''
      const cleaned = (p.text || '').replace(/[\r\n\x07\s\u3000\t]/g, '')
      const isEmpty = p.isEmpty || cleaned.length === 0

      // Do not scan table contents or the exact outside paragraphs adjacent to a table.
      if (p.tableIndex !== undefined || protectedTableParagraphs.has(p.index)) {
        flushEmptyGroup()
        continue
      }

      if (isEmpty) {
        currentEmptyGroup.push(p)
      } else {
        flushEmptyGroup()

        if (/^\t+/.test(raw)) {
          const tabCount = (raw.match(/^\t+/) || [''])[0].length
          issues.push({
            id: `cleanup-tab-${p.index}`,
            type: 'tab-indent',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: raw,
            suggestedText: raw.replace(/^\t+/, ''),
            reason: `段首使用 ${tabCount} 个 Tab 模拟缩进，建议手动确认后清除`,
            severity: 'info',
            enabled: true,
            safeAutoFix: false
          })
        }

        if (/^[ \u3000]+/.test(raw) && !/^\t+/.test(raw)) {
          const leadingMatch = raw.match(/^[ \u3000]+/)
          const spaceLen = leadingMatch ? leadingMatch[0].length : 0
          issues.push({
            id: `cleanup-leading-${p.index}`,
            type: 'leading-spaces',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: raw,
            suggestedText: raw.replace(/^[ \u3000]+/, ''),
            reason: `段首包含 ${spaceLen} 个手工空格，建议手动确认后处理`,
            severity: 'info',
            enabled: true,
            safeAutoFix: false
          })
        }

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
              reason: '段尾包含多余空白字符，建议手动确认后清除',
              severity: 'info',
              enabled: true,
              safeAutoFix: false
            })
          }
        }

        // Keep one meaningful internal space; only suggest compressing 2+ spaces to one.
        if (/\S[ \u3000]{2,}\S/.test(raw)) {
          const fixedText = raw.replace(/(\S)[ \u3000]{2,}(?=\S)/g, '$1 ')
          if (fixedText !== raw) {
            issues.push({
              id: `cleanup-multispace-${p.index}`,
              type: 'multiple-spaces',
              paragraphIndex: p.index,
              rangeStart: p.rangeStart,
              rangeEnd: p.rangeEnd,
              originalText: raw,
              suggestedText: fixedText,
              reason: '文本中包含连续多个空格，可手动压缩为 1 个并保留结构分隔',
              severity: 'info',
              enabled: true,
              safeAutoFix: false
            })
          }
        }

        if (/[\v\u000b]/.test(raw)) {
          issues.push({
            id: `cleanup-manualbreak-${p.index}`,
            type: 'manual-line-break',
            paragraphIndex: p.index,
            rangeStart: p.rangeStart,
            rangeEnd: p.rangeEnd,
            originalText: raw,
            suggestedText: raw.replace(/[\v\u000b]/g, '\n'),
            reason: '段落中包含软回车/手工换行符，仅建议手动处理',
            severity: 'warning',
            enabled: false,
            safeAutoFix: false
          })
        }
      }
    }

    flushEmptyGroup()

    const sections = doc.sections || []
    if (sections.length > 1) {
      for (let s = 1; s < sections.length; s++) {
        const prevSec = sections[s - 1]
        const currSec = sections[s]
        const sameOrientation = prevSec.orientation === currSec.orientation
        const sameMargins =
          Math.abs((prevSec.topMargin || 0) - (currSec.topMargin || 0)) < 1 &&
          Math.abs((prevSec.leftMargin || 0) - (currSec.leftMargin || 0)) < 1
        const isLandscape = currSec.orientation === 'landscape'

        if (sameOrientation && sameMargins && !isLandscape) {
          issues.push({
            id: `cleanup-secbreak-${currSec.index}`,
            type: 'duplicate-section-break' as CleanupIssueType,
            paragraphIndex: 1,
            originalText: `Section ${currSec.index}`,
            suggestedText: '',
            reason: `第 ${currSec.index} 节与前一节页面属性一致，疑似多余分节符；仅允许手动处理`,
            severity: 'warning',
            enabled: false,
            safeAutoFix: false
          })
        }
      }
    }

    logger.info('CleanupScanner', `Cleanup scan finished. Total issues discovered: ${issues.length}; automatic cleanup disabled`)
    return issues
  }
}
