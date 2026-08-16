import { describe, it, expect } from 'vitest'
import { TocService } from '../src/modules/wordFormatter/core/toc/TocService'
import { TocDetector } from '../src/modules/wordFormatter/core/toc/TocDetector'
import type { TocConfig, TocInfo } from '../src/modules/wordFormatter/types/toc'
import type { WriterAdapter } from '../src/modules/wordFormatter/adapters/WriterAdapter'

class MockTocWriterAdapter implements Partial<WriterAdapter> {
  tocInfo: TocInfo | null = { exists: false, count: 0 }
  insertedConfigs: TocConfig[] = []
  updatedTocIndices: number[] = []
  deletedTocIndices: number[] = []

  async detectToc() {
    return this.tocInfo
  }

  async insertToc(config: TocConfig) {
    this.insertedConfigs.push(config)
    this.tocInfo = { exists: true, count: 1, upperLevel: config.startLevel, lowerLevel: config.endLevel }
  }

  async updateToc(tocIndex: number = 1) {
    this.updatedTocIndices.push(tocIndex)
  }

  async deleteToc(tocIndex: number = 1) {
    this.deletedTocIndices.push(tocIndex)
    this.tocInfo = { exists: false, count: 0 }
  }
}

describe('V2.2 Table of Contents (TOC) Suite', () => {
  it('1. TocDetector detects whether TOC is present', async () => {
    const adapter = new MockTocWriterAdapter()
    const detector = new TocDetector(adapter as unknown as WriterAdapter)

    const before = await detector.detect()
    expect(before.exists).toBe(false)
    expect(before.count).toBe(0)

    adapter.tocInfo = { exists: true, count: 1, upperLevel: 1, lowerLevel: 3 }
    const after = await detector.detect()
    expect(after.exists).toBe(true)
    expect(after.count).toBe(1)
  })

  it('2. TocService inserts TOC with 1~9 levels supported', async () => {
    const adapter = new MockTocWriterAdapter()
    const service = new TocService(adapter as unknown as WriterAdapter)

    await service.insert({
      startLevel: 1,
      endLevel: 4,
      insertMode: 'current-selection',
      showPageNumbers: true
    })

    expect(adapter.insertedConfigs.length).toBe(1)
    expect(adapter.insertedConfigs[0].startLevel).toBe(1)
    expect(adapter.insertedConfigs[0].endLevel).toBe(4)
    expect(adapter.insertedConfigs[0].insertMode).toBe('current-selection')
  })

  it('3. TocService update and delete', async () => {
    const adapter = new MockTocWriterAdapter()
    const service = new TocService(adapter as unknown as WriterAdapter)

    await service.insert({ startLevel: 1, endLevel: 3 })
    await service.update(1)
    expect(adapter.updatedTocIndices).toContain(1)

    await service.delete(1)
    expect(adapter.deletedTocIndices).toContain(1)

    const statusAfterDel = await service.detect()
    expect(statusAfterDel.exists).toBe(false)
  })

  it('4. TocService regenerate deletes existing and inserts new TOC', async () => {
    const adapter = new MockTocWriterAdapter()
    const service = new TocService(adapter as unknown as WriterAdapter)

    // Insert first
    await service.insert({ startLevel: 1, endLevel: 2 })

    // Regenerate with 1~5 levels
    await service.regenerate({ startLevel: 1, endLevel: 5 })

    expect(adapter.deletedTocIndices.length).toBe(1)
    expect(adapter.insertedConfigs.length).toBe(2)
    expect(adapter.insertedConfigs[1].endLevel).toBe(5)
  })
})
