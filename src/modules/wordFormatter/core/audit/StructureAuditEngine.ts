import type { DocumentModel } from '../../types/document'
import type { RecognitionResult } from '../../types/recognition'
import type { StructureIssue } from '../../types/audit'
import { logger } from '@/shared/logger/logger'

const CHINESE_NUMERALS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
}

interface ParsedHeadingNumber {
  type: 'chinese' | 'parenthesized-chinese' | 'arabic' | 'multilevel-arabic' | 'parenthesized-arabic' | 'letter'
  value: number
  prefix: string
  titleOnly: string
  parts?: number[]
  depth?: number
}

export class StructureAuditEngine {
  /**
   * Audit document structure and return all structural issues
   */
  audit(doc: DocumentModel, recognition?: RecognitionResult[]): StructureIssue[] {
    const issues: StructureIssue[] = []
    const paragraphs = doc.paragraphs || []
    const pCount = paragraphs.length

    logger.info('StructureAuditEngine', `Starting structure audit across ${pCount} paragraphs...`)

    // Helper map of recognized paragraph types
    const recMap = new Map<number, RecognitionResult>()
    if (recognition && recognition.length > 0) {
      for (const rp of recognition) {
        recMap.set(rp.paragraphIndex, rp)
      }
    }

    // Collect all headings in document order
    interface HeadingItem {
      paragraphIndex: number
      level: number
      text: string
      parsedNumber?: ParsedHeadingNumber
    }

    const headings: HeadingItem[] = []

    for (let i = 0; i < pCount; i++) {
      const p = paragraphs[i]
      const rp = recMap.get(p.index)
      const cleanText = (p.text || '').trim()
      if (!cleanText) continue

      let level: number | null = null

      if (rp?.role?.startsWith('heading-')) {
        const lvlNum = parseInt(rp.role.replace('heading-', ''), 10)
        if (!isNaN(lvlNum)) level = lvlNum
      }

      if (level === null) {
        if (/^[一二三四五六七八九十百千]+、/.test(cleanText)) {
          level = 1
        } else if (/^[（(][一二三四五六七八九十百千]+[）)]/.test(cleanText)) {
          level = 2
        } else if (/^\d+(?:\.\d+)+/.test(cleanText)) {
          const m = cleanText.match(/^(\d+(?:\.\d+)+)/)
          if (m) {
            const dots = (m[1].match(/\./g) || []).length
            level = Math.min(9, dots + 1) // 1.1 -> level 2; 1.1.1 -> level 3; 1.1.1.1 -> level 4
          }
        } else if (/^\d+[.、]/.test(cleanText)) {
          level = 3
        } else if (/^[（(]\d+[）)]/.test(cleanText)) {
          level = 4
        }
      }

      if (level !== null) {
        const parsed = this.parseHeadingNumber(cleanText)
        headings.push({
          paragraphIndex: p.index,
          level,
          text: cleanText,
          parsedNumber: parsed
        })
      }
    }

    // 1. Heading Level Jumps
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1]
      const curr = headings[i]
      if (curr.level > prev.level + 1) {
        issues.push({
          id: `struct-jump-${curr.paragraphIndex}`,
          type: 'heading-level-jump',
          paragraphIndex: curr.paragraphIndex,
          severity: 'warning',
          title: '标题层级跳跃',
          description: `从 ${prev.level} 级标题直接跳到 ${curr.level} 级标题，缺少 ${prev.level + 1} 级中间层级`,
          relatedParagraphs: [prev.paragraphIndex, curr.paragraphIndex],
          autoFixAvailable: false
        })
      }
    }

    // 2. Heading Number Continuity & Duplication & Text Duplication
    const groupedByParentAndLevel = new Map<string, HeadingItem[]>()
    const stack: { level: number; pIdx: number; prefix: string }[] = []

    for (const h of headings) {
      while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
        stack.pop()
      }
      const parent = stack.length > 0 ? stack[stack.length - 1] : null
      const parentKey = parent ? `p_${parent.pIdx}_lvl${parent.level}` : 'root'
      const groupKey = `${parentKey}_lvl${h.level}`

      if (!groupedByParentAndLevel.has(groupKey)) {
        groupedByParentAndLevel.set(groupKey, [])
      }
      groupedByParentAndLevel.get(groupKey)!.push(h)

      stack.push({ level: h.level, pIdx: h.paragraphIndex, prefix: h.parsedNumber?.prefix || '' })
    }

    for (const [, groupHeadings] of groupedByParentAndLevel.entries()) {
      const seenNumbers = new Set<string>()
      const seenTitles = new Set<string>()
      let expectedSeqNum = 1

      for (const h of groupHeadings) {
        if (h.parsedNumber) {
          const numKey = h.parsedNumber.prefix || `num_${h.parsedNumber.value}`
          const numVal = h.parsedNumber.value

          // Duplicate check
          if (seenNumbers.has(numKey)) {
            issues.push({
              id: `struct-num-dup-${h.paragraphIndex}`,
              type: 'heading-number-duplicate',
              paragraphIndex: h.paragraphIndex,
              severity: 'error',
              title: '标题序号重复',
              description: `同级标题中出现重复序号 "${h.parsedNumber.prefix}"`,
              autoFixAvailable: false
            })
          } else {
            seenNumbers.add(numKey)
          }

          // Sequence gap check
          if (numVal > expectedSeqNum) {
            issues.push({
              id: `struct-num-gap-${h.paragraphIndex}`,
              type: 'heading-number-gap',
              paragraphIndex: h.paragraphIndex,
              severity: 'warning',
              title: '标题编号缺失',
              description: `标题序号从第 ${expectedSeqNum - 1} 项跳至第 ${numVal} 项，缺少中间序号`,
              autoFixAvailable: false
            })
            expectedSeqNum = numVal + 1
          } else if (numVal === expectedSeqNum) {
            expectedSeqNum++
          }
        }

        // Duplicate heading title check
        const titleOnly = h.parsedNumber?.titleOnly || h.text
        if (titleOnly && titleOnly.length >= 2) {
          if (seenTitles.has(titleOnly)) {
            issues.push({
              id: `struct-dup-title-${h.paragraphIndex}`,
              type: 'duplicate-heading-text',
              paragraphIndex: h.paragraphIndex,
              severity: 'info',
              title: '同级重复标题名称',
              description: `在同一章节下存在重复标题名称 "${titleOnly}"`,
              autoFixAvailable: false
            })
          } else {
            seenTitles.add(titleOnly)
          }
        }
      }
    }

    // 3. Orphan Heading Check
    for (let i = 0; i < headings.length; i++) {
      const curr = headings[i]
      const next = headings[i + 1]

      // Check intervening paragraphs between curr and next (or end of doc)
      const startIdx = curr.paragraphIndex
      const endIdx = next ? next.paragraphIndex - 1 : pCount

      let hasInterveningContent = false
      for (let pIdx = startIdx + 1; pIdx <= endIdx; pIdx++) {
        const p = paragraphs.find(item => item.index === pIdx)
        if (p && !p.isEmpty && (p.text || '').trim().length > 0) {
          hasInterveningContent = true
          break
        }
      }

      if (!hasInterveningContent && next && next.level <= curr.level) {
        issues.push({
          id: `struct-orphan-${curr.paragraphIndex}`,
          type: 'orphan-heading',
          paragraphIndex: curr.paragraphIndex,
          severity: 'warning',
          title: '孤立标题',
          description: `标题 "${curr.text.slice(0, 20)}" 下方无任何正文或表格即直接进入下一标题`,
          autoFixAvailable: false
        })
      }
    }

    // 4. Heading Too Long & Heading Ends With Period
    for (const h of headings) {
      if (h.text.length > 40) {
        issues.push({
          id: `struct-long-${h.paragraphIndex}`,
          type: 'heading-too-long',
          paragraphIndex: h.paragraphIndex,
          severity: 'info',
          title: '标题文本过长',
          description: `标题长度达到 ${h.text.length} 字符（建议控制在40字以内）`,
          autoFixAvailable: false
        })
      }

      if (/[。.\uff0e]$/.test(h.text)) {
        issues.push({
          id: `struct-period-${h.paragraphIndex}`,
          type: 'heading-ends-with-period',
          paragraphIndex: h.paragraphIndex,
          severity: 'info',
          title: '标题末尾带有句号',
          description: '规范公文标题末尾通常不使用句号',
          autoFixAvailable: true
        })
      }
    }

    // 5. Caption & Table / Image Relationships
    for (let i = 0; i < pCount; i++) {
      const p = paragraphs[i]
      const text = (p.text || '').trim()

      // Table Caption without Table
      if (/^表\s*\d+/.test(text)) {
        const nextP = paragraphs[i + 1]
        const hasTableNearby = doc.tables?.some(t => 
          t.previousParagraphIndex === p.index || 
          (nextP && t.previousParagraphIndex === nextP.index)
        )
        if (!hasTableNearby) {
          issues.push({
            id: `struct-cap-notable-${p.index}`,
            type: 'caption-without-table',
            paragraphIndex: p.index,
            severity: 'warning',
            title: '表题未关联到表格',
            description: `表题 "${text.slice(0, 25)}" 下方未检测到对应表格`,
            autoFixAvailable: false
          })
        }
      }

      // Figure Caption without Image
      if (/^图\s*\d+/.test(text)) {
        const prevP = paragraphs[i - 1]
        const nextP = paragraphs[i + 1]
        const hasImageNearby = p.hasImage || (prevP && prevP.hasImage) || (nextP && nextP.hasImage)
        if (!hasImageNearby) {
          issues.push({
            id: `struct-cap-noimg-${p.index}`,
            type: 'caption-without-image',
            paragraphIndex: p.index,
            severity: 'warning',
            title: '图题未关联到图片',
            description: `图题 "${text.slice(0, 25)}" 附近未检测到对应插图或形状`,
            autoFixAvailable: false
          })
        }
      }

      // Image without Caption
      if (p.hasImage) {
        const prevP = paragraphs[i - 1]
        const nextP = paragraphs[i + 1]
        const hasCaption = 
          (prevP && /^图\s*\d+/.test((prevP.text || '').trim())) ||
          (nextP && /^图\s*\d+/.test((nextP.text || '').trim()))

        if (!hasCaption) {
          issues.push({
            id: `struct-img-nocap-${p.index}`,
            type: 'image-without-caption',
            paragraphIndex: p.index,
            severity: 'info',
            title: '图片缺少图题',
            description: `第 ${p.index} 段插图上下未检测到标准图题标注`,
            autoFixAvailable: false
          })
        }
      }

      // Attachment marker without title
      if (/^附件\s*[：:]\s*$/.test(text)) {
        const nextP = paragraphs[i + 1]
        if (!nextP || !/^\d+[.、]/.test((nextP.text || '').trim())) {
          issues.push({
            id: `struct-att-notitle-${p.index}`,
            type: 'attachment-marker-without-title',
            paragraphIndex: p.index,
            severity: 'warning',
            title: '附件说明缺少附件标题',
            description: '包含"附件："引导词但未列出具体附件标题或清单',
            autoFixAvailable: false
          })
        }
      }
    }

    // 6. Table without Caption
    if (doc.tables && doc.tables.length > 0) {
      for (const t of doc.tables) {
        const prevPIdx = t.previousParagraphIndex
        const prevP = paragraphs.find(p => p.index === prevPIdx)
        const isTableCaption = prevP && /^表\s*\d+/.test((prevP.text || '').trim())
        if (!isTableCaption) {
          issues.push({
            id: `struct-tbl-nocap-${t.index}`,
            type: 'table-without-caption',
            paragraphIndex: prevPIdx || 1,
            severity: 'info',
            title: '表格缺少表题',
            description: `第 ${t.index} 个表格上方未检测到标准表题标注`,
            autoFixAvailable: false
          })
        }
      }
    }

    logger.info('StructureAuditEngine', `Structure audit finished. Found ${issues.length} issues.`)
    return issues
  }

  private parseHeadingNumber(text: string): ParsedHeadingNumber | undefined {
    // 1. Multi-level Arabic numbers e.g. 1.1, 1.1.1, 1.2.3.4 (must precede single arabic)
    const mMulti = text.match(/^(\d+(?:\.\d+)+)[.、\s]\s*(.*)$/) || text.match(/^(\d+(?:\.\d+)+)$/)
    if (mMulti) {
      const numStr = mMulti[1]
      const parts = numStr.split('.').map(n => parseInt(n, 10))
      const lastVal = parts[parts.length - 1]
      return {
        type: 'multilevel-arabic',
        value: lastVal,
        prefix: numStr,
        titleOnly: (mMulti[2] || '').trim(),
        parts,
        depth: parts.length
      }
    }

    // 2. Chinese numeral e.g. 一、
    const m1 = text.match(/^([一二三四五六七八九十百千]+)、\s*(.*)$/)
    if (m1 && CHINESE_NUMERALS[m1[1]]) {
      return {
        type: 'chinese',
        value: CHINESE_NUMERALS[m1[1]],
        prefix: `${m1[1]}、`,
        titleOnly: m1[2].trim(),
        depth: 1
      }
    }

    // 3. Parenthesized Chinese e.g. （一）
    const m2 = text.match(/^[（(]([一二三四五六七八九十百千]+)[）)]\s*(.*)$/)
    if (m2 && CHINESE_NUMERALS[m2[1]]) {
      return {
        type: 'parenthesized-chinese',
        value: CHINESE_NUMERALS[m2[1]],
        prefix: `（${m2[1]}）`,
        titleOnly: m2[2].trim(),
        depth: 2
      }
    }

    // 4. Single Arabic e.g. 1. or 1、 or 1 (followed by space or dot)
    const m3 = text.match(/^(\d+)[.、]\s*(.*)$/) || text.match(/^(\d+)\s+(.*)$/)
    if (m3) {
      const val = parseInt(m3[1], 10)
      return {
        type: 'arabic',
        value: val,
        prefix: `${m3[1]}.`,
        titleOnly: m3[2].trim(),
        parts: [val],
        depth: 1
      }
    }

    // 5. Parenthesized Arabic e.g. (1) or （1）
    const m4 = text.match(/^[（(](\d+)[）)]\s*(.*)$/)
    if (m4) {
      return {
        type: 'parenthesized-arabic',
        value: parseInt(m4[1], 10),
        prefix: `(${m4[1]})`,
        titleOnly: m4[2].trim(),
        depth: 4
      }
    }

    return undefined
  }
}
