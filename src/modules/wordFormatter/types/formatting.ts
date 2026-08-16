import type { DocumentModel } from './document'
import type { RecognitionResult } from './recognition'
import type { FormatTemplate } from './template'

export type FormatScope = 'all' | 'tables-only' | 'headings-only' | 'body-only' | 'page-only'

export interface AuditIssue {
  id: string
  category: 'headings' | 'body' | 'tables' | 'blank-lines' | 'page'
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  count?: number
  paragraphIndex?: number
}

import type { DocumentHealthScore, StructureIssue } from './audit'

export interface AuditReport {
  score: number
  grade: 'excellent' | 'good' | 'average' | 'poor'
  totalIssues: number
  issues: AuditIssue[]
  auditTime: number
  healthScore?: DocumentHealthScore
  structureIssues?: StructureIssue[]
}

import type { FormatApplyStrategy, FormatPlan } from './planning'

export interface FormatExecutionParams {
  document: DocumentModel
  recognition: RecognitionResult[]
  template: FormatTemplate
  scope?: FormatScope
  strategy?: FormatApplyStrategy
  plan?: FormatPlan
  progressCallback?: (progress: FormatProgress) => void
}

export interface FormatProgress {
  stage: 'preparing' | 'snapshot' | 'page' | 'headings' | 'body' | 'tables' | 'cleanup' | 'validating' | 'completed' | 'error'
  percentage: number
  message: string
  currentParagraph?: number
  totalParagraphs?: number
}

export interface FormatBreakdown {
  mainTitleCount: number
  subtitleCount: number
  heading1Count: number
  heading2Count: number
  heading3Count: number
  heading4Count: number
  customHeadingCount: number
  bodyCount: number
  attachmentCount: number
  captionCount: number
  tableCount: number
  emphasisPreservedCount: number
}

export interface FormatResult {
  success: boolean
  formattedParagraphs: number
  formattedTables: number
  formattedSections: number
  durationMs: number
  signatureBefore: string
  signatureAfter: string
  breakdown?: FormatBreakdown
  error?: string
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  paragraphIndex?: number
  tableIndex?: number
}

export interface ValidationReport {
  isValid: boolean
  hasIntegrityIssue: boolean
  issues: ValidationIssue[]
}
