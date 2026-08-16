/**
 * Convert Chinese numerals to Arabic number
 */
const CN_NUM_MAP: Record<string, number> = {
  '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  '十': 10, '百': 100, '千': 1000
}

export function chineseToArabic(cnStr: string): number {
  if (!cnStr) return 0
  let total = 0
  let current = 0
  let hasUnit = false

  for (let i = 0; i < cnStr.length; i++) {
    const char = cnStr[i]
    const val = CN_NUM_MAP[char]

    if (val === undefined) continue

    if (val === 10) {
      hasUnit = true
      if (current === 0) current = 1
      total += current * 10
      current = 0
    } else if (val === 100 || val === 1000) {
      hasUnit = true
      total += current * val
      current = 0
    } else {
      current = val
    }
  }

  total += current
  return hasUnit || total > 0 ? total : 0
}

/**
 * Clean control characters from WPS Writer strings (e.g. \r, \x07, \x0c, etc.)
 */
export function cleanControlChars(str: string): string {
  if (!str) return ''
  return str.replace(/[\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim()
}

/**
 * Fast DJB2 + Length based signature for text integrity validation
 */
export function calculateTextSignature(texts: string[]): string {
  let hash = 5381
  let totalChars = 0

  for (let i = 0; i < texts.length; i++) {
    const str = texts[i]
    totalChars += str.length
    for (let j = 0; j < str.length; j++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(j)
      hash = hash & hash // Convert to 32bit integer
    }
  }

  return `sig_${(hash >>> 0).toString(16)}_${totalChars}_${texts.length}`
}

/**
 * Check if string looks like numeric decimal (e.g. 1.25, 3.14%, 2026.08)
 */
export function isDecimalOrDataPattern(text: string): boolean {
  if (!text) return false
  // 1.25亿元, 3.14%, 2026.08, 1.2个百分点, 12.5%
  if (/^\d+\.\d+/.test(text)) return true
  if (/^\d+\s*[%％‰]/.test(text)) return true
  if (/^\d+\.\d+\s*(?:亿|万|千|百|元|点|个百分点|%|％|‰)/.test(text)) return true
  return false
}

/**
 * Units conversion (pt <-> cm <-> inch)
 */
export const ptToCm = (pt: number) => Math.round((pt * 0.0352778) * 100) / 100
export const cmToPt = (cm: number) => Math.round((cm * 28.3465) * 10) / 10

/**
 * Safe and universal clipboard copy function compatible with WPS WebView, CEF, file://, and modern browsers
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  // 1. Try modern navigator.clipboard if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {}
  }

  // 2. Reliable textarea fallback for WebViews & CEF
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, text.length)
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    }
  } catch (e) {
    console.error('Failed to copy to clipboard via execCommand', e)
  }

  return false
}
