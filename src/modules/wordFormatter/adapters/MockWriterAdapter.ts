import type { WriterAdapter, RunStyleChange } from './WriterAdapter'
import type { DocumentInfo, ParagraphModel, TableModel, SectionModel } from '../types/document'
import type { PageFormat, ParagraphStyle, TableStyle } from '../types/template'
import type { FormatChange } from '../types/planning'
import type { HeaderFooterConfig, PageNumberConfig } from '../types/headersFooters'
import type { TocConfig, TocInfo } from '../types/toc'
import { calculateTextSignature } from '@/shared/utils/stringUtils'

const mockParagraphs: ParagraphModel[] = [
  {
    index: 1,
    text: '示例文档标题',
    rawText: '示例文档标题\r',
    normalizedText: '示例文档标题',
    rangeStart: 0,
    rangeEnd: 7,
    alignment: 'center',
    fontSize: 22,
    bold: true,
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: false
  },
  {
    index: 2,
    text: '一、示例一级标题',
    rawText: '一、示例一级标题\r',
    normalizedText: '一、示例一级标题',
    rangeStart: 8,
    rangeEnd: 18,
    alignment: 'left',
    fontSize: 16,
    bold: true,
    chineseFont: '黑体',
    westernFont: 'Times New Roman',
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: false
  },
  {
    index: 3,
    text: '这是用于浏览器开发预览的合成正文，不包含真实业务或个人数据。',
    rawText: '这是用于浏览器开发预览的合成正文，不包含真实业务或个人数据。\r',
    normalizedText: '这是用于浏览器开发预览的合成正文，不包含真实业务或个人数据。',
    rangeStart: 19,
    rangeEnd: 50,
    alignment: 'justify',
    fontSize: 16,
    bold: false,
    chineseFont: '仿宋_GB2312',
    westernFont: 'Times New Roman',
    hasImage: false,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: false
  }
]

export class MockWriterAdapter implements WriterAdapter {
  async hasActiveDocument(): Promise<boolean> { return true }
  async getActiveDocumentInfo(): Promise<DocumentInfo> {
    return {
      id: 'mock-document',
      name: '示例文档.docx',
      path: 'C:\\Users\\TestUser\\Documents\\示例文档.docx',
      isSaved: true,
      isReadOnly: false
    }
  }
  async readParagraphs(): Promise<ParagraphModel[]> { return structuredClone(mockParagraphs) }
  async readTables(): Promise<TableModel[]> { return [] }
  async readSections(): Promise<SectionModel[]> {
    return [{ index: 1, pageWidth: 595.3, pageHeight: 841.9, topMargin: 104.9, bottomMargin: 99.2, leftMargin: 79.4, rightMargin: 73.7, orientation: 'portrait' }]
  }
  async getDocumentTextSignature(): Promise<string> { return calculateTextSignature(mockParagraphs.map(p => p.rawText || p.text)) }
  async applyPageSettings(_settings: PageFormat): Promise<void> {}
  async applyParagraphStyle(_paragraphIndex: number, _style: ParagraphStyle, _protectEmphasis?: boolean): Promise<void> {}
  async applyRangeStyle(_paragraphIndex: number, _startOffset: number, _endOffset: number, _style: RunStyleChange): Promise<void> {}
  async applyOutlineLevel(_paragraphIndex: number, _level: number): Promise<void> {}
  async applyTableStyle(_tableIndex: number, _style: TableStyle): Promise<void> {}
  async beginUndoRecord(_name: string): Promise<void> {}
  async endUndoRecord(): Promise<void> {}
  async executeNativeUndo(): Promise<boolean> { return true }
  async selectParagraph(_paragraphIndex: number): Promise<void> {}
  async setScreenUpdating(_updating: boolean): Promise<void> {}
  async applyGranularParagraphChanges(_paragraphIndex: number, _changes: FormatChange[], _targetStyle: ParagraphStyle): Promise<void> {}
  async applyGranularSectionChanges(_sectionIndex: number, _changes: FormatChange[]): Promise<void> {}
  async applyHeaderFooter(_config: HeaderFooterConfig, _sectionIndex?: number): Promise<void> {}
  async applyPageNumbers(_config: PageNumberConfig, _sectionIndex?: number): Promise<void> {}
  async detectToc(): Promise<TocInfo | null> { return { exists: false, count: 0 } }
  async insertToc(_config: TocConfig): Promise<void> {}
  async updateToc(_tocIndex?: number): Promise<void> {}
  async deleteToc(_tocIndex?: number): Promise<void> {}
  async replaceParagraphText(_paragraphIndex: number, _text: string): Promise<void> {}
  async deleteParagraph(_paragraphIndex: number): Promise<void> {}
  async saveCopyAs(_targetPath: string): Promise<boolean> { return true }
  async saveActiveDocument(): Promise<boolean> { return true }
}

export const mockWriterAdapter = new MockWriterAdapter()
