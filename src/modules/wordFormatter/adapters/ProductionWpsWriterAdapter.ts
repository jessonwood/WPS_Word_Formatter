import { WpsWriterAdapter } from './WpsWriterAdapter'
import type { WriterAdapter, RunStyleChange } from './WriterAdapter'
import type { DocumentInfo, ParagraphModel, TableModel, SectionModel } from '../types/document'
import type { PageFormat, ParagraphStyle, TableStyle } from '../types/template'
import type { FormatChange } from '../types/planning'
import type { HeaderFooterConfig, PageNumberConfig } from '../types/headersFooters'
import type { TocConfig, TocInfo } from '../types/toc'
import { getWpsApplication } from '@/addin/wps/systemApi'
import { WordFormatterError } from '../types/errors'

/**
 * Strict production adapter.
 *
 * Production code uses this strict guard layer. Browser development uses the isolated
 * MockWriterAdapter selected only by adapterFactory outside the WPS host.
 */
export class ProductionWpsWriterAdapter extends WpsWriterAdapter implements WriterAdapter {
  private requireActiveDocument(): void {
    const app = getWpsApplication()
    let doc: any = null
    try {
      doc = app?.ActiveDocument || (app?.Documents && app.Documents.Count > 0 ? app.Documents.Item(1) : null)
    } catch {
      doc = null
    }

    if (!doc) {
      throw new WordFormatterError({
        code: 'WF001',
        message: '未检测到活动 WPS 文字文档。请先在 WPS Writer 中打开或保存一个文档。',
        moduleName: 'ProductionWpsWriterAdapter'
      })
    }
  }

  async hasActiveDocument(): Promise<boolean> {
    const app = getWpsApplication()
    try {
      return !!(app?.ActiveDocument || (app?.Documents && app.Documents.Count > 0 && app.Documents.Item(1)))
    } catch {
      return false
    }
  }

  async getActiveDocumentInfo(): Promise<DocumentInfo | null> {
    if (!(await this.hasActiveDocument())) return null
    return super.getActiveDocumentInfo()
  }

  async readParagraphs(): Promise<ParagraphModel[]> { this.requireActiveDocument(); return super.readParagraphs() }
  async readTables(): Promise<TableModel[]> { this.requireActiveDocument(); return super.readTables() }
  async readSections(): Promise<SectionModel[]> { this.requireActiveDocument(); return super.readSections() }
  async getDocumentTextSignature(): Promise<string> { this.requireActiveDocument(); return super.getDocumentTextSignature() }
  async applyPageSettings(settings: PageFormat): Promise<void> { this.requireActiveDocument(); return super.applyPageSettings(settings) }
  async applyParagraphStyle(paragraphIndex: number, style: ParagraphStyle, protectEmphasis?: boolean): Promise<void> { this.requireActiveDocument(); return super.applyParagraphStyle(paragraphIndex, style, protectEmphasis) }
  async applyRangeStyle(paragraphIndex: number, startOffset: number, endOffset: number, style: RunStyleChange): Promise<void> { this.requireActiveDocument(); return super.applyRangeStyle(paragraphIndex, startOffset, endOffset, style) }
  async applyOutlineLevel(paragraphIndex: number, level: number): Promise<void> { this.requireActiveDocument(); return super.applyOutlineLevel(paragraphIndex, level) }
  async applyTableStyle(tableIndex: number, style: TableStyle): Promise<void> { this.requireActiveDocument(); return super.applyTableStyle(tableIndex, style) }
  async beginUndoRecord(name: string): Promise<void> { this.requireActiveDocument(); return super.beginUndoRecord(name) }
  async endUndoRecord(): Promise<void> { return super.endUndoRecord() }
  async executeNativeUndo(): Promise<boolean> { this.requireActiveDocument(); return super.executeNativeUndo() }
  async selectParagraph(paragraphIndex: number): Promise<void> { this.requireActiveDocument(); return super.selectParagraph(paragraphIndex) }
  async setScreenUpdating(updating: boolean): Promise<void> { this.requireActiveDocument(); return super.setScreenUpdating(updating) }
  async applyGranularParagraphChanges(paragraphIndex: number, changes: FormatChange[], targetStyle: ParagraphStyle): Promise<void> { this.requireActiveDocument(); return super.applyGranularParagraphChanges(paragraphIndex, changes, targetStyle) }
  async applyGranularSectionChanges(sectionIndex: number, changes: FormatChange[]): Promise<void> { this.requireActiveDocument(); return super.applyGranularSectionChanges(sectionIndex, changes) }
  async applyHeaderFooter(config: HeaderFooterConfig, sectionIndex?: number): Promise<void> { this.requireActiveDocument(); return super.applyHeaderFooter(config, sectionIndex) }
  async applyPageNumbers(config: PageNumberConfig, sectionIndex?: number): Promise<void> { this.requireActiveDocument(); return super.applyPageNumbers(config, sectionIndex) }
  async detectToc(): Promise<TocInfo | null> { this.requireActiveDocument(); return super.detectToc() }
  async insertToc(config: TocConfig): Promise<void> { this.requireActiveDocument(); return super.insertToc(config) }
  async updateToc(tocIndex?: number): Promise<void> { this.requireActiveDocument(); return super.updateToc(tocIndex) }
  async deleteToc(tocIndex?: number): Promise<void> { this.requireActiveDocument(); return super.deleteToc(tocIndex) }
  async replaceParagraphText(paragraphIndex: number, text: string): Promise<void> { this.requireActiveDocument(); return super.replaceParagraphText(paragraphIndex, text) }
  async deleteParagraph(paragraphIndex: number): Promise<void> { this.requireActiveDocument(); return super.deleteParagraph(paragraphIndex) }
  async saveCopyAs(targetPath: string): Promise<boolean> { this.requireActiveDocument(); return super.saveCopyAs(targetPath) }
  async saveActiveDocument(): Promise<boolean> { this.requireActiveDocument(); return super.saveActiveDocument() }
}

export const productionWpsWriterAdapter = new ProductionWpsWriterAdapter()
