import type { ParagraphModel, SectionModel, TableModel } from '../../types/document'
import type { ParagraphStyle, PageFormat, TableStyle } from '../../types/template'
import type { ParagraphRole } from '../../types/recognition'
import type { FormatChange } from '../../types/planning'
import { TOLERANCES, isFloatEqual, normalizeFontName } from './FormatTolerances'

export class FormatComparator {
  /**
   * Compare a section's page setup against target template page format
   */
  static compareSection(section: SectionModel, targetPage: PageFormat): FormatChange[] {
    const changes: FormatChange[] = []
    const secIdx = section.index

    // 1. Top Margin
    if (section.topMargin !== undefined && !isFloatEqual(section.topMargin, targetPage.topMarginPt, TOLERANCES.marginPt)) {
      changes.push({
        id: `sec-${secIdx}-top-margin`,
        targetType: 'section',
        targetIndex: secIdx,
        property: 'page-margin-top',
        propertyName: '上边距',
        before: `${(section.topMargin || 0).toFixed(1)} pt`,
        after: `${targetPage.topMarginPt.toFixed(1)} pt`,
        reason: '上边距偏离模板标准',
        category: 'page',
        enabled: true,
        impact: 'medium'
      })
    }

    // 2. Bottom Margin
    if (section.bottomMargin !== undefined && !isFloatEqual(section.bottomMargin, targetPage.bottomMarginPt, TOLERANCES.marginPt)) {
      changes.push({
        id: `sec-${secIdx}-bottom-margin`,
        targetType: 'section',
        targetIndex: secIdx,
        property: 'page-margin-bottom',
        propertyName: '下边距',
        before: `${(section.bottomMargin || 0).toFixed(1)} pt`,
        after: `${targetPage.bottomMarginPt.toFixed(1)} pt`,
        reason: '下边距偏离模板标准',
        category: 'page',
        enabled: true,
        impact: 'medium'
      })
    }

    // 3. Left Margin
    if (section.leftMargin !== undefined && !isFloatEqual(section.leftMargin, targetPage.leftMarginPt, TOLERANCES.marginPt)) {
      changes.push({
        id: `sec-${secIdx}-left-margin`,
        targetType: 'section',
        targetIndex: secIdx,
        property: 'page-margin-left',
        propertyName: '左边距',
        before: `${(section.leftMargin || 0).toFixed(1)} pt`,
        after: `${targetPage.leftMarginPt.toFixed(1)} pt`,
        reason: '左边距偏离模板标准',
        category: 'page',
        enabled: true,
        impact: 'medium'
      })
    }

    // 4. Right Margin
    if (section.rightMargin !== undefined && !isFloatEqual(section.rightMargin, targetPage.rightMarginPt, TOLERANCES.marginPt)) {
      changes.push({
        id: `sec-${secIdx}-right-margin`,
        targetType: 'section',
        targetIndex: secIdx,
        property: 'page-margin-right',
        propertyName: '右边距',
        before: `${(section.rightMargin || 0).toFixed(1)} pt`,
        after: `${targetPage.rightMarginPt.toFixed(1)} pt`,
        reason: '右边距偏离模板标准',
        category: 'page',
        enabled: true,
        impact: 'medium'
      })
    }

    return changes
  }

