import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BackupService } from '../src/modules/wordFormatter/core/backup/BackupService'
import { BackupRetention } from '../src/modules/wordFormatter/core/backup/BackupRetention'
import type { WriterAdapter } from '../src/modules/wordFormatter/adapters/WriterAdapter'
import type { DocumentInfo } from '../src/modules/wordFormatter/types/document'

describe('V2.4 Automatic Physical Backup & Saved Readiness Suite', () => {
  let mockAdapter: WriterAdapter
  let savedFiles: string[] = []

  beforeEach(() => {
    savedFiles = []

    mockAdapter = {
      hasActiveDocument: vi.fn().mockResolvedValue(true),
      getActiveDocumentInfo: vi.fn().mockResolvedValue({
        id: 'doc_001',
        name: '示例报告.docx',
        path: 'C:\\Users\\TestUser\\Documents\\示例报告.docx',
        isSaved: true,
        isReadOnly: false
      } as DocumentInfo),
      readParagraphs: vi.fn().mockResolvedValue([]),
      readTables: vi.fn().mockResolvedValue([]),
      readSections: vi.fn().mockResolvedValue([]),
      getDocumentTextSignature: vi.fn().mockResolvedValue('mock_sig'),
      applyPageSettings: vi.fn().mockResolvedValue(undefined),
      applyParagraphStyle: vi.fn().mockResolvedValue(undefined),
      applyRangeStyle: vi.fn().mockResolvedValue(undefined),
      applyOutlineLevel: vi.fn().mockResolvedValue(undefined),
      applyTableStyle: vi.fn().mockResolvedValue(undefined),
      beginUndoRecord: vi.fn().mockResolvedValue(undefined),
      endUndoRecord: vi.fn().mockResolvedValue(undefined),
      executeNativeUndo: vi.fn().mockResolvedValue(true),
      selectParagraph: vi.fn().mockResolvedValue(undefined),
      setScreenUpdating: vi.fn().mockResolvedValue(undefined),
      applyGranularParagraphChanges: vi.fn().mockResolvedValue(undefined),
      applyGranularSectionChanges: vi.fn().mockResolvedValue(undefined),
      applyHeaderFooter: vi.fn().mockResolvedValue(undefined),
      applyPageNumbers: vi.fn().mockResolvedValue(undefined),
      detectToc: vi.fn().mockResolvedValue(null),
      insertToc: vi.fn().mockResolvedValue(undefined),
      updateToc: vi.fn().mockResolvedValue(undefined),
      deleteToc: vi.fn().mockResolvedValue(undefined),
      replaceParagraphText: vi.fn().mockResolvedValue(undefined),
      deleteParagraph: vi.fn().mockResolvedValue(undefined),
      saveCopyAs: vi.fn().mockImplementation(async (targetPath: string) => {
        savedFiles.push(targetPath)
        return true
      }),
      saveActiveDocument: vi.fn().mockResolvedValue(true)
    }
  })

  it('1. BackupService.evaluateReadiness accurately classifies ready, needs-save, and unavailable', () => {
    const savedDoc: DocumentInfo = {
      id: 'doc_1',
      name: '测试文档.docx',
      path: 'C:\\Users\\TestUser\\Desktop\\TestFiles\\测试文档.docx',
      isSaved: true,
      isReadOnly: false
    }
    const r1 = BackupService.evaluateReadiness(savedDoc)
    expect(r1.status).toBe('ready')
    expect(r1.documentSaved).toBe(true)
    expect(r1.directoryWritable).toBe(true)
    expect(r1.reason).toContain('可创建包含最新内容的物理备份')

    const unsavedDoc: DocumentInfo = {
      id: 'doc_1',
      name: '测试文档.docx',
      path: 'C:\\Users\\TestUser\\Desktop\\TestFiles\\测试文档.docx',
      isSaved: false,
      isReadOnly: false
    }
    const r2 = BackupService.evaluateReadiness(unsavedDoc)
    expect(r2.status).toBe('needs-save')
    expect(r2.documentSaved).toBe(false)
    expect(r2.reason).toContain('当前文档存在未保存修改')

    const newDoc: DocumentInfo = {
      id: 'doc_new',
      name: '文档1',
      path: '',
      isSaved: false,
      isReadOnly: false
    }
    const r3 = BackupService.evaluateReadiness(newDoc)
    expect(r3.status).toBe('unavailable')
    expect(r3.documentSaved).toBe(false)
    expect(r3.reason).toContain('尚未保存到磁盘')
  })

  it('2. BackupService formats filename correctly with {baseName}_WPS排版备份_{yyyyMMdd_HHmmss}.{ext}', () => {
    const fixedDate = new Date(2026, 7, 16, 15, 30, 45)
    const originalName = '示例业务规划通知.docm'
    const backupName = BackupService.generateBackupFileName(originalName, fixedDate)

    expect(backupName).toBe('示例业务规划通知_WPS排版备份_20260816_153045.docm')
    expect(backupName.endsWith('.docm')).toBe(true)
  })

  it('3. BackupService executes backup when READY and changes exist, and skips when no changes or disabled', async () => {
    const backupService = new BackupService(mockAdapter)
    const docInfo: DocumentInfo = {
      id: 'doc_001',
      name: '测试公文.docx',
      path: 'C:\\docs\\测试公文.docx',
      isSaved: true,
      isReadOnly: false
    }

    const result1 = await backupService.backupBeforeFormat(docInfo, true)
    expect(result1.success).toBe(true)
    expect(result1.backupRecord).toBeDefined()
    expect(mockAdapter.saveCopyAs).toHaveBeenCalledTimes(1)
    expect(savedFiles.length).toBe(1)
    expect(savedFiles[0]).toContain('测试公文_WPS排版备份_')

    const result2 = await backupService.backupBeforeFormat(docInfo, false)
    expect(result2.success).toBe(true)
    expect(result2.skippedReason).toBe('no-changes-to-apply')
    expect(mockAdapter.saveCopyAs).toHaveBeenCalledTimes(1)

    backupService.updateConfig({ enabled: false })
    const result3 = await backupService.backupBeforeFormat(docInfo, true)
    expect(result3.success).toBe(true)
    expect(result3.skippedReason).toBe('backup-disabled')
    expect(mockAdapter.saveCopyAs).toHaveBeenCalledTimes(1)
  })

  it('4. User choice "不保存，继续排版" skips physical backup cleanly without error', async () => {
    const backupService = new BackupService(mockAdapter)
    const unsavedDoc: DocumentInfo = {
      id: 'doc_mod',
      name: '测试文档.docx',
      path: 'C:\\Users\\TestUser\\Desktop\\测试文档.docx',
      isSaved: false,
      isReadOnly: false
    }

    const res = await backupService.backupBeforeFormat(unsavedDoc, true, true)
    expect(res.success).toBe(true)
    expect(res.skippedReason).toBe('skipped-by-user')
    expect(mockAdapter.saveCopyAs).not.toHaveBeenCalled()
  })

  it('5. User choice "保存并继续" saves document and creates physical backup', async () => {
    const backupService = new BackupService(mockAdapter)
    const docInfo: DocumentInfo = {
      id: 'doc_mod',
      name: '测试文档.docx',
      path: 'C:\\Users\\TestUser\\Desktop\\测试文档.docx',
      isSaved: false,
      isReadOnly: false
    }

    const readiness = backupService.getReadiness(docInfo)
    expect(readiness.status).toBe('needs-save')

    const saveOk = await mockAdapter.saveActiveDocument()
    expect(saveOk).toBe(true)
    expect(mockAdapter.saveActiveDocument).toHaveBeenCalledTimes(1)

    docInfo.isSaved = true
    const updatedReadiness = backupService.getReadiness(docInfo)
    expect(updatedReadiness.status).toBe('ready')

    const backupRes = await backupService.backupBeforeFormat(docInfo, true, false)
    expect(backupRes.success).toBe(true)
    expect(mockAdapter.saveCopyAs).toHaveBeenCalledTimes(1)
    expect(savedFiles[0]).toContain('测试文档_WPS排版备份_')
  })

  it('6. BackupRetention identifies plugin backups and manages retention via history', () => {
    expect(BackupRetention.isWordFormatterBackup('测试文档_WPS排版备份_20260816_120000.docx')).toBe(true)
    expect(BackupRetention.isWordFormatterBackup('20260816_120000_测试报告.docx')).toBe(true)
    expect(BackupRetention.isWordFormatterBackup('normal_document.docx')).toBe(false)

    const sourcePath = 'C:\\Users\\TestUser\\Desktop\\TestFiles\\测试文档.docx'
    const historyItems = []
    for (let i = 1; i <= 12; i++) {
      const idx = i.toString().padStart(2, '0')
      historyItems.push({
        sourcePath,
        backupPath: `C:\\Users\\TestUser\\Desktop\\TestFiles\\测试文档_WPS排版备份_20260816_1000${idx}.docx`,
        createdAt: new Date(2026, 7, 16, 10, 0, i).toISOString(),
        sourceHash: `hash_${i}`
      })
    }

    const deletedPaths: string[] = []
    const result = BackupRetention.pruneHistory(historyItems, sourcePath, 10, (path) => {
      deletedPaths.push(path)
      return true
    })

    expect(result.updatedHistory.length).toBe(10)
    expect(result.deletedFiles.length).toBe(2)
    expect(deletedPaths).toContain('C:\\Users\\TestUser\\Desktop\\TestFiles\\测试文档_WPS排版备份_20260816_100001.docx')
    expect(deletedPaths).toContain('C:\\Users\\TestUser\\Desktop\\TestFiles\\测试文档_WPS排版备份_20260816_100002.docx')
  })
})
