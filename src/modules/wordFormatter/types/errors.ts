export type ErrorCode =
  | 'WF001' // 无活动 Writer 文档
  | 'WF002' // 当前宿主不是 Writer
  | 'WF101' // 文档扫描失败
  | 'WF102' // 段落读取失败
  | 'WF103' // 表格读取失败
  | 'WF201' // 文档识别失败
  | 'WF301' // 创建快照失败
  | 'WF401' // 页面格式失败
  | 'WF402' // 段落格式失败
  | 'WF403' // Range 格式失败
  | 'WF404' // 表格格式失败
  | 'WF405' // 附件格式失败
  | 'WF501' // 内容完整性校验失败
  | 'WF502' // 格式结果校验失败
  | 'WF601' // 撤销失败
  | 'WF701' // 模板读取失败
  | 'WF801' // Format Plan 创建失败
  | 'WF802' // Dry Run 已过期
  | 'WF803' // ChangeSet 执行失败
  | 'WF901' // 页眉页脚设置失败
  | 'WF902' // 页码设置失败
  | 'WF903' // TOC 插入失败
  | 'WF904' // TOC 更新失败
  | 'WF1001' // 清理扫描失败
  | 'WF1002' // 清理执行失败
  | 'WF1003' // 清理结果与预期不一致
  | 'WF1011' // 结构体检失败
  | 'WF1101' // 方案读取失败
  | 'WF1102' // 方案保存失败
  | 'WF1103' // 方案导入失败
  | 'WF1201' // 备份失败
  | 'WF1202' // 备份清理失败
  | 'WF1301' // 环境诊断失败
  | 'WF1302' // FileSystem 诊断失败
  | 'WF999' // 未知异常

export class WordFormatterError extends Error {
  code: ErrorCode
  moduleName: string
  paragraphIndex?: number
  tableIndex?: number
  details?: string
  cause?: unknown

  constructor(options: {
    code: ErrorCode
    message: string
    moduleName: string
    paragraphIndex?: number
    tableIndex?: number
    details?: string
    cause?: unknown
  }) {
    super(options.message)
    this.name = 'WordFormatterError'
    this.code = options.code
    this.moduleName = options.moduleName
    this.paragraphIndex = options.paragraphIndex
    this.tableIndex = options.tableIndex
    this.details = options.details
    this.cause = options.cause
  }
}
