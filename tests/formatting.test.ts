import { describe, it, expect, vi } from 'vitest'
import { FormatEngine } from '../src/modules/wordFormatter/core/formatting/FormatEngine'
import { RecognitionEngine } from '../src/modules/wordFormatter/core/recognition/RecognitionEngine'
import { SnapshotManager } from '../src/modules/wordFormatter/core/snapshot/SnapshotManager'
import { ContentIntegrityValidator } from '../src/modules/wordFormatter/core/validation/ContentIntegrityValidator'
import { BlankLineCleaner } from '../src/modules/wordFormatter/core/cleanup/BlankLineCleaner'
import { PunctuationNormalizer } from '../src/modules/wordFormatter/core/cleanup/PunctuationNormalizer'
import { TemplateRepository } from '../src/modules/wordFormatter/templates/templateRepository'
import { governmentTemplate } from '../src/modules/wordFormatter/templates/government'
import { createSampleReportFixture } from './fixtures/sampleReports'
import type { WriterAdapter } from '../src/modules/wordFormatter/adapters/WriterAdapter'
import { WordFormatterError } from '../src/modules/wordFormatter/types/errors'

class MockWriterAdapter implements WriterAdapter {
  appliedStyles: Record<number, any> = {}
  appliedRangeStyles: any[] = []
  appliedPageSettings: any = null
  appliedTableStyles: Record<number, any> = {}
  signature: string = 'mock_signature_bank_01'
  undoStack: any[] = []

  async hasActiveDocument() { return true }
  async getActiveDocumentInfo() { return { id: 'mock', name: 'mock.docx' } }
  async readParagraphs() { return [] }
  async readTables() { return [] }
  async readSections() { return [] }
  async getDocumentTextSignature() { return this.signature }
  async applyPageSettings(s: any) { this.appliedPageSettings = s }
  async applyParagraphStyle(idx: number, style: any) { this.appliedStyles[idx] = style }
  async applyRangeStyle(idx: number, s: number, e: number, style: any) {
    this.appliedRangeStyles.push({ idx, s, e, style })
  }
  async applyOutlineLevel(_idx: number, _lvl: number) {}
  async applyTableStyle(idx: number, style: any) { this.appliedTableStyles[idx] = style }
  async beginUndoRecord(_name: string) {}
  async endUndoRecord() {}
  async executeNativeUndo() { return false }
  async selectParagraph(_idx: number) {}
  async setScreenUpdating(_u: boolean) {}
  async applyGranularParagraphChanges(idx: number, _changes: any[], style: any) {
    this.appliedStyles[idx] = style
  }
  async applyGranularSectionChanges(_idx: number, _changes: any[]) {
    this.appliedPageSettings = { topMarginPt: 105, bottomMarginPt: 100, leftMarginPt: 80, rightMarginPt: 80 }
  }
  async applyHeaderFooter(_c: any, _s?: number) {}
  async applyPageNumbers(_c: any, _s?: number) {}
  async detectToc() { return null }
  async insertToc(_c: any) {}
  async updateToc(_i?: number) {}
  async deleteToc(_i?: number) {}
  async replaceParagraphText(_idx: number, _t: string) {}
  async deleteParagraph(_idx: number) {}
  async saveCopyAs(_targetPath: string) { return true }
  async saveActiveDocument() { return true }
}

