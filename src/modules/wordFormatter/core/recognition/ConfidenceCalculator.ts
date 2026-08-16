import type { RecognitionResult, RecognitionStats } from '../../types/recognition'

export class ConfidenceCalculator {
  static getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.90) return 'high'
    if (confidence >= 0.70) return 'medium'
    return 'low'
  }

  static calculateStats(results: RecognitionResult[], tableCount: number = 0): RecognitionStats {
    const stats: RecognitionStats = {
      totalParagraphs: results.length,
      mainTitleCount: 0,
      subtitleCount: 0,
      heading1Count: 0,
      heading2Count: 0,
      heading3Count: 0,
      heading4Count: 0,
      bodyCount: 0,
      attachmentCount: 0,
      tableCaptionCount: 0,
      figureCaptionCount: 0,
      blankCount: 0,
      tableCount,
      lowConfidenceCount: 0
    }

    for (const r of results) {
      if (r.confidence < 0.70) {
        stats.lowConfidenceCount++
      }

      switch (r.role) {
        case 'main-title': stats.mainTitleCount++; break
        case 'subtitle': stats.subtitleCount++; break
        case 'heading-1': stats.heading1Count++; break
        case 'heading-2': stats.heading2Count++; break
        case 'heading-3': stats.heading3Count++; break
        case 'heading-4': stats.heading4Count++; break
        case 'body': stats.bodyCount++; break
        case 'attachment-marker':
        case 'attachment-title': stats.attachmentCount++; break
        case 'table-caption': stats.tableCaptionCount++; break
        case 'figure-caption': stats.figureCaptionCount++; break
        case 'blank': stats.blankCount++; break
      }
    }

    return stats
  }
}
