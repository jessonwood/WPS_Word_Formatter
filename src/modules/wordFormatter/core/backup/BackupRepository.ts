import { getAppDataPath, loadBackupHistoryFromDisk, saveBackupHistoryToDisk } from '@/shared/utils/persistentStorage'
import { getWpsApplication } from '@/addin/wps/systemApi'
import { logger } from '@/shared/logger/logger'
import type { BackupRecord, DocumentPathInfo, BackupHistoryItem, BackupHistoryFile } from '../../types/backup'
import { BackupRetention } from './BackupRetention'

/**
 * Pure TypeScript document path parser compatible with both Windows \ and Unix /
 */
export function getDocumentPathInfo(fullName: string): DocumentPathInfo {
  if (!fullName) {
    return { fullName: '', directory: '', fileName: '', baseName: '', extension: '' }
  }
  const clean = fullName.replace(/\//g, '\\').trim()
  const lastSlash = clean.lastIndexOf('\\')
  const directory = lastSlash >= 0 ? clean.substring(0, lastSlash) : ''
  const fileName = lastSlash >= 0 ? clean.substring(lastSlash + 1) : clean

  const lastDot = fileName.lastIndexOf('.')
  const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
  const extension = lastDot > 0 ? fileName.substring(lastDot + 1) : ''

  return {
    fullName: clean,
    directory,
    fileName,
    baseName,
    extension
  }
}

/**
 * Extract directory part from document path
 */
export function extractDocumentDirectory(docPath: string, docName?: string): string | null {
  if (!docPath) return null
  const info = getDocumentPathInfo(docPath)
  if (info.directory) return info.directory
  if (info.fullName.includes(':') || info.fullName.includes('\\')) return info.fullName
  return null
}

export class BackupRepository {
  private static inMemoryRecords: BackupRecord[] = []

  private static getWpsFileSystem(): any {
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

  /**
   * Ensure directory exists on disk
   */
  static ensureDirectory(targetDir: string): boolean {
    if (!targetDir) return false
    const fs = this.getWpsFileSystem()
    if (!fs) return true

    try {
      const exists = fs.Exists ? fs.Exists(targetDir) : (fs.exists ? fs.exists(targetDir) : false)
      if (!exists) {
        if (fs.mkdirSync) fs.mkdirSync(targetDir)
        else if (fs.Mkdir) fs.Mkdir(targetDir)
        else if (fs.mkdir) fs.mkdir(targetDir)
      }
      return true
    } catch (e) {
      logger.warn('BackupRepository', `Failed to ensure backup directory: ${targetDir}`, e)
      return false
    }
  }

  /**
   * Check if file exists on disk
   */
  static fileExists(filePath: string): boolean {
    if (!filePath) return false
    const fs = this.getWpsFileSystem()
    if (!fs) return true
    try {
      return !!(fs.Exists ? fs.Exists(filePath) : (fs.exists ? fs.exists(filePath) : false))
    } catch {
      return false
    }
  }

  /**
   * Get all backup history items
   */
  static getHistory(): BackupHistoryFile {
    return loadBackupHistoryFromDisk()
  }

  /**
   * Save backup history
   */
  static saveHistory(history: BackupHistoryFile): boolean {
    return saveBackupHistoryToDisk(history)
  }

  /**
   * Register a new backup record in persistent history and in-memory cache
   */
  static addRecord(record: BackupRecord): void {
    this.inMemoryRecords.unshift(record)

    const history = this.getHistory()
    const item: BackupHistoryItem = {
      sourcePath: record.originalFilePath,
      backupPath: record.backupFilePath,
      createdAt: new Date(record.createdAt).toISOString(),
      sourceHash: record.sourceHash || '',
      originalFileName: record.originalFileName
    }

    // Filter duplicates and prepend
    history.items = [item, ...history.items.filter(h => h.backupPath !== record.backupFilePath)]
    this.saveHistory(history)
  }

  /**
   * List all backups for a specific document path
   */
  static listBackupsForDocument(sourcePath: string): BackupRecord[] {
    const history = this.getHistory()
    const cleanSource = sourcePath ? sourcePath.replace(/\//g, '\\').toLowerCase() : ''

    const records: BackupRecord[] = []
    for (const item of history.items) {
      if (!cleanSource || item.sourcePath.replace(/\//g, '\\').toLowerCase() === cleanSource) {
        const info = getDocumentPathInfo(item.backupPath)
        records.push({
          id: `bk-${new Date(item.createdAt).getTime()}`,
          originalFileName: item.originalFileName || '',
          originalFilePath: item.sourcePath,
          backupFileName: info.fileName,
          backupFilePath: item.backupPath,
          createdAt: new Date(item.createdAt).getTime(),
          isAutoBackup: true,
          sourceHash: item.sourceHash
        })
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Delete a backup file from filesystem and history
   */
  static deleteFile(filePath: string): boolean {
    this.inMemoryRecords = this.inMemoryRecords.filter(r => r.backupFilePath !== filePath)

    // Update history
    const history = this.getHistory()
    history.items = history.items.filter(h => h.backupPath !== filePath)
    this.saveHistory(history)

    const fs = this.getWpsFileSystem()
    if (!fs) return true

    try {
      if (this.fileExists(filePath)) {
        if (fs.removeFile) fs.removeFile(filePath)
        else if (fs.RemoveFile) fs.RemoveFile(filePath)
        else if (fs.unlinkSync) fs.unlinkSync(filePath)
        else if (fs.DeleteFile) fs.DeleteFile(filePath)
      }
      return true
    } catch (e) {
      logger.warn('BackupRepository', `Failed to delete backup file: ${filePath}`, e)
      return false
    }
  }
}
