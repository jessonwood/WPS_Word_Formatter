export interface FontSizeOption {
  name: string
  pt: number
  label: string
}

export const CHINESE_FONT_SIZES: FontSizeOption[] = [
  { name: '初号', pt: 42, label: '初号 (42pt)' },
  { name: '小初', pt: 36, label: '小初 (36pt)' },
  { name: '一号', pt: 26, label: '一号 (26pt)' },
  { name: '小一', pt: 24, label: '小一 (24pt)' },
  { name: '二号', pt: 22, label: '二号 (22pt)' },
  { name: '小二', pt: 18, label: '小二 (18pt)' },
  { name: '三号', pt: 16, label: '三号 (16pt)' },
  { name: '小三', pt: 15, label: '小三 (15pt)' },
  { name: '四号', pt: 14, label: '四号 (14pt)' },
  { name: '小四', pt: 12, label: '小四 (12pt)' },
  { name: '五号', pt: 10.5, label: '五号 (10.5pt)' },
  { name: '小五', pt: 9, label: '小五 (9pt)' },
  { name: '六号', pt: 7.5, label: '六号 (7.5pt)' },
  { name: '小六', pt: 6.5, label: '小六 (6.5pt)' },
  { name: '七号', pt: 5.5, label: '七号 (5.5pt)' },
  { name: '八号', pt: 5, label: '八号 (5pt)' }
]

/**
 * Format numeric pt value into Chinese font size label, e.g. 22 -> "二号 (22pt)"
 */
export function formatFontSize(pt: number | undefined): string {
  if (pt === undefined || pt === null) return ''
  const matched = CHINESE_FONT_SIZES.find(item => Math.abs(item.pt - pt) < 0.05)
  if (matched) {
    return matched.label
  }
  return `${pt}pt`
}
