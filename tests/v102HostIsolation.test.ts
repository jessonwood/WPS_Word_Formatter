import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWpsApplication, getWpsHostInfo } from '../src/addin/wps/systemApi'

const originalWindow = (globalThis as any).window

function installWindow(value: any) {
  Object.defineProperty(globalThis, 'window', {
    value,
    writable: true,
    configurable: true
  })
}

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as any).window
  } else {
    installWindow(originalWindow)
  }
})

describe('v1.0.2 WPS host isolation', () => {
  it('detects ET/Spreadsheets without invoking WpsApplication factory', () => {
    const spawnWriter = vi.fn(() => ({ ActiveDocument: {} }))
    const etRoot = {
      ActiveWorkbook: { Name: 'book.xlsx' },
      Value: 'ET',
      WpsApplication: spawnWriter
    }

    installWindow({ Application: etRoot, wps: etRoot })

    const host = getWpsHostInfo()

    expect(host.isWps).toBe(true)
    expect(host.isWriter).toBe(false)
    expect(host.isSpreadsheet).toBe(true)
    expect(host.kind).toBe('spreadsheets')
    expect(getWpsApplication()).toBeNull()
    expect(spawnWriter).not.toHaveBeenCalled()
  })

  it('uses an already-running Writer root without invoking a component factory', () => {
    const spawnWriter = vi.fn(() => ({ ActiveDocument: {} }))
    const writerRoot = {
      ActiveDocument: { Name: 'doc.docx' },
      Documents: { Count: 1 },
      Value: 'WPS',
      WpsApplication: spawnWriter
    }

    installWindow({ Application: writerRoot, wps: writerRoot })

    const host = getWpsHostInfo()

    expect(host.isWps).toBe(true)
    expect(host.isWriter).toBe(true)
    expect(host.kind).toBe('writer')
    expect(getWpsApplication()).toBe(writerRoot)
    expect(spawnWriter).not.toHaveBeenCalled()
  })

  it('fails closed when only a component factory exists', () => {
    const spawnWriter = vi.fn(() => ({ ActiveDocument: {} }))
    const addinRoot = { WpsApplication: spawnWriter }

    installWindow({ wps: addinRoot })

    const host = getWpsHostInfo()

    expect(host.isWps).toBe(true)
    expect(host.isWriter).toBe(false)
    expect(host.kind).toBe('wps-unknown')
    expect(getWpsApplication()).toBeNull()
    expect(spawnWriter).not.toHaveBeenCalled()
  })

  it('keeps standalone browser development outside WPS', () => {
    installWindow({})

    const host = getWpsHostInfo()

    expect(host.isWps).toBe(false)
    expect(host.isWriter).toBe(false)
    expect(host.kind).toBe('browser')
  })
})
