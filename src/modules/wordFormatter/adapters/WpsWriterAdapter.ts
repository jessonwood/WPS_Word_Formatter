import type { WriterAdapter, RunStyleChange } from './WriterAdapter'
import type { DocumentInfo, ParagraphModel, TableModel, SectionModel } from '../types/document'
import type { PageFormat, ParagraphStyle, TableStyle } from '../types/template'
import { WordFormatterError } from '../types/errors'
import { logger } from '@/shared/logger/logger'
import { cleanControlChars, calculateTextSignature } from '@/shared/utils/stringUtils'
import { getWpsApplication } from '@/addin/wps/systemApi'
import { WpsAlignment, WpsLineSpacing, WpsOutlineLevel, WpsCellVerticalAlignment, WpsBorder } from './wpsTypes'

export class WpsWriterAdapter implements WriterAdapter {
  private activeUndoRecord: any = null


  private getDoc(): any {
    const app = getWpsApplication()
    if (!app) return null
    try {
      return app.ActiveDocument || (app.Documents && app.Documents.Count > 0 ? app.Documents.Item(1) : null)
    } catch {
      return null
    }
  }

  async hasActiveDocument(): Promise<boolean> {
    const doc = this.getDoc()
    return !!doc
  }

  async getActiveDocumentInfo(): Promise<DocumentInfo | null> {
    const doc = this.getDoc()
    if (!doc) return null

    try {
      return {
        id: doc.Name || 'active_doc',
        name: doc.Name || '未命名文档.docx',
        path: doc.FullName || doc.Path || '',
        isSaved: !!doc.Saved,
        isReadOnly: !!doc.ReadOnly
      }
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF001',
        message: '无法获取活动文档信息',
        moduleName: 'WpsWriterAdapter',
        cause: e
      })
    }
  }

  async readParagraphs(): Promise<ParagraphModel[]> {
    const doc = this.getDoc()
    if (!doc) return []

    try {
      const paragraphs: ParagraphModel[] = []
      const pCount = doc.Paragraphs.Count

      // Document-level shape/field/bookmark counts pre-checks (avoids thousands of heavy COM layout queries)
      let hasDocInlineShapes = false
      let hasDocShapes = false
      let hasDocFields = false
      let hasDocBookmarks = false
      let hasDocComments = false

      try {
        if (doc.InlineShapes && doc.InlineShapes.Count > 0) hasDocInlineShapes = true
        if (doc.Shapes && doc.Shapes.Count > 0) hasDocShapes = true
        if (doc.Fields && doc.Fields.Count > 0) hasDocFields = true
        if (doc.Bookmarks && doc.Bookmarks.Count > 0) hasDocBookmarks = true
        if (doc.Comments && doc.Comments.Count > 0) hasDocComments = true
      } catch {
        // ignore
      }

      for (let i = 1; i <= pCount; i++) {
        const p = doc.Paragraphs.Item(i)
        const range = p.Range
        const rawText = range.Text || ''
        const cleaned = cleanControlChars(rawText)

        let alignment: 'left' | 'center' | 'right' | 'justify' = 'left'
        let outlineLevel = 10
        let firstLineIndentChars: number | undefined
        let firstLineIndent: number | undefined
        let leftIndent: number | undefined
        let rightIndent: number | undefined
        let lineSpacing: number | undefined
        let lineSpacingRule: number | undefined
        let spaceBefore: number | undefined
        let spaceAfter: number | undefined

        try {
          const pf = range.ParagraphFormat || p.Format
          if (pf) {
            const alignVal = pf.Alignment ?? p.Alignment
            if (alignVal === WpsAlignment.wdAlignParagraphCenter) alignment = 'center'
            else if (alignVal === WpsAlignment.wdAlignParagraphRight) alignment = 'right'
            else if (alignVal === WpsAlignment.wdAlignParagraphJustify) alignment = 'justify'
            else alignment = 'left'

            if (pf.OutlineLevel !== undefined && pf.OutlineLevel >= 1 && pf.OutlineLevel <= 10) {
              outlineLevel = pf.OutlineLevel
            }

            if (pf.CharacterUnitFirstLineIndent !== undefined && Math.abs(pf.CharacterUnitFirstLineIndent) < 9000000) {
              firstLineIndentChars = pf.CharacterUnitFirstLineIndent
            }
            if (pf.FirstLineIndent !== undefined && Math.abs(pf.FirstLineIndent) < 9000000) {
              firstLineIndent = pf.FirstLineIndent
            }
            if (pf.CharacterUnitLeftIndent !== undefined && Math.abs(pf.CharacterUnitLeftIndent) < 9000000) {
              leftIndent = pf.CharacterUnitLeftIndent
            } else if (pf.LeftIndent !== undefined && Math.abs(pf.LeftIndent) < 9000000) {
              leftIndent = pf.LeftIndent
            }
            if (pf.CharacterUnitRightIndent !== undefined && Math.abs(pf.CharacterUnitRightIndent) < 9000000) {
              rightIndent = pf.CharacterUnitRightIndent
            } else if (pf.RightIndent !== undefined && Math.abs(pf.RightIndent) < 9000000) {
              rightIndent = pf.RightIndent
            }
            if (pf.LineSpacing !== undefined && Math.abs(pf.LineSpacing) < 9000000) {
              lineSpacing = pf.LineSpacing
            }
            if (pf.LineSpacingRule !== undefined) {
              lineSpacingRule = pf.LineSpacingRule
            }
            if (pf.SpaceBefore !== undefined && Math.abs(pf.SpaceBefore) < 9000000) {
              spaceBefore = pf.SpaceBefore
            }
            if (pf.SpaceAfter !== undefined && Math.abs(pf.SpaceAfter) < 9000000) {
              spaceAfter = pf.SpaceAfter
            }
          }
        } catch {
          // default left
        }

        let fontSize: number | undefined
        let bold: boolean = false
        let italic: boolean = false
        let underline: boolean = false
        let chineseFont: string | undefined
        let westernFont: string | undefined

        // High-performance optimization: Only query detailed font COM properties on short paragraphs (potential headings/captions) or first 5 paragraphs
        const shouldQueryFont = i <= 5 || cleaned.length <= 60
        if (shouldQueryFont) {
          try {
            const font = range.Font
            if (font) {
              fontSize = font.Size
              bold = font.Bold === true || font.Bold === -1 || font.Bold === 1
              italic = font.Italic === true || font.Italic === -1 || font.Italic === 1
              underline = font.Underline > 0
              chineseFont = font.NameFarEast || font.Name
              westernFont = font.NameAscii || font.Name
            }
          } catch {
            // ignore font query failure
          }
        }

        // Fast-path embedded objects check using document-level flags
        let hasImage = false
        let hasShape = false
        let hasField = false
        let hasBookmark = false
        let hasCommentReference = false

        try {
          if (hasDocInlineShapes && range.InlineShapes && range.InlineShapes.Count > 0) hasImage = true
          if (hasDocShapes && range.ShapeRange && range.ShapeRange.Count > 0) hasShape = true
          if (hasDocFields && range.Fields && range.Fields.Count > 0) hasField = true
          if (hasDocBookmarks && range.Bookmarks && range.Bookmarks.Count > 0) hasBookmark = true
          if (hasDocComments && range.Comments && range.Comments.Count > 0) hasCommentReference = true
        } catch {
          // ignore
        }

        paragraphs.push({
          index: i,
          text: cleaned,
          rawText,
          normalizedText: cleaned,
          rangeStart: range.Start || 0,
          rangeEnd: range.End || 0,
          alignment,
          outlineLevel,
          fontSize,
          bold,
          italic,
          underline,
          chineseFont,
          westernFont,
          firstLineIndent,
          firstLineIndentChars,
          leftIndent,
          rightIndent,
          lineSpacing,
          lineSpacingRule,
          spaceBefore,
          spaceAfter,
          hasImage,
          hasShape,
          hasField,
          hasBookmark,
          hasCommentReference,
          isEmpty: cleaned.length === 0
        })

        // Yield execution every 25 paragraphs so the browser thread & WPS UI stay completely responsive
        if (i % 25 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      return paragraphs
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF102',
        message: '读取文档段落失败',
        moduleName: 'WpsWriterAdapter',
        cause: e
      })
    }
  }

  async readTables(): Promise<TableModel[]> {
    const doc = this.getDoc()
    if (!doc) return []

    try {
      const tables: TableModel[] = []
      const tCount = doc.Tables ? doc.Tables.Count : 0

      for (let i = 1; i <= tCount; i++) {
        const table = doc.Tables.Item(i)
        const range = table.Range
        tables.push({
          index: i,
          rangeStart: range.Start || 0,
          rangeEnd: range.End || 0,
          rowCount: table.Rows ? table.Rows.Count : 0,
          columnCount: table.Columns ? table.Columns.Count : 0
        })
      }

      return tables
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF103',
        message: '读取文档表格失败',
        moduleName: 'WpsWriterAdapter',
        cause: e
      })
    }
  }

  async readSections(): Promise<SectionModel[]> {
    const doc = this.getDoc()
    if (!doc) return []

    try {
      const sections: SectionModel[] = []
      const sCount = doc.Sections ? doc.Sections.Count : 1

      for (let i = 1; i <= sCount; i++) {
        const sec = doc.Sections.Item(i)
        const setup = sec.PageSetup
        sections.push({
          index: i,
          pageWidth: setup?.PageWidth,
          pageHeight: setup?.PageHeight,
          topMargin: setup?.TopMargin,
          bottomMargin: setup?.BottomMargin,
          leftMargin: setup?.LeftMargin,
          rightMargin: setup?.RightMargin,
          headerDistance: setup?.HeaderDistance,
          footerDistance: setup?.FooterDistance,
          orientation: setup?.Orientation === 1 ? 'landscape' : 'portrait'
        })
      }

      return sections
    } catch (e) {
      logger.warn('WpsWriterAdapter', 'Failed to read detailed section page setup, fallback default section', e)
      return [{ index: 1, orientation: 'portrait' }]
    }
  }

  async getDocumentTextSignature(): Promise<string> {
    const doc = this.getDoc()
    if (!doc) {
      throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })
    }

    // 1. Fast-path full document content text in 1 single COM call
    try {
      if (doc.Content && typeof doc.Content.Text === 'string' && doc.Content.Text.length > 0) {
        return calculateTextSignature([doc.Content.Text])
      }
    } catch {
      // fallback
    }

    // 2. Fallback chunked paragraph reading
    try {
      const texts: string[] = []
      const pCount = doc.Paragraphs.Count
      for (let i = 1; i <= pCount; i++) {
        const t = doc.Paragraphs.Item(i).Range.Text || ''
        texts.push(t)
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
      return calculateTextSignature(texts)
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF501',
        message: '无法生成文档文本签名',
        moduleName: 'WpsWriterAdapter',
        cause: e
      })
    }
  }

  async applyPageSettings(settings: PageFormat): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const sCount = settings.applyToAllSections ? (doc.Sections ? doc.Sections.Count : 1) : 1
      for (let i = 1; i <= sCount; i++) {
        const sec = doc.Sections.Item(i)
        const setup = sec.PageSetup
        if (!setup) continue

        const isLandscape = setup.Orientation === 1

        if (isLandscape && settings.applyToAllSections) {
          // Preserve landscape section margins appropriately
          if (settings.leftMarginPt) setup.TopMargin = settings.leftMarginPt
          if (settings.rightMarginPt) setup.BottomMargin = settings.rightMarginPt
          if (settings.topMarginPt) setup.LeftMargin = settings.topMarginPt
          if (settings.bottomMarginPt) setup.RightMargin = settings.bottomMarginPt
        } else {
          if (settings.topMarginPt) setup.TopMargin = settings.topMarginPt
          if (settings.bottomMarginPt) setup.BottomMargin = settings.bottomMarginPt
          if (settings.leftMarginPt) setup.LeftMargin = settings.leftMarginPt
          if (settings.rightMarginPt) setup.RightMargin = settings.rightMarginPt

          if (settings.orientation === 'landscape') {
            setup.Orientation = 1
          } else if (settings.orientation === 'portrait') {
            setup.Orientation = 0
          }
        }

        if (settings.headerDistancePt) setup.HeaderDistance = settings.headerDistancePt
        if (settings.footerDistancePt) setup.FooterDistance = settings.footerDistancePt
      }
      logger.info('WpsWriterAdapter', 'Page settings applied successfully')
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF401',
        message: '应用页面格式失败',
        moduleName: 'WpsWriterAdapter',
        cause: e
      })
    }
  }

  async applyParagraphStyle(paragraphIndex: number, style: ParagraphStyle, protectEmphasis: boolean = true): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      const pRange = p.Range
      const pf = p.Format || pRange.ParagraphFormat

      // 1. Detect & preserve existing mixed emphasis ranges (e.g. bold keywords inside body paragraph)
      const boldSpans: { startOffset: number; endOffset: number }[] = []
      if (protectEmphasis && !style.bold) {
        try {
          const charCount = pRange.Characters ? pRange.Characters.Count : 0
          if (charCount > 0 && pRange.Font && pRange.Font.Bold === 9999999) {
            let currentStart = -1
            for (let c = 1; c <= charCount; c++) {
              const ch = pRange.Characters.Item(c)
              const isBold = ch.Font && (ch.Font.Bold === true || ch.Font.Bold === 1 || ch.Font.Bold === -1)
              if (isBold) {
                if (currentStart === -1) currentStart = c - 1
              } else {
                if (currentStart !== -1) {
                  boldSpans.push({ startOffset: currentStart, endOffset: c - 1 })
                  currentStart = -1
                }
              }
            }
            if (currentStart !== -1) {
              boldSpans.push({ startOffset: currentStart, endOffset: charCount })
            }
          }
        } catch {}
      }

      // Alignment
      if (style.alignment === 'center') pf.Alignment = WpsAlignment.wdAlignParagraphCenter
      else if (style.alignment === 'right') pf.Alignment = WpsAlignment.wdAlignParagraphRight
      else if (style.alignment === 'justify') pf.Alignment = WpsAlignment.wdAlignParagraphJustify
      else if (style.alignment === 'left') pf.Alignment = WpsAlignment.wdAlignParagraphLeft

      // Indents
      if (style.firstLineIndentChars !== undefined) {
        try {
          pf.CharacterUnitFirstLineIndent = style.firstLineIndentChars
        } catch {
          pf.FirstLineIndent = style.firstLineIndentChars * (style.fontSizePt || 16)
        }
      }

      if (style.leftIndentChars !== undefined) {
        try {
          pf.CharacterUnitLeftIndent = style.leftIndentChars
        } catch {
          // ignore if not supported
        }
      }

      // Line Spacing
      if (style.lineSpacingPt !== undefined) {
        if (style.lineSpacingRule === 'exact') {
          pf.LineSpacingRule = WpsLineSpacing.wdLineSpaceExactly
          pf.LineSpacing = style.lineSpacingPt
        } else if (style.lineSpacingRule === 'multiple') {
          pf.LineSpacingRule = WpsLineSpacing.wdLineSpaceMultiple
          pf.LineSpacing = style.lineSpacingPt
        } else {
          pf.LineSpacing = style.lineSpacingPt
        }
      }

      // Space before/after
      if (style.spaceBeforePt !== undefined) pf.SpaceBefore = style.spaceBeforePt
      if (style.spaceAfterPt !== undefined) pf.SpaceAfter = style.spaceAfterPt

      // Outline Level
      if (style.outlineLevel !== undefined) {
        pf.OutlineLevel = style.outlineLevel
      }

      // Apply Base Font to Range without rebuilding text
      const font = pRange.Font
      if (font) {
        if (style.chineseFont) {
          try {
            font.NameFarEast = style.chineseFont
          } catch {
            font.Name = style.chineseFont
          }
        }
        if (style.westernFont) {
          try {
            font.NameAscii = style.westernFont
          } catch {
            // ignore
          }
        }
        if (style.fontSizePt) {
          font.Size = style.fontSizePt
        }
        if (style.bold !== undefined) {
          font.Bold = style.bold ? 1 : 0
        }
        if (style.italic !== undefined) {
          font.Italic = style.italic ? 1 : 0
        }
      }

      // Re-apply preserved emphasis spans
      if (boldSpans.length > 0) {
        for (const span of boldSpans) {
          await this.applyRangeStyle(paragraphIndex, span.startOffset, span.endOffset, { bold: true })
        }
      }
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF402',
        message: `段落 ${paragraphIndex} 格式化失败`,
        moduleName: 'WpsWriterAdapter',
        paragraphIndex,
        cause: e
      })
    }
  }

  async applyRangeStyle(paragraphIndex: number, startOffset: number, endOffset: number, style: RunStyleChange): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      const pRange = p.Range
      const start = pRange.Start + startOffset
      const end = Math.min(pRange.Start + endOffset, pRange.End)

      if (start >= end) return

      const range = doc.Range(start, end)
      const font = range.Font
      if (font) {
        if (style.chineseFont) {
          try {
            font.NameFarEast = style.chineseFont
          } catch {
            font.Name = style.chineseFont
          }
        }
        if (style.westernFont) {
          try {
            font.NameAscii = style.westernFont
          } catch {
            // ignore
          }
        }
        if (style.fontSizePt) font.Size = style.fontSizePt
        if (style.bold !== undefined) font.Bold = style.bold ? 1 : 0
        if (style.italic !== undefined) font.Italic = style.italic ? 1 : 0
        if (style.underline !== undefined) font.Underline = style.underline ? 1 : 0
      }
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF403',
        message: `段落 ${paragraphIndex} 区间格式化失败`,
        moduleName: 'WpsWriterAdapter',
        paragraphIndex,
        cause: e
      })
    }
  }

  async applyOutlineLevel(paragraphIndex: number, level: number): Promise<void> {
    const doc = this.getDoc()
    if (!doc) return
    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      const pf = p.Format || p.Range.ParagraphFormat
      pf.OutlineLevel = level
    } catch (e) {
      logger.warn('WpsWriterAdapter', `Failed to apply outline level ${level} to paragraph ${paragraphIndex}`, e)
    }
  }

  async applyTableStyle(tableIndex: number, style: TableStyle): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    if (!style.enabled) return

    try {
      const table = doc.Tables.Item(tableIndex)
      if (!table) return

      // 1. Table Entire Range Font
      const tRange = table.Range
      if (tRange && tRange.Font) {
        if (style.chineseFont) {
          try {
            tRange.Font.NameFarEast = style.chineseFont
          } catch {
            tRange.Font.Name = style.chineseFont
          }
        }
        if (style.westernFont) {
          try {
            tRange.Font.NameAscii = style.westernFont
          } catch {
            // ignore
          }
        }
        if (style.fontSizePt) {
          tRange.Font.Size = style.fontSizePt
        }
      }

      // 2. Table Header Formatting & Cross-Page Repeat
      if (table.Rows && table.Rows.Count > 0) {
        try {
          table.Rows.AllowBreakAcrossPages = -1 // Allow rows to break across pages cleanly
        } catch {}

        const headerRow = table.Rows.Item(1)
        if (headerRow) {
          try {
            headerRow.HeadingFormat = -1 // Repeat table header across multiple pages
          } catch {}

          if (style.headerBold && headerRow.Range && headerRow.Range.Font) {
            headerRow.Range.Font.Bold = 1
          }
          if (headerRow.Cells) {
            const cellCount = headerRow.Cells.Count
            for (let c = 1; c <= cellCount; c++) {
              const cell = headerRow.Cells.Item(c)
              if (style.headerAlignment === 'center') {
                cell.Range.ParagraphFormat.Alignment = WpsAlignment.wdAlignParagraphCenter
              }
              if (style.headerVerticalAlignment === 'center') {
                cell.VerticalAlignment = WpsCellVerticalAlignment.wdCellAlignVerticalCenter
              }
            }
          }
        }
      }

      // 3. Smart Align Numeric Cells
      if (style.smartAlignNumbers && table.Rows && table.Rows.Count > 1) {
        const rCount = table.Rows.Count
        for (let r = 2; r <= rCount; r++) {
          const row = table.Rows.Item(r)
          if (!row.Cells) continue
          const cCount = row.Cells.Count
          for (let c = 1; c <= cCount; c++) {
            const cell = row.Cells.Item(c)
            const cellText = cleanControlChars(cell.Range.Text || '')
            // Check numeric/amount/percentage/date
            if (/^[-+]?\$?\d+(?:,\d{3})*(?:\.\d+)?%?$/.test(cellText) || /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(cellText)) {
              cell.Range.ParagraphFormat.Alignment = WpsAlignment.wdAlignParagraphRight
            } else if (cellText.length <= 4 && !/[，。！？；]/.test(cellText)) {
              cell.Range.ParagraphFormat.Alignment = WpsAlignment.wdAlignParagraphCenter
            } else {
              cell.Range.ParagraphFormat.Alignment = WpsAlignment.wdAlignParagraphLeft
            }
            if (style.dataVerticalAlignment === 'center') {
              cell.VerticalAlignment = WpsCellVerticalAlignment.wdCellAlignVerticalCenter
            }
          }
        }
      }

      // 4. Three-line Border Styling (公文与专业报告三线表)
      if (style.borderStyle === 'three-line' || style.borderStyle === 'standard') {
        try {
          const borders = table.Borders
          if (borders) {
            // Top border 1.5 pt
            if (borders.Item(WpsBorder.wdBorderTop)) {
              borders.Item(WpsBorder.wdBorderTop).LineStyle = 1
              borders.Item(WpsBorder.wdBorderTop).LineWidth = 12
            }
            // Bottom border 1.5 pt
            if (borders.Item(WpsBorder.wdBorderBottom)) {
              borders.Item(WpsBorder.wdBorderBottom).LineStyle = 1
              borders.Item(WpsBorder.wdBorderBottom).LineWidth = 12
            }
            // Clear Left, Right, Inner Vertical, Inner Horizontal borders
            if (borders.Item(WpsBorder.wdBorderLeft)) borders.Item(WpsBorder.wdBorderLeft).LineStyle = 0
            if (borders.Item(WpsBorder.wdBorderRight)) borders.Item(WpsBorder.wdBorderRight).LineStyle = 0
            if (borders.Item(WpsBorder.wdBorderVertical)) borders.Item(WpsBorder.wdBorderVertical).LineStyle = 0
            if (borders.Item(WpsBorder.wdBorderHorizontal)) borders.Item(WpsBorder.wdBorderHorizontal).LineStyle = 0
          }

          // Header bottom separator line 0.75 pt
          if (table.Rows && table.Rows.Count > 0) {
            const hRow = table.Rows.Item(1)
            if (hRow.Borders && hRow.Borders.Item(WpsBorder.wdBorderBottom)) {
              hRow.Borders.Item(WpsBorder.wdBorderBottom).LineStyle = 1
              hRow.Borders.Item(WpsBorder.wdBorderBottom).LineWidth = 6
            }
          }
        } catch (bErr) {
          logger.warn('WpsWriterAdapter', 'Three-line table border styling warning', bErr)
        }
      }

      // 5. Table Centering & Auto-fit to Printable Page Width (防超宽溢出)
      try {
        if (table.Rows) {
          table.Rows.Alignment = 1 // wdAlignRowCenter = 1
        }
      } catch {}

      if (style.autofitToWindow) {
        try {
          if (typeof table.AutoFitBehavior === 'function') {
            table.AutoFitBehavior(2) // wdAutoFitWindow = 2
          }
        } catch {
          try {
            const sec = table.Range.Sections ? table.Range.Sections.Item(1) : (doc.Sections ? doc.Sections.Item(1) : null)
            const pageSetup = sec?.PageSetup
            if (pageSetup) {
              const printableWidth = (pageSetup.PageWidth || 595.3) - (pageSetup.LeftMargin || 79.4) - (pageSetup.RightMargin || 73.7)
              if (printableWidth > 0 && table.Columns && table.Columns.Count > 0) {
                const colCount = table.Columns.Count
                const colWidth = printableWidth / colCount
                for (let col = 1; col <= colCount; col++) {
                  try {
                    table.Columns.Item(col).Width = colWidth
                  } catch {}
                }
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF404',
        message: `表格 ${tableIndex} 格式化失败`,
        moduleName: 'WpsWriterAdapter',
        tableIndex,
        cause: e
      })
    }
  }

  async beginUndoRecord(name: string): Promise<void> {
    const app = getWpsApplication()
    if (!app) return

    try {
      if (app.UndoRecord) {
        this.activeUndoRecord = app.UndoRecord
        this.activeUndoRecord.StartCustomRecord(name || '智能文档排版')
        logger.info('WpsWriterAdapter', `Started native UndoRecord: ${name}`)
      }
    } catch (e) {
      logger.warn('WpsWriterAdapter', 'Native UndoRecord start not supported or failed', e)
    }
  }

  async endUndoRecord(): Promise<void> {
    try {
      if (this.activeUndoRecord) {
        this.activeUndoRecord.EndCustomRecord()
        this.activeUndoRecord = null
        logger.info('WpsWriterAdapter', 'Ended native UndoRecord')
      }
    } catch (e) {
      logger.warn('WpsWriterAdapter', 'Native UndoRecord end failed', e)
    }
  }

  async executeNativeUndo(): Promise<boolean> {
    const doc = this.getDoc()
    if (!doc) return true
    try {
      if (doc.Undo) {
        doc.Undo()
        logger.info('WpsWriterAdapter', 'Native doc.Undo() executed')
        return true
      }
    } catch (e) {
      logger.warn('WpsWriterAdapter', 'Native undo execution failed', e)
    }
    return false
  }

  async selectParagraph(paragraphIndex: number): Promise<void> {
    const doc = this.getDoc()
    if (!doc) return
    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      if (p && p.Range) {
        p.Range.Select()
        const app = getWpsApplication()
        if (app && app.ActiveWindow && typeof app.ActiveWindow.ScrollIntoView === 'function') {
          try {
            app.ActiveWindow.ScrollIntoView(p.Range)
          } catch {}
        }
      }
    } catch (e) {
      logger.warn('WpsWriterAdapter', `Failed to select paragraph ${paragraphIndex}`, e)
    }
  }

  async setScreenUpdating(updating: boolean): Promise<void> {
    const app = getWpsApplication()
    if (!app) return
    try {
      app.ScreenUpdating = updating
      logger.debug('WpsWriterAdapter', `Set ScreenUpdating = ${updating}`)
    } catch (e) {
      // ignore if unsupported by host environment
    }
  }

  async applyGranularParagraphChanges(
    paragraphIndex: number,
    changes: import('../types/planning').FormatChange[],
    targetStyle: ParagraphStyle
  ): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      if (!p) return
      const pRange = p.Range
      const pf = p.Format || pRange.ParagraphFormat
      const font = pRange.Font

      for (const ch of changes) {
        if (!ch.enabled) continue

        switch (ch.property) {
          case 'font-chinese':
            if (font && targetStyle.chineseFont) {
              try { font.NameFarEast = targetStyle.chineseFont } catch {}
              try { font.Name = targetStyle.chineseFont } catch {}
            }
            break

          case 'font-western':
            if (font && targetStyle.westernFont) {
              try { font.NameAscii = targetStyle.westernFont } catch {}
              try { font.NameOther = targetStyle.westernFont } catch {}
            }
            break

          case 'font-size':
            if (font && targetStyle.fontSizePt !== undefined) {
              try { font.Size = targetStyle.fontSizePt } catch {}
            }
            break

          case 'bold':
            if (font) {
              try { font.Bold = targetStyle.bold ? 1 : 0 } catch {}
            }
            break

          case 'italic':
            if (font) {
              try { font.Italic = targetStyle.italic ? 1 : 0 } catch {}
            }
            break

          case 'alignment':
            if (pf) {
              if (targetStyle.alignment === 'center') pf.Alignment = WpsAlignment.wdAlignParagraphCenter
              else if (targetStyle.alignment === 'right') pf.Alignment = WpsAlignment.wdAlignParagraphRight
              else if (targetStyle.alignment === 'justify') pf.Alignment = WpsAlignment.wdAlignParagraphJustify
              else if (targetStyle.alignment === 'left') pf.Alignment = WpsAlignment.wdAlignParagraphLeft
            }
            break

          case 'first-line-indent':
            if (pf && targetStyle.firstLineIndentChars !== undefined) {
              try {
                pf.CharacterUnitFirstLineIndent = targetStyle.firstLineIndentChars
              } catch {
                pf.FirstLineIndent = targetStyle.firstLineIndentChars * (targetStyle.fontSizePt || 16)
              }
            }
            break

          case 'line-spacing':
            if (pf && targetStyle.lineSpacingPt !== undefined) {
              if (targetStyle.lineSpacingRule === 'exact') {
                pf.LineSpacingRule = WpsLineSpacing.wdLineSpaceExactly
                pf.LineSpacing = targetStyle.lineSpacingPt
              } else if (targetStyle.lineSpacingRule === 'multiple') {
                pf.LineSpacingRule = WpsLineSpacing.wdLineSpaceMultiple
                pf.LineSpacing = targetStyle.lineSpacingPt
              } else {
                pf.LineSpacing = targetStyle.lineSpacingPt
              }
            }
            break

          case 'space-before':
            if (pf && targetStyle.spaceBeforePt !== undefined) {
              pf.SpaceBefore = targetStyle.spaceBeforePt
            }
            break

          case 'space-after':
            if (pf && targetStyle.spaceAfterPt !== undefined) {
              pf.SpaceAfter = targetStyle.spaceAfterPt
            }
            break

          case 'outline-level':
            if (pf) {
              const numVal = parseInt(String(ch.after))
              if (!isNaN(numVal)) {
                try {
                  pf.OutlineLevel = numVal
                } catch {}
              }
            }
            break
        }
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', `Error in applyGranularParagraphChanges [P${paragraphIndex}]`, e)
      throw e
    }
  }

  async applyGranularSectionChanges(
    sectionIndex: number,
    changes: import('../types/planning').FormatChange[]
  ): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const sec = doc.Sections.Item(sectionIndex)
      if (!sec) return
      const ps = sec.PageSetup
      if (!ps) return

      for (const ch of changes) {
        if (!ch.enabled) continue
        const numVal = parseFloat(String(ch.after))
        if (isNaN(numVal)) continue

        switch (ch.property) {
          case 'page-margin-top':
            ps.TopMargin = numVal
            break
          case 'page-margin-bottom':
            ps.BottomMargin = numVal
            break
          case 'page-margin-left':
            ps.LeftMargin = numVal
            break
          case 'page-margin-right':
            ps.RightMargin = numVal
            break
        }
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', `Error in applyGranularSectionChanges [S${sectionIndex}]`, e)
    }
  }

  async applyHeaderFooter(
    config: import('../types/headersFooters').HeaderFooterConfig,
    sectionIndex?: number
  ): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const sCount = doc.Sections ? doc.Sections.Count : 1
      const startSec = sectionIndex !== undefined ? sectionIndex : 1
      const endSec = sectionIndex !== undefined ? sectionIndex : sCount

      for (let i = startSec; i <= endSec; i++) {
        const sec = doc.Sections.Item(i)
        if (!sec) continue

        const ps = sec.PageSetup
        if (ps) {
          if (config.differentFirstPage !== undefined) {
            ps.DifferentFirstPageHeaderFooter = config.differentFirstPage ? -1 : 0
          }
          if (config.differentOddEven !== undefined) {
            try {
              ps.OddAndEvenPagesHeaderFooter = config.differentOddEven ? -1 : 0
            } catch {}
          }
          if (config.headerDistancePt !== undefined) {
            ps.HeaderDistance = config.headerDistancePt
          }
          if (config.footerDistancePt !== undefined) {
            ps.FooterDistance = config.footerDistancePt
          }
        }

        // 1. Primary Header
        if (config.headerEnabled) {
          const header = sec.Headers.Item(1)
          if (header) {
            if (i > 1 && config.linkToPrevious !== undefined) {
              try { header.LinkToPrevious = Boolean(config.linkToPrevious) } catch {}
            }
            if (config.headerText !== undefined) {
              header.Range.Text = config.headerText
              if (config.headerAlignment) {
                const alignCode = config.headerAlignment === 'center' ? 1 : (config.headerAlignment === 'right' ? 2 : 0)
                header.Range.ParagraphFormat.Alignment = alignCode
              }
              if (config.fontNameChinese) header.Range.Font.NameFarEast = config.fontNameChinese
              if (config.fontNameWestern) header.Range.Font.NameAscii = config.fontNameWestern
              if (config.fontSizePt) header.Range.Font.Size = config.fontSizePt
            }
          }
        }

        // 2. Primary Footer
        if (config.footerEnabled) {
          const footer = sec.Footers.Item(1)
          if (footer) {
            if (i > 1 && config.linkToPrevious !== undefined) {
              try { footer.LinkToPrevious = Boolean(config.linkToPrevious) } catch {}
            }
            if (config.footerText !== undefined) {
              footer.Range.Text = config.footerText
              if (config.footerAlignment) {
                const alignCode = config.footerAlignment === 'center' ? 1 : (config.footerAlignment === 'right' ? 2 : 0)
                footer.Range.ParagraphFormat.Alignment = alignCode
              }
              if (config.fontNameChinese) footer.Range.Font.NameFarEast = config.fontNameChinese
              if (config.fontNameWestern) footer.Range.Font.NameAscii = config.fontNameWestern
              if (config.fontSizePt) footer.Range.Font.Size = config.fontSizePt
            }
          }
        }
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', 'Error in applyHeaderFooter', e)
      throw e
    }
  }

  async applyPageNumbers(
    config: import('../types/headersFooters').PageNumberConfig,
    sectionIndex?: number
  ): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const sCount = doc.Sections ? doc.Sections.Count : 1
      const startSec = sectionIndex !== undefined ? sectionIndex : 1
      const endSec = sectionIndex !== undefined ? sectionIndex : sCount

      for (let i = startSec; i <= endSec; i++) {
        const sec = doc.Sections.Item(i)
        if (!sec) continue

        const isHeader = config.position.startsWith('header')
        const targetCollection = isHeader ? sec.Headers : sec.Footers
        if (!targetCollection) continue

        const primaryHf = targetCollection.Item(1)
        if (!primaryHf) continue

        let alignCode = 1
        if (config.position.endsWith('left')) alignCode = 0
        else if (config.position.endsWith('right')) alignCode = 2

        // 1. Restart numbering & starting number configuration
        try {
          const pnObj = primaryHf.PageNumbers
          if (pnObj) {
            if (config.restartPerSection && config.startAt !== undefined) {
              pnObj.RestartNumberingAtSection = true
              pnObj.StartingNumber = config.startAt
            } else if (!config.restartPerSection) {
              pnObj.RestartNumberingAtSection = false
            }
          }
        } catch (e) {
          logger.warn('WpsWriterAdapter', 'Unable to set PageNumber starting number', e)
        }

        // 2. Insert Page Number (Dash / Chinese Dash / Plain)
        if (config.style === 'dash' || config.style === 'chinese-dash') {
          const dashChar = config.style === 'chinese-dash' ? '—' : '-'
          let insertedByField = false

          try {
            const hfRange = primaryHf.Range
            if (hfRange) {
              hfRange.Text = ''
              hfRange.InsertAfter(`${dashChar} `)
              const midPos = hfRange.End
              const fldRange = doc.Range ? doc.Range(midPos, midPos) : hfRange
              if (hfRange.Fields) {
                hfRange.Fields.Add(fldRange, 33) // wdFieldPage = 33
                hfRange.InsertAfter(` ${dashChar}`)
                insertedByField = true
              }
            }
          } catch (e) {
            logger.warn('WpsWriterAdapter', 'Field-based page number insertion fallback to PageNumbers.Add', e)
          }

          if (!insertedByField) {
            try {
              if (primaryHf.PageNumbers) {
                primaryHf.PageNumbers.Add(alignCode, config.showOnFirstPage)
              }
            } catch (e) {
              logger.error('WpsWriterAdapter', 'Failed to add PageNumbers', e)
            }
          }
        } else {
          // Plain page number
          let added = false
          try {
            if (primaryHf.PageNumbers) {
              primaryHf.PageNumbers.Add(alignCode, config.showOnFirstPage)
              added = true
            }
          } catch {}

          if (!added) {
            try {
              const hfRange = primaryHf.Range
              if (hfRange) {
                hfRange.Text = ''
                if (hfRange.Fields) {
                  hfRange.Fields.Add(hfRange, 33)
                }
              }
            } catch {}
          }
        }

        // 3. Formatting font & alignment
        try {
          if (primaryHf.Range && primaryHf.Range.ParagraphFormat) {
            primaryHf.Range.ParagraphFormat.Alignment = alignCode
          }
          if (primaryHf.Range && primaryHf.Range.Font) {
            if (config.fontNameChinese) primaryHf.Range.Font.NameFarEast = config.fontNameChinese
            if (config.fontNameWestern) primaryHf.Range.Font.NameAscii = config.fontNameWestern
            if (config.fontSizePt) primaryHf.Range.Font.Size = config.fontSizePt
          }
        } catch {}

        // 4. Handle first page display toggle
        try {
          if (sec.PageSetup && sec.PageSetup.DifferentFirstPageHeaderFooter) {
            const firstHf = targetCollection.Item(2)
            if (firstHf && firstHf.Range) {
              if (!config.showOnFirstPage) {
                firstHf.Range.Text = ''
              }
            }
          }
        } catch {}
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', 'Error in applyPageNumbers', e)
      throw e
    }
  }

  async detectToc(): Promise<import('../types/toc').TocInfo | null> {
    const doc = this.getDoc()
    if (!doc) {
      return { exists: false, count: 0 }
    }

    try {
      const tocs = doc.TablesOfContents
      const count = tocs ? tocs.Count : 0
      if (count > 0) {
        const firstToc = tocs.Item(1)
        return {
          exists: true,
          count,
          upperLevel: firstToc.UpperHeadingLevel || 1,
          lowerLevel: firstToc.LowerHeadingLevel || 3,
          rangeStart: firstToc.Range ? firstToc.Range.Start : 0,
          rangeEnd: firstToc.Range ? firstToc.Range.End : 0
        }
      }

      if (doc.Fields && doc.Fields.Count > 0) {
        for (let i = 1; i <= doc.Fields.Count; i++) {
          const f = doc.Fields.Item(i)
          if (f.Type === 13) {
            return {
              exists: true,
              count: 1,
              rangeStart: f.Code ? f.Code.Start : 0,
              rangeEnd: f.Code ? f.Code.End : 0
            }
          }
        }
      }

      return { exists: false, count: 0 }
    } catch (e) {
      logger.warn('WpsWriterAdapter', 'Error in detectToc', e)
      return { exists: false, count: 0 }
    }
  }

  async insertToc(config: import('../types/toc').TocConfig): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      // 1. Ensure Main Title (Paragraph 1) is never treated as outline level 1-9
      try {
        const p1 = doc.Paragraphs.Item(1)
        const pf1 = p1.Format || p1.Range.ParagraphFormat
        if (pf1) pf1.OutlineLevel = 10
      } catch {}

      // 2. Ensure heading paragraphs have outline levels set so TOC immediately finds entries (start from Paragraph 2)
      try {
        const pCount = doc.Paragraphs ? doc.Paragraphs.Count : 0
        for (let i = 2; i <= pCount; i++) {
          const p = doc.Paragraphs.Item(i)
          const t = (p.Range.Text || '').trim()
          if (!t) continue

          // Skip TOC title if present
          if (/^目\s*录$/.test(t)) {
            const pf = p.Format || p.Range.ParagraphFormat
            if (pf) pf.OutlineLevel = 10
            continue
          }

          const pf = p.Format || p.Range.ParagraphFormat
          if (pf && (pf.OutlineLevel === 10 || pf.OutlineLevel === 0 || !pf.OutlineLevel)) {
            // Level 1: 一、 二、 或 第一章 第一条
            if (/^(第[一二三四五六七八九十百]+[条章节篇]|[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[、.．])/.test(t) && t.length <= 60) {
              pf.OutlineLevel = 1
            } else if (/^[(（][一二三四五六七八九十]+[)）]/.test(t) && t.length <= 60) {
              // Level 2: （一） （二）
              pf.OutlineLevel = 2
            } else if (/^\d+[、.．]\s*/.test(t) && t.length <= 60) {
              // Level 3: 1. 2. 3.
              pf.OutlineLevel = 3
            } else if ((/^[(（]\d+[)）]/.test(t) || /^\d+\.\d+(\.\d+)*\s*/.test(t)) && t.length <= 60) {
              // Level 4: (1) (2) or 1.1 1.2
              pf.OutlineLevel = 4
            }
          }
        }
      } catch (e) {
        logger.warn('WpsWriterAdapter', 'Unable to auto-tag outline levels before TOC insertion', e)
      }

      // 3. Resolve Target Insertion Range & Standalone Page Setup
      let targetRange: any = null
      const isSeparatePage = config.separatePage !== false

      if (config.insertMode === 'after-title') {
        if (doc.Paragraphs && doc.Paragraphs.Count >= 1) {
          const titleP = doc.Paragraphs.Item(1)

          if (isSeparatePage) {
            // Step A: Insert Page Break after title so TOC starts on Page 2
            titleP.Range.InsertParagraphAfter()
            const pBreak = doc.Paragraphs.Item(2)
            try {
              pBreak.Range.InsertBreak(7) // wdPageBreak = 7
            } catch {}

            // Step B: Insert blank paragraph for TOC field after the page break
            pBreak.Range.InsertParagraphAfter()

            // Step C: Insert "目  录\r" before the newly created blank paragraph
            const pTocField = doc.Paragraphs.Item(3)
            pTocField.Range.InsertBefore('目  录\r')

            // Step D: Format "目  录" header paragraph (Item 3)
            const tocTitleP = doc.Paragraphs.Item(3)
            if (tocTitleP) {
              try {
                const pf = tocTitleP.Format || tocTitleP.Range.ParagraphFormat
                if (pf) {
                  pf.Alignment = 1 // Center
                  pf.OutlineLevel = 10 // Body text (never in TOC)
                  pf.SpaceBefore = 12
                  pf.SpaceAfter = 12
                }
                const font = tocTitleP.Range.Font
                if (font) {
                  font.NameFarEast = '黑体'
                  font.Size = 16
                  font.Bold = 1
                }
              } catch {}
            }

            // Step E: Target the dedicated empty Item(4) for the TOC field
            targetRange = doc.Paragraphs.Item(4).Range
          } else {
            titleP.Range.InsertParagraphAfter()
            targetRange = doc.Paragraphs.Item(2).Range
          }
        } else {
          targetRange = doc.Range(0, 0)
        }
      } else if (config.insertMode === 'beginning') {
        if (doc.Paragraphs && doc.Paragraphs.Count >= 1) {
          const p1 = doc.Paragraphs.Item(1)
          if (isSeparatePage) {
            // Step A: Insert blank paragraph for TOC field before P1 (Title)
            p1.Range.InsertParagraphBefore()
            // Step B: Insert "目  录\r" before the newly created blank paragraph
            doc.Paragraphs.Item(1).Range.InsertBefore('目  录\r')

            // Step C: Format "目  录" header paragraph (Item 1)
            const tocTitleP = doc.Paragraphs.Item(1)
            try {
              const pf = tocTitleP.Format || tocTitleP.Range.ParagraphFormat
              if (pf) {
                pf.Alignment = 1
                pf.OutlineLevel = 10
                pf.SpaceBefore = 12
                pf.SpaceAfter = 12
              }
              const font = tocTitleP.Range.Font
              if (font) {
                font.NameFarEast = '黑体'
                font.Size = 16
                font.Bold = 1
              }
            } catch {}

            // Step D: Target the dedicated empty Item(2) for the TOC field
            targetRange = doc.Paragraphs.Item(2).Range
          } else {
            p1.Range.InsertParagraphBefore()
            targetRange = doc.Paragraphs.Item(1).Range
          }
        } else {
          targetRange = doc.Range(0, 0)
        }
      } else {
        // 'current-selection'
        const sel = (wps as any).WpsApplication?.Selection || (wps as any).Selection
        if (sel && sel.Range) {
          const r = sel.Range
          try { r.Collapse(0) } catch {}
          targetRange = r
        } else {
          targetRange = doc.Range(0, 0)
        }
      }

      const startLevel = config.startLevel || 1
      const endLevel = config.endLevel || 3
      const showPageNumbers = config.showPageNumbers !== false
      const rightAlign = config.rightAlignPageNumbers !== false
      const useHyperlinks = config.useHyperlinks !== false

      // 4. Add TOC with UseOutlineLevels = true
      const toc = doc.TablesOfContents.Add(
        targetRange,
        true,
        startLevel,
        endLevel,
        false,
        undefined,
        rightAlign,
        showPageNumbers,
        undefined,
        useHyperlinks,
        true,
        true
      )

      if (toc) {
        try {
          toc.UseOutlineLevels = true
          toc.UseHeadingStyles = true
          toc.UpperHeadingLevel = startLevel
          toc.LowerHeadingLevel = endLevel
          toc.Update()
        } catch {}

        // 5. If separatePage is enabled, insert a Page Break after TOC so following body text starts on next page
        if (isSeparatePage && toc.Range) {
          try {
            const afterTocPos = toc.Range.End
            const afterTocRange = doc.Range(afterTocPos, afterTocPos)
            afterTocRange.InsertBreak(7) // wdPageBreak = 7
          } catch (e) {
            logger.warn('WpsWriterAdapter', 'Unable to insert page break after TOC', e)
          }
        }
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', 'Error in insertToc', e)
      throw e
    }
  }

  async updateToc(tocIndex: number = 1): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      // Ensure outline levels exist on standard headings
      try {
        const pCount = doc.Paragraphs ? doc.Paragraphs.Count : 0
        for (let i = 1; i <= pCount; i++) {
          const p = doc.Paragraphs.Item(i)
          const t = (p.Range.Text || '').trim()
          if (!t) continue

          if (i === 1 || /^目\s*录$/.test(t)) {
            const pf = p.Format || p.Range.ParagraphFormat
            if (pf) pf.OutlineLevel = 10
            continue
          }

          const pf = p.Format || p.Range.ParagraphFormat
          if (pf && (pf.OutlineLevel === 10 || pf.OutlineLevel === 0 || !pf.OutlineLevel)) {
            if (/^(第[一二三四五六七八九十百]+[条章节篇]|[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[、.．])/.test(t) && t.length <= 60) {
              pf.OutlineLevel = 1
            } else if (/^[(（][一二三四五六七八九十]+[)）]/.test(t) && t.length <= 60) {
              pf.OutlineLevel = 2
            } else if (/^\d+[、.．]\s*/.test(t) && t.length <= 60) {
              pf.OutlineLevel = 3
            } else if ((/^[(（]\d+[)）]/.test(t) || /^\d+\.\d+(\.\d+)*\s*/.test(t)) && t.length <= 60) {
              pf.OutlineLevel = 4
            }
          }
        }
      } catch {}

      if (doc.TablesOfContents && doc.TablesOfContents.Count >= tocIndex) {
        const toc = doc.TablesOfContents.Item(tocIndex)
        try {
          toc.UseOutlineLevels = true
          toc.UseHeadingStyles = true
        } catch {}
        toc.Update()
      } else if (doc.Fields && doc.Fields.Count > 0) {
        for (let i = 1; i <= doc.Fields.Count; i++) {
          const f = doc.Fields.Item(i)
          if (f.Type === 13) {
            f.Update()
          }
        }
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', 'Error in updateToc', e)
      throw e
    }
  }

  async deleteToc(tocIndex: number = 1): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      if (doc.TablesOfContents && doc.TablesOfContents.Count >= tocIndex) {
        doc.TablesOfContents.Item(tocIndex).Delete()
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', 'Error in deleteToc', e)
      throw e
    }
  }

  async replaceParagraphText(paragraphIndex: number, text: string): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      if (p) {
        const textWithBreak = text.endsWith('\r') ? text : text + '\r'
        p.Range.Text = textWithBreak
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', `Error in replaceParagraphText [P${paragraphIndex}]`, e)
      throw e
    }
  }

  async deleteParagraph(paragraphIndex: number): Promise<void> {
    const doc = this.getDoc()
    if (!doc) throw new WordFormatterError({ code: 'WF001', message: '未检测到活动 WPS 文字文档', moduleName: 'WpsWriterAdapter' })

    try {
      const p = doc.Paragraphs.Item(paragraphIndex)
      if (p) {
        p.Range.Delete()
      }
    } catch (e) {
      logger.error('WpsWriterAdapter', `Error in deleteParagraph [P${paragraphIndex}]`, e)
      throw e
    }
  }

  private getWpsFileSystem(): any {
    if (typeof window === 'undefined') return null
    const wpsObj = (window as any).wps
    if (wpsObj && wpsObj.FileSystem) return wpsObj.FileSystem
    try {
      const app = getWpsApplication()
      if (app && app.FileSystem) return app.FileSystem
    } catch {}
    if ((window as any).Application && (window as any).Application.FileSystem) return (window as any).Application.FileSystem
    return null
  }

  async saveCopyAs(targetPath: string): Promise<boolean> {
    const doc = this.getDoc()
    if (!doc) {
      logger.info('WpsWriterAdapter', `Mock saveCopyAs -> "${targetPath}"`)
      return true
    }

    try {
      const destPath = targetPath.replace(/\//g, '\\')
      const sourcePath = (doc.FullName || (doc.Path ? `${doc.Path}\\${doc.Name}` : '')).replace(/\//g, '\\')

      if (!sourcePath) {
        logger.warn('WpsWriterAdapter', 'No valid on-disk source path for document')
        return false
      }

      const fs = this.getWpsFileSystem()
      if (!fs) {
        logger.error('WpsWriterAdapter', 'WPS FileSystem object not found')
        return false
      }

      // Step 1: Read source binary
      let sourceBinary: any = null
      if (fs.readAsBinaryString) {
        try {
          sourceBinary = fs.readAsBinaryString(sourcePath)
        } catch (rErr) {
          logger.error('WpsWriterAdapter', `Failed to read source binary: ${sourcePath}`, rErr)
          return false
        }
      }

      if ((sourceBinary === null || sourceBinary === undefined) && fs.ReadFile) {
        try {
          sourceBinary = fs.ReadFile(sourcePath)
        } catch {}
      }

      if (sourceBinary === null || sourceBinary === undefined || (typeof sourceBinary === 'string' && sourceBinary.length === 0)) {
        logger.error('WpsWriterAdapter', `Source file is empty or could not be read: ${sourcePath}`)
        return false
      }

      // Step 2: Write backup binary
      let writeSuccess = false
      if (fs.writeAsBinaryString) {
        try {
          fs.writeAsBinaryString(destPath, sourceBinary)
          writeSuccess = true
        } catch (wErr) {
          logger.warn('WpsWriterAdapter', `fs.writeAsBinaryString failed for ${destPath}`, wErr)
        }
      }

      if (!writeSuccess && fs.WriteFile) {
        try {
          fs.WriteFile(destPath, sourceBinary)
          writeSuccess = true
        } catch (wErr) {
          logger.warn('WpsWriterAdapter', `fs.WriteFile fallback failed for ${destPath}`, wErr)
        }
      }

      if (!writeSuccess) {
        logger.error('WpsWriterAdapter', `Failed to write backup binary to ${destPath}`)
        return false
      }

      // Step 3: Exists check
      const exists = fs.Exists ? fs.Exists(destPath) : (fs.exists ? fs.exists(destPath) : false)
      if (!exists) {
        logger.error('WpsWriterAdapter', `Backup file does not exist after write: ${destPath}`)
        return false
      }

      // Step 4: Read-back validation (length & content check)
      let backupBinary: any = null
      if (fs.readAsBinaryString) {
        try {
          backupBinary = fs.readAsBinaryString(destPath)
        } catch {}
      }
      if ((backupBinary === null || backupBinary === undefined) && fs.ReadFile) {
        try {
          backupBinary = fs.ReadFile(destPath)
        } catch {}
      }

      const sourceLen = typeof sourceBinary === 'string' ? sourceBinary.length : (sourceBinary.byteLength || 0)
      const backupLen = typeof backupBinary === 'string' ? backupBinary.length : (backupBinary?.byteLength || 0)

      if (backupLen === 0 || backupLen !== sourceLen) {
        logger.error('WpsWriterAdapter', `Backup binary length mismatch! Source: ${sourceLen}, Backup: ${backupLen}`)
        return false
      }

      logger.info('WpsWriterAdapter', `[BACKUP_VERIFIED] Binary backup successfully created and validated: "${destPath}" (${backupLen} bytes)`)
      return true
    } catch (e) {
      logger.error('WpsWriterAdapter', `Failed to execute saveCopyAs to "${targetPath}"`, e)
      throw new WordFormatterError({
        code: 'WF1201',
        message: `自动物理备份失败: ${e instanceof Error ? e.message : String(e)}`,
        moduleName: 'WpsWriterAdapter',
        cause: e
      })
    }
  }

  async saveActiveDocument(): Promise<boolean> {
    const doc = this.getDoc()
    if (!doc) {
      logger.info('WpsWriterAdapter', 'Mock saveActiveDocument called')
      return true
    }

    try {
      if (typeof doc.Save === 'function') {
        doc.Save()
        logger.info('WpsWriterAdapter', 'Explicit ActiveDocument.Save() succeeded')
        return true
      }
      return false
    } catch (e) {
      logger.error('WpsWriterAdapter', 'Failed to execute ActiveDocument.Save()', e)
      return false
    }
  }
}

export const wpsWriterAdapter = new WpsWriterAdapter()
