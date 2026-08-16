/**
 * Types for Document Structure Audit & Health Scoring in WPS Word Formatter V2.3
 */

export type StructureIssueType =
  | 'heading-level-jump'               // 标题层级跳跃 (如 1级后直接出现3级)
  | 'heading-number-gap'               // 标题编号缺失 (如 一、二、四 缺少三)
  | 'heading-number-duplicate'         // 标题编号重复 (如 出现两个 一、)
  | 'duplicate-heading-text'           // 同级重复标题名称
  | 'orphan-heading'                   // 孤立标题 (标题下无正文或图表)
  | 'empty-section'                    // 空章节/分节
  | 'caption-without-table'            // 表题后无表格
  | 'table-without-caption'            // 表格前无表题
  | 'caption-without-image'            // 图题无图片
  | 'image-without-caption'            // 图片无图题
  | 'attachment-marker-without-title'  // 附件标记后无标题
  | 'attachment-title-without-content' // 附件标题后无内容
  | 'heading-too-long'                 // 标题过长 (>40字)
  | 'heading-ends-with-period'         // 标题句末句号

export interface StructureIssue {
  id: string
  type: StructureIssueType
  paragraphIndex?: number
  severity: 'info' | 'warning' | 'error'
  title: string
  description: string
  relatedParagraphs?: number[]
  autoFixAvailable: boolean
}

export interface DocumentHealthScore {
  overall: number        // 0~100 加权综合得分
  formatting: number     // 0~100 格式合规得分 (35%)
  structure: number      // 0~100 结构完整得分 (25%)
  headings: number       // 0~100 标题体系得分 (15%)
  tables: number         // 0~100 表格规范得分 (10%)
  pageLayout: number     // 0~100 页面设置得分 (10%)
  cleanup: number        // 0~100 文档清洁得分 (5%)
}

export interface DocumentAuditReport {
  timestamp: number
  documentId: string
  documentSignature: string
  healthScore: DocumentHealthScore
  structureIssues: StructureIssue[]
  totalIssuesCount: number
  hasCriticalErrors: boolean
}
