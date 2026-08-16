/**
 * Types for Document Cleanup in WPS Word Formatter V2.3
 */

export type CleanupIssueType =
  | 'blank-line'                  // 单个多余空行
  | 'multiple-blank-lines'        // 连续多余空行
  | 'multiple-spaces'              // 连续多余空格 (中文)
  | 'trailing-spaces'             // 段尾空格
  | 'leading-spaces'              // 段首手工空格 (应使用首行缩进)
  | 'tab-indent'                  // Tab字符模拟缩进
  | 'manual-line-break'           // 手工换行 (Shift+Enter / \v)
  | 'duplicate-page-break'        // 重复/多余分页符
  | 'duplicate-section-break'     // 异常连续分节符
  | 'empty-paragraph-before-table'// 表格前多余空段
  | 'empty-paragraph-after-table' // 表格后多余空段

export interface CleanupIssue {
  id: string
  type: CleanupIssueType
  paragraphIndex: number
  rangeStart?: number
  rangeEnd?: number
  originalText: string
  suggestedText: string
  reason: string
  severity: 'info' | 'warning' | 'error'
  enabled: boolean
  safeAutoFix: boolean
}

export interface ExpectedTextChange {
  paragraphIndex: number
  originalText: string
  expectedText: string
  isDeleteOnly?: boolean
}

export interface CleanupPlan {
  documentId: string
  documentSignature: string
  createdAt: number
  totalIssues: number
  enabledIssues: number
  issues: CleanupIssue[]
  expectedChanges: ExpectedTextChange[]
}

export interface CleanupResult {
  success: boolean
  appliedCount: number
  failedCount: number
  snapshotId?: string
  rolledBack?: boolean
  error?: string
}

export interface CleanupCategorySummary {
  type: CleanupIssueType
  name: string
  count: number
  safeCount: number
}