describe('Formatting Engine & Safety Validation', () => {
  it('executes full formatting and applies styles according to template', async () => {
    const adapter = new MockWriterAdapter()
    const engine = new FormatEngine(adapter)
    const recEngine = new RecognitionEngine()
    const doc = createSampleReportFixture()
    const recognition = recEngine.analyze(doc)

    const result = await engine.execute({
      document: doc,
      recognition,
      template: governmentTemplate,
      strategy: 'normalize'
    })

    expect(result.success).toBe(true)
    expect(result.formattedParagraphs).toBeGreaterThanOrEqual(19)
    expect(adapter.appliedPageSettings).toBeDefined()
    expect(adapter.appliedPageSettings.topMarginPt).toBe(governmentTemplate.page.topMarginPt)

    // Verify Main Title (P1)
    expect(adapter.appliedStyles[1]).toBeDefined()
    expect(adapter.appliedStyles[1].chineseFont).toBe('方正小标宋简体')
    expect(adapter.appliedStyles[1].alignment).toBe('center')

    // Verify Heading 1 (P5: 一、总体风险运行情况)
    expect(adapter.appliedStyles[5]).toBeDefined()
    expect(adapter.appliedStyles[5].chineseFont).toBe('黑体')

    // Verify Heading 2 with inline range (P7: （一）资产质量总体稳定。截至6月末……)
    expect(adapter.appliedRangeStyles.length).toBeGreaterThan(0)
    const inlineH2 = adapter.appliedRangeStyles.find(r => r.idx === 7)
    expect(inlineH2).toBeDefined()
    expect(inlineH2.style.chineseFont).toBe('楷体_GB2312')
  })

  it('creates snapshots and restores correctly', async () => {
    const adapter = new MockWriterAdapter()
    const snapshotMgr = new SnapshotManager(adapter)
    const doc = createSampleReportFixture()

    const snapshot = await snapshotMgr.createSnapshot(doc)
    expect(snapshot.paragraphs.length).toBe(doc.paragraphs.length)
    expect(snapshot.textSignature).toBe(doc.signature)

    // Simulate style change
    adapter.appliedStyles[1] = { chineseFont: 'NewFont', fontSizePt: 30 }

    // Restore
    const restored = await snapshotMgr.restoreSnapshot(snapshot)
    expect(restored).toBe(true)
  })

  it('validates text integrity and raises WF501 on signature mismatch', async () => {
    const adapter = new MockWriterAdapter()
    const validator = new ContentIntegrityValidator(adapter)

    // 1. Same signature -> passes
    const valid = await validator.validate('mock_signature_bank_01')
    expect(valid).toBe(true)

    // 2. Different signature -> throws WordFormatterError WF501
    await expect(validator.validate('corrupted_signature_999')).rejects.toThrow(WordFormatterError)
  })

  it('BlankLineCleaner correctly handles keep and collapse modes', () => {
    const cleaner = new BlankLineCleaner()
    const paragraphs: any[] = [
      { index: 1, isEmpty: false },
      { index: 2, isEmpty: true },
      { index: 3, isEmpty: true },
      { index: 4, isEmpty: false }
    ]

    const keepAll = cleaner.plan(paragraphs, 'keep')
    expect(keepAll.filter(a => a.action === 'remove').length).toBe(0)

    const collapse = cleaner.plan(paragraphs, 'keep-single-collapse-multiple')
    // P2 is kept (first blank), P3 is removed (second consecutive blank)
    expect(collapse.find(a => a.paragraphIndex === 2)?.action).toBe('keep')
    expect(collapse.find(a => a.paragraphIndex === 3)?.action).toBe('remove')

    const removeAll = cleaner.plan(paragraphs, 'remove-all')
    expect(removeAll.filter(a => a.action === 'remove').length).toBe(2)
  })

  it('PunctuationNormalizer safely converts Chinese punctuation without breaking URLs and numbers', () => {
    const normalizer = new PunctuationNormalizer()

    // 1. Normal conversion
    const res1 = normalizer.normalize('总体情况良好,各项指标正常;请认真贯彻执行.')
    expect(res1.normalized).toBe('总体情况良好，各项指标正常；请认真贯彻执行.')

    // 2. Exclude decimals and URLs
    const res2 = normalizer.normalize('系统地址为https://example.com/api:8080/data')
    expect(res2.normalized).toBe('系统地址为https://example.com/api:8080/data')
  })

  it('TemplateRepository correctly creates, exports and imports templates', () => {
    const repo = new TemplateRepository()

    const exported = repo.exportToJson(governmentTemplate)
    expect(exported).toContain('机关公文标准')

    const imported = repo.importFromJson(exported)
    expect(imported).toBeDefined()
    expect(imported?.isBuiltIn).toBe(false)
  })
})
