/**
 * WPS Word Formatter V2.4 - Automatic Backup Types
 */

export interface BackupConfig {
  enabled: boolean
  locationMode: 'document-directory'
  retentionCount: number
}

export interface DocumentPathInfo {
  fullName: string
  directory: string
  fileName: string
  baseName: string
  extension: string
}

export type BackupReadiness = 'ready' | 'needs-save' | 'unavailable'

export interface BackupReadinessResult {
  status: BackupReadiness
  documentFullName?: string
  directory?: string
  documentSaved: boolean
  directoryWritable: boolean
  binaryApiAvailable: boolean
  reason?: string
}

export interface BackupHistoryItem {
  sourcePath: string
  backupPath: string
  createdAt: string
  sourceHash: string
  originalFileName?: string
}

export interface BackupHistoryFile {
  schemaVersion: number
  items: BackupHistoryItem[]
}

export interface BackupRecord {
  id: string
  originalFileName: string
  originalFilePath: string
  backupFileName: string
  backupFilePath: string
  fileSize?: number
  createdAt: number
  isAutoBackup: boolean
  sourceHash?: string
}

export interface BackupResult {
  success: boolean
  readiness?: BackupReadinessResult
  backupRecord?: BackupRecord
  error?: string
  sourcePath?: string
  backupPath?: string
  skippedReason?: string
  requiresUserDecision?: 'unsaved-new-doc' | 'has-unsaved-modifications'
}

export interface BackupSummary {
  totalBackups: number
  backupDirectory: string
  currentFileName?: string
  exampleBackupFileName?: string
  latestBackup?: BackupRecord
  records: BackupRecord[]
}