  /**
   * Compare paragraph formatting against target paragraph style
   */
  static compareParagraph(
    paragraph: ParagraphModel,
    targetStyle: ParagraphStyle,
    role: ParagraphRole,
    roleDisplayName: string,
    targetOutlineLevel?: number
  ): FormatChange[] {
    const changes: FormatChange[] = []
    const pIdx = paragraph.index
    const isHeading = role.startsWith('heading-') || role === 'main-title' || role === 'subtitle'
    const category = isHeading ? 'heading' : 'body'
    const snippet = paragraph.text.trim().slice(0, 30)

    // 1. Chinese Font
    if (targetStyle.chineseFont) {
      const curFontNorm = normalizeFontName(paragraph.chineseFont)
      const targetFontNorm = normalizeFontName(targetStyle.chineseFont)
      if (curFontNorm && curFontNorm !== targetFontNorm) {
        changes.push({
          id: `p-${pIdx}-font-chinese`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'font-chinese',
          propertyName: '中文字体',
          before: paragraph.chineseFont || '未设定',
          after: targetStyle.chineseFont,
          reason: `${roleDisplayName}字体规范为「${targetStyle.chineseFont}」`,
          category: 'font',
          enabled: true,
          impact: isHeading ? 'high' : 'medium',
          paragraphSnippet: snippet
        })
      }
    }

    // 2. Western Font
    if (targetStyle.westernFont) {
      const curWestern = normalizeFontName(paragraph.westernFont)
      const targetWestern = normalizeFontName(targetStyle.westernFont)
      if (curWestern && curWestern !== targetWestern) {
        changes.push({
          id: `p-${pIdx}-font-western`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'font-western',
          propertyName: '西文字体',
          before: paragraph.westernFont || '未设定',
          after: targetStyle.westernFont,
          reason: `${roleDisplayName}西文字体规范为「${targetStyle.westernFont}」`,
          category: 'font',
          enabled: true,
          impact: 'low',
          paragraphSnippet: snippet
        })
      }
    }

    // 3. Font Size (Pt)
    if (targetStyle.fontSizePt !== undefined) {
      if (paragraph.fontSize !== undefined && !isFloatEqual(paragraph.fontSize, targetStyle.fontSizePt, TOLERANCES.fontSizePt)) {
        changes.push({
          id: `p-${pIdx}-font-size`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'font-size',
          propertyName: '字号',
          before: `${paragraph.fontSize} pt`,
          after: `${targetStyle.fontSizePt} pt`,
          reason: `${roleDisplayName}字号规范为 ${targetStyle.fontSizePt} pt`,
          category,
          enabled: true,
          impact: isHeading ? 'high' : 'medium',
          paragraphSnippet: snippet
        })
      }
    }

    // 4. Bold
    const targetBold = Boolean(targetStyle.bold)
    const curBold = Boolean(paragraph.bold)
    if (curBold !== targetBold) {
      changes.push({
        id: `p-${pIdx}-bold`,
        targetType: 'paragraph',
        targetIndex: pIdx,
        property: 'bold',
        propertyName: '加粗',
        before: curBold ? '加粗' : '常规',
        after: targetBold ? '加粗' : '常规',
        reason: `${roleDisplayName}${targetBold ? '要求加粗' : '取消加粗'}`,
        category,
        enabled: true,
        impact: 'medium',
        paragraphSnippet: snippet
      })
    }

    // 5. Italic
    const targetItalic = Boolean(targetStyle.italic)
    const curItalic = Boolean(paragraph.italic)
    if (curItalic !== targetItalic) {
      changes.push({
        id: `p-${pIdx}-italic`,
        targetType: 'paragraph',
        targetIndex: pIdx,
        property: 'italic',
        propertyName: '斜体',
        before: curItalic ? '斜体' : '常规',
        after: targetItalic ? '斜体' : '常规',
        reason: `${roleDisplayName}${targetItalic ? '要求斜体' : '常规'}`,
        category,
        enabled: true,
        impact: 'low',
        paragraphSnippet: snippet
      })
    }

    // 6. Alignment
    if (targetStyle.alignment) {
      const curAlign = paragraph.alignment || 'left'
      if (curAlign !== targetStyle.alignment) {
        changes.push({
          id: `p-${pIdx}-alignment`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'alignment',
          propertyName: '对齐方式',
          before: curAlign,
          after: targetStyle.alignment,
          reason: `${roleDisplayName}对齐方式设为 ${targetStyle.alignment}`,
          category,
          enabled: true,
          impact: 'medium',
          paragraphSnippet: snippet
        })
      }
    }

    // 7. First Line Indent (Chars)
    if (targetStyle.firstLineIndentChars !== undefined) {
      const curIndent = paragraph.firstLineIndentChars ?? 0
      if (!isFloatEqual(curIndent, targetStyle.firstLineIndentChars, TOLERANCES.indentChars)) {
        changes.push({
          id: `p-${pIdx}-first-line-indent`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'first-line-indent',
          propertyName: '首行缩进',
          before: `${curIndent} 字符`,
          after: `${targetStyle.firstLineIndentChars} 字符`,
          reason: `${roleDisplayName}首行缩进规范为 ${targetStyle.firstLineIndentChars} 字符`,
          category,
          enabled: true,
          impact: 'high',
          paragraphSnippet: snippet
        })
      }
    }

    // 8. Line Spacing (Pt)
    if (targetStyle.lineSpacingPt !== undefined) {
      if (paragraph.lineSpacing !== undefined && !isFloatEqual(paragraph.lineSpacing, targetStyle.lineSpacingPt, TOLERANCES.lineSpacingPt)) {
        changes.push({
          id: `p-${pIdx}-line-spacing`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'line-spacing',
          propertyName: '行距',
          before: `${paragraph.lineSpacing} pt`,
          after: `${targetStyle.lineSpacingPt} pt`,
          reason: `${roleDisplayName}行距规范为 ${targetStyle.lineSpacingPt} pt`,
          category,
          enabled: true,
          impact: 'medium',
          paragraphSnippet: snippet
        })
      }
    }

    // 9. Space Before / After
    if (targetStyle.spaceBeforePt !== undefined && paragraph.spaceBefore !== undefined) {
      if (!isFloatEqual(paragraph.spaceBefore, targetStyle.spaceBeforePt, TOLERANCES.lineSpacingPt)) {
        changes.push({
          id: `p-${pIdx}-space-before`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'space-before',
          propertyName: '段前间距',
          before: `${paragraph.spaceBefore} pt`,
          after: `${targetStyle.spaceBeforePt} pt`,
          reason: `${roleDisplayName}段前间距调整为 ${targetStyle.spaceBeforePt} pt`,
          category,
          enabled: true,
          impact: 'low',
          paragraphSnippet: snippet
        })
      }
    }

    if (targetStyle.spaceAfterPt !== undefined && paragraph.spaceAfter !== undefined) {
      if (!isFloatEqual(paragraph.spaceAfter, targetStyle.spaceAfterPt, TOLERANCES.lineSpacingPt)) {
        changes.push({
          id: `p-${pIdx}-space-after`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'space-after',
          propertyName: '段后间距',
          before: `${paragraph.spaceAfter} pt`,
          after: `${targetStyle.spaceAfterPt} pt`,
          reason: `${roleDisplayName}段后间距调整为 ${targetStyle.spaceAfterPt} pt`,
          category,
          enabled: true,
          impact: 'low',
          paragraphSnippet: snippet
        })
      }
    }

    // 10. Outline Level
    if (targetOutlineLevel !== undefined) {
      const curOutline = paragraph.outlineLevel || 10 // 10 represents body text
      if (curOutline !== targetOutlineLevel) {
        changes.push({
          id: `p-${pIdx}-outline-level`,
          targetType: 'paragraph',
          targetIndex: pIdx,
          property: 'outline-level',
          propertyName: '大纲级别',
          before: curOutline === 10 ? '正文文本' : `${curOutline}级大纲`,
          after: targetOutlineLevel === 10 ? '正文文本' : `${targetOutlineLevel}级大纲`,
          reason: `${roleDisplayName}赋予 WPS 原生 ${targetOutlineLevel} 级大纲目录级别`,
          category: 'outline',
          enabled: true,
          impact: 'high',
          paragraphSnippet: snippet
        })
      }
    }

    return changes
  }

