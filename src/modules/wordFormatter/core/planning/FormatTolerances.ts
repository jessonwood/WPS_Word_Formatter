export const TOLERANCES = {
  fontSizePt: 0.05,
  lineSpacingPt: 0.15,
  indentChars: 0.1,
  marginPt: 0.5,
  tableWidthPt: 0.5
}

export function isFloatEqual(a?: number, b?: number, tol = 0.05): boolean {
  if (a === undefined && b === undefined) return true
  if (a === undefined || b === undefined) return false
  return Math.abs(a - b) <= tol
}

export function normalizeFontName(font?: string): string {
  if (!font) return ''
  const trimmed = font.trim()
  
  // Normalize known font family aliases in WPS / MS Word
  const aliasMap: Record<string, string> = {
    'FZXBSJW--GB1-0': '方正小标宋简体',
    '方正小标宋': '方正小标宋简体',
    'FangSong_GB2312': '仿宋_GB2312',
    'FangSong': '仿宋',
    'KaiTi_GB2312': '楷体_GB2312',
    'KaiTi': '楷体',
    'SimSun': '宋体',
    'SimHei': '黑体',
    'Microsoft YaHei': '微软雅黑',
    'Microsoft YaHei UI': '微软雅黑',
    'Times New Roman': 'Times New Roman',
    'Arial': 'Arial',
    'Calibri': 'Calibri'
  }

  return aliasMap[trimmed] || trimmed
}
