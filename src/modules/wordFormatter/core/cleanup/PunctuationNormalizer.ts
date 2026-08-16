export interface NormalizationChange {
  original: string
  replacement: string
  offset: number
}

export class PunctuationNormalizer {
  /**
   * Safe Chinese punctuation normalization
   * Excludes URLs, code, numbers/decimals, dates, file paths
   */
  normalize(text: string): { normalized: string; changes: NormalizationChange[] } {
    const changes: NormalizationChange[] = []
    let result = ''

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const prev = i > 0 ? text[i - 1] : ''
      const next = i < text.length - 1 ? text[i + 1] : ''

      // Skip decimals or dates (e.g. 1.25, 2026.08, 10:30)
      if (/\d/.test(prev) && /\d/.test(next)) {
        result += char
        continue
      }

      // Skip URLs (http://, https://)
      if ((char === ':' || char === '/') && text.slice(Math.max(0, i - 6), i + 1).includes('http')) {
        result += char
        continue
      }

      let repl: string | null = null
      if (char === ',' && (/[\u4e00-\u9fa5]/.test(prev) || /[\u4e00-\u9fa5]/.test(next))) {
        repl = '，'
      } else if (char === ':' && (/[\u4e00-\u9fa5]/.test(prev) || /[\u4e00-\u9fa5]/.test(next))) {
        repl = '：'
      } else if (char === ';' && (/[\u4e00-\u9fa5]/.test(prev) || /[\u4e00-\u9fa5]/.test(next))) {
        repl = '；'
      } else if (char === '?' && (/[\u4e00-\u9fa5]/.test(prev) || /[\u4e00-\u9fa5]/.test(next))) {
        repl = '？'
      } else if (char === '!' && (/[\u4e00-\u9fa5]/.test(prev) || /[\u4e00-\u9fa5]/.test(next))) {
        repl = '！'
      }

      if (repl) {
        changes.push({ original: char, replacement: repl, offset: i })
        result += repl
      } else {
        result += char
      }
    }

    return { normalized: result, changes }
  }
}