  /**
   * Compare table formatting against target table style
   */
  static compareTable(table: TableModel, targetStyle: TableStyle): FormatChange[] {
    const changes: FormatChange[] = []
    const tIdx = table.index

    if (!targetStyle.enabled) return changes

    // 1. Table Standard Three-line borders
    if (targetStyle.borderStyle === 'three-line') {
      changes.push({
        id: `tbl-${tIdx}-three-line`,
        targetType: 'table',
        targetIndex: tIdx,
        property: 'table-three-line',
        propertyName: '标准三线表',
        before: '常规边框',
        after: '顶底 1.5pt、表头 0.75pt',
        reason: '应用国家标准公文三线表格式规范',
        category: 'table',
        enabled: true,
        impact: 'high'
      })
    }

    // 2. Table Repeat Header Row
    if (table.rowCount > 1) {
      changes.push({
        id: `tbl-${tIdx}-header-repeat`,
        targetType: 'table',
        targetIndex: tIdx,
        property: 'table-header-repeat',
        propertyName: '跨页表头重复',
        before: '不重复',
        after: '跨页自动重复',
        reason: '确保跨页长表格顶端自动显示表头',
        category: 'table',
        enabled: true,
        impact: 'medium'
      })
    }

    // 3. Table Window Alignment & AutoFit
    changes.push({
      id: `tbl-${tIdx}-alignment`,
      targetType: 'table',
      targetIndex: tIdx,
      property: 'table-alignment',
      propertyName: '表格版心居中与自适应',
      before: '未居中',
      after: '居中并自适应版心',
      reason: '防止表格列宽溢出右边距版心',
      category: 'table',
      enabled: true,
      impact: 'medium'
    })

    // 4. Numeric column alignment
    if (targetStyle.smartAlignNumbers && table.cells && table.cells.some(c => c.isNumeric)) {
      changes.push({
        id: `tbl-${tIdx}-numeric-align`,
        targetType: 'table',
        targetIndex: tIdx,
        property: 'table-column-align',
        propertyName: '数字/金额列靠右对齐',
        before: '默认对齐',
        after: '靠右对齐',
        reason: '规范报表数字与金额排版可读性',
        category: 'table',
        enabled: true,
        impact: 'low'
      })
    }

    return changes
  }
}
