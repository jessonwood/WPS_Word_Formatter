/**
 * WPS Word Formatter V2.4 - WPS Environment Diagnostics Types
 */
import type { BackupReadinessResult } from './backup'

export interface FileSystemCapabilityResult {
  api: string
  status: 'PASS' | 'FAIL' | 'INCOMPATIBLE' | 'NOT_USED' | 'UNVERIFIED' | 'UNSUPPORTED' | 'NOT_FOUND'
  role: 'PRIMARY' | 'PRIMARY-BINARY' | 'UNUSED' | 'FALLBACK'
  message?: string
  errorDetail?: string
}

export interface DocumentApiCapabilityResult {
  api: string
  status: 'PASS' | 'SAVED' | 'UNSAVED' | 'FAIL' | 'INFO' | 'WARN' | 'NOT_TESTED'
  value?: string | number | boolean
  message?: string
}

export interface ApiCapabilityInfo {
  name: string
  status: 'available' | 'partial' | 'unavailable'
  detail?: string
}

export interface StoragePathInfo {
  name: string
  path: string
  exists: boolean
  readable: boolean
  writable: boolean
  detail?: string
}

export interface BackupDiagnosticsInfo {
  strategy: string
  activeDocumentPath: string
  backupDirectory: string
  isSaved: boolean
  directoryWritable: boolean
  binaryApiStatus: 'PASS' | 'FAIL'
  readiness: BackupReadinessResult
}

export interface DiagnosticsReport {
  timestamp: number
  wpsVersion: string
  addinVersion: string
  platform: string
  hostType: 'wps' | 'et' | 'wpp' | 'unknown'
  environment: {
    os: string
    appDataPath: string
    isNodeEnv: boolean
    hasWpsObject: boolean
    hasApplicationObject: boolean
  }
  apiCapabilities: ApiCapabilityInfo[]
  fileSystemMatrix: FileSystemCapabilityResult[]
  documentApiDiagnostics: DocumentApiCapabilityResult[]
  backupDiagnostics?: BackupDiagnosticsInfo
  storagePaths: StoragePathInfo[]
  overall: 'healthy' | 'warning' | 'error'
  summary: string
}
