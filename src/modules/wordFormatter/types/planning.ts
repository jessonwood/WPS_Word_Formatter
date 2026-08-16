import type { FormatScope } from './formatting'

export type FormatApplyStrategy = 'minimal' | 'normalize'

export type FormatProperty =
  | 'font-chinese'
  | 'font-western'
  | 'font-size'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'alignment'
  | 'first-line-indent'
  | 'left-indent'
  | 'right-indent'
  | 'line-spacing'
  | 'space-before'
  | 'space-after'
  | 'outline-level'
  | 'page-margin-top'
  | 'page-margin-bottom'
  | 'page-margin-left'
  | 'page-margin-right'
  | 'table-three-line'
  | 'table-header-repeat'
  | 'table-alignment'
  | 'table-column-align'

export interface FormatChange {
  id: string
  targetType: 'document' | 'section' | 'paragraph' | 'range' | 'table'
  targetIndex?: number
  property: FormatProperty
  propertyName: string
  before: unknown
  after: unknown
  reason: string
  category: 'page' | 'heading' | 'body' | 'table' | 'font' | 'outline'
  enabled: boolean
  impact?: 'high' | 'medium' | 'low'
  paragraphSnippet?: string
}

export interface FormatPlanSummary {
  totalChanges: number
  enabledChanges: number
  pageChanges: number
  headingChanges: number
  bodyChanges: number
  tableChanges: number
  fontChanges: number
  outlineChanges: number
  affectedParagraphs: number
  affectedTables: number
  skippedAlreadyCompliant: number
}

export interface FormatPlan {
  documentId: string
  documentSignature: string
  createdAt: number
  strategy: FormatApplyStrategy
  scope: FormatScope
  changes: FormatChange[]
  summary: FormatPlanSummary
}
