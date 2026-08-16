import type { WriterAdapter } from '../../adapters/WriterAdapter'
import type { DocumentModel, ParagraphModel, TableModel, SectionModel } from '../../types/document'
import type { DocumentSnapshot, ParagraphSnapshot, SectionSnapshot, TableSnapshot } from '../../types/snapshot'
import { WordFormatterError } from '../../types/errors'
import { logger } from '@/shared/logger/logger'

export class SnapshotManager {
  private lastSnapshot: DocumentSnapshot | null = null

  constructor(private adapter: WriterAdapter) {}

  /**
   * Create a snapshot of the current document state before formatting
   */
  async createSnapshot(document: DocumentModel): Promise<DocumentSnapshot> {
    logger.info('SnapshotManager', `Creating snapshot for document: ${document.name}...`)

    try {
      const paragraphSnapshots: ParagraphSnapshot[] = document.paragraphs.map(p => ({
        index: p.index,
        text: p.text,
        styleName: p.styleName,
        alignment: p.alignment,
        outlineLevel: p.outlineLevel,
        chineseFont: p.chineseFont,
        westernFont: p.westernFont,
        fontSize: p.fontSize,
        bold: p.bold,
        italic: p.italic,
        underline: p.underline,
        fontColor: p.fontColor,
        firstLineIndent: p.firstLineIndent,
        leftIndent: p.leftIndent,
        rightIndent: p.rightIndent,
        lineSpacing: p.lineSpacing,
        lineSpacingRule: p.lineSpacingRule,
        spaceBefore: p.spaceBefore,
        spaceAfter: p.spaceAfter
      }))

      const sectionSnapshots: SectionSnapshot[] = document.sections.map(s => ({
        index: s.index,
        pageWidth: s.pageWidth,
        pageHeight: s.pageHeight,
        topMargin: s.topMargin,
        bottomMargin: s.bottomMargin,
        leftMargin: s.leftMargin,
        rightMargin: s.rightMargin,
        headerDistance: s.headerDistance,
        footerDistance: s.footerDistance,
        orientation: s.orientation
      }))

      const tableSnapshots: TableSnapshot[] = document.tables.map(t => ({
        index: t.index,
        rowCount: t.rowCount,
        columnCount: t.columnCount
      }))

      const snapshot: DocumentSnapshot = {
        id: `snap_${Date.now()}`,
        documentId: document.id,
        documentName: document.name,
        createdAt: Date.now(),
        textSignature: document.signature,
        pageSettings: sectionSnapshots,
        paragraphs: paragraphSnapshots,
        tables: tableSnapshots
      }

      this.lastSnapshot = snapshot
      logger.info('SnapshotManager', `Snapshot created successfully: ${snapshot.id} (${snapshot.paragraphs.length} paragraphs)`)
      return snapshot
    } catch (e) {
      throw new WordFormatterError({
        code: 'WF301',
        message: '创建排版快照失败',
        moduleName: 'SnapshotManager',
        cause: e
      })
    }
  }

  getLastSnapshot(): DocumentSnapshot | null {
    return this.lastSnapshot
  }

  hasSnapshot(): boolean {
    return this.lastSnapshot !== null
  }

  /**
   * Restore document to snapshot state
   */
  async restoreSnapshot(snapshot?: DocumentSnapshot): Promise<boolean> {
    const target = snapshot || this.lastSnapshot
    if (!target) {
      logger.warn('SnapshotManager', 'No snapshot available to restore')
      return false
    }

    logger.info('SnapshotManager', `Restoring snapshot ${target.id} created at ${new Date(target.createdAt).toLocaleTimeString()}...`)

    try {
      // 1. First attempt native undo if supported
      const nativeDone = await this.adapter.executeNativeUndo()
      if (nativeDone) {
        logger.info('SnapshotManager', 'Restored using native Undo record')
        return true
      }

      // 2. Fallback: Restore paragraph styles
      for (const p of target.paragraphs) {
        await this.adapter.applyParagraphStyle(p.index, {
          chineseFont: p.chineseFont || '仿宋_GB2312',
          westernFont: p.westernFont || 'Times New Roman',
          fontSizePt: p.fontSize || 16,
          bold: p.bold,
          italic: p.italic,
          underline: p.underline,
          alignment: (p.alignment as any) || 'left',
          lineSpacingPt: p.lineSpacing,
          spaceBeforePt: p.spaceBefore,
          spaceAfterPt: p.spaceAfter,
          outlineLevel: p.outlineLevel
        })
      }

      // 3. Restore section page settings if present
      if (target.pageSettings && target.pageSettings.length > 0) {
        const sec = target.pageSettings[0]
        await this.adapter.applyPageSettings({
          paperSize: 'A4',
          topMarginPt: sec.topMargin || 72,
          bottomMarginPt: sec.bottomMargin || 72,
          leftMarginPt: sec.leftMargin || 79.4,
          rightMarginPt: sec.rightMargin || 73.7,
          headerDistancePt: sec.headerDistance,
          footerDistancePt: sec.footerDistance,
          orientation: (sec.orientation as any) || 'portrait',
          applyToAllSections: true
        })
      }

      logger.info('SnapshotManager', 'Document restored to snapshot state successfully')
      return true
    } catch (e) {
      logger.error('SnapshotManager', 'Failed to restore snapshot', e)
      throw new WordFormatterError({
        code: 'WF601',
        message: '撤销/恢复快照失败',
        moduleName: 'SnapshotManager',
        cause: e
      })
    }
  }

  clear() {
    this.lastSnapshot = null
  }
}
