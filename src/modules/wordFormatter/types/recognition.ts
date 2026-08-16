export type ParagraphRole =
  | 'main-title'
  | 'subtitle'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'body'
  | 'attachment-marker'
  | 'attachment-title'
  | 'table-caption'
  | 'figure-caption'
  | 'media'
  | 'blank'
  | 'unknown'

export interface InlineRoleRange {
  startOffset: number
  endOffset: number
  role: ParagraphRole
  text?: string
}

export interface RecognitionResult {
  paragraphIndex: number
  role: ParagraphRole
  confidence: number // 0.00 ~ 1.00
  ruleId: string
  reason: string[]
  originalText: string
  inlineRanges?: InlineRoleRange[]
  userOverridden?: boolean
}

export interface RuleEvaluation {
  matched: boolean
  role: ParagraphRole
  confidence: number
  ruleId: string
  reason: string[]
  inlineRanges?: InlineRoleRange[]
}

export interface RecognitionStats {
  totalParagraphs: number
  mainTitleCount: number
  subtitleCount: number
  heading1Count: number
  heading2Count: number
  heading3Count: number
  heading4Count: number
  bodyCount: number
  attachmentCount: number
  tableCaptionCount: number
  figureCaptionCount: number
  blankCount: number
  tableCount: number
  lowConfidenceCount: number
}
