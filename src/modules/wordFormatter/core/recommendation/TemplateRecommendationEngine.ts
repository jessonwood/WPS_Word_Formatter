import type { DocumentModel } from '../../types/document'
import type { RecognitionResult } from '../../types/recognition'
import type { FormatTemplate } from '../../types/template'

export interface TemplateRecommendation {
  templateId: string
  templateName: string
  confidence: number
  reasons: string[]
}

interface Candidate {
  templateId: string
  score: number
  reasons: string[]
}

function cappedCountScore(count: number, unit: number, cap: number): number {
  return Math.min(cap, count * unit)
}

function countMatches(texts: string[], pattern: RegExp): number {
  return texts.reduce((sum, text) => sum + (pattern.test(text) ? 1 : 0), 0)
}

/**
 * Offline, deterministic template recommendation.
 * It intentionally avoids AI/network calls so recommendation is fast and explainable.
 */
export class TemplateRecommendationEngine {
  static recommend(
    document: DocumentModel,
    recognition: RecognitionResult[],
    templates: FormatTemplate[]
  ): TemplateRecommendation | null {
    const texts = (document.paragraphs || [])
      .map(p => (p.text || '').trim())
      .filter(Boolean)

    if (texts.length === 0 || templates.length === 0) return null

    const chapterCount = countMatches(texts, /^第[一二三四五六七八九十百千〇零]+章/)
    const articleCount = countMatches(texts, /^第[一二三四五六七八九十百千〇零]+条/)
    const chineseL1Count = countMatches(texts, /^[一二三四五六七八九十百千〇零]+、/)
    const chineseParenCount = countMatches(texts, /^（[一二三四五六七八九十百千〇零]+）/)
    const arabicL1Count = countMatches(texts, /^\d+[.．](?!\d)/)
    const arabicL2Count = countMatches(texts, /^\d+\.\d+(?!\.)/)
    const arabicL3Count = countMatches(texts, /^\d+\.\d+\.\d+(?!\.)/)
    const arabicDeepCount = countMatches(texts, /^\d+(?:\.\d+){3,}/)
    const parenArabicCount = countMatches(texts, /^（\d+）/)
    const circledCount = countMatches(texts, /^[①②③④⑤⑥⑦⑧⑨⑩]/)

    const bodyText = texts.join('\n')
    const bankKeywordMatches = bodyText.match(/银行|金融|贷款|授信|风险|不良|逾期|资产质量|客户经理|监管/g)?.length || 0
    const officialDocKeywordMatches = bodyText.match(/通知|请示|通报|决定|决议|批复|函|意见|公告|报告/g)?.length || 0
    const attachmentCount = countMatches(texts, /^附件(?:\s*[：:]|\s|$)/)
    const addresseeCount = countMatches(texts, /^[^。！？]{2,30}[：:]$/)

    const candidates: Candidate[] = []

    const regulationScore =
      cappedCountScore(chapterCount, 35, 55) +
      cappedCountScore(articleCount, 22, 35) +
      cappedCountScore(chineseParenCount, 3, 10)
    candidates.push({
      templateId: 'template-document-processing-2025-regulation',
      score: regulationScore,
      reasons: [
        chapterCount > 0 ? `检测到 ${chapterCount} 个“第×章”结构` : '',
        articleCount > 0 ? `检测到 ${articleCount} 个“第×条”结构` : '',
        chineseParenCount > 0 ? '存在“（一）”式下级标题' : ''
      ].filter(Boolean)
    })

    const businessScore =
      cappedCountScore(arabicL2Count, 10, 30) +
      cappedCountScore(arabicL3Count, 14, 35) +
      cappedCountScore(arabicDeepCount, 18, 35) +
      cappedCountScore(arabicL1Count, 3, 10)
    candidates.push({
      templateId: 'template-document-processing-2025-business-operation',
      score: businessScore,
      reasons: [
        arabicL2Count > 0 ? `检测到 ${arabicL2Count} 个“1.1”式标题` : '',
        arabicL3Count > 0 ? `检测到 ${arabicL3Count} 个“1.1.1”式标题` : '',
        arabicDeepCount > 0 ? '存在四级及以上层级数字标题' : ''
      ].filter(Boolean)
    })

    const ordinaryScore =
      cappedCountScore(chineseL1Count, 9, 35) +
      cappedCountScore(chineseParenCount, 8, 30) +
      cappedCountScore(arabicL1Count, 5, 20) +
      cappedCountScore(parenArabicCount, 5, 10) +
      cappedCountScore(circledCount, 5, 10)
    candidates.push({
      templateId: 'template-document-processing-2025-ordinary',
      score: ordinaryScore,
      reasons: [
        chineseL1Count > 0 ? '存在“一、二、三”式一级标题' : '',
        chineseParenCount > 0 ? '存在“（一）（二）”式二级标题' : '',
        arabicL1Count > 0 ? '存在“1. 2. 3.”式三级标题' : ''
      ].filter(Boolean)
    })

    const bankScore =
      Math.min(65, bankKeywordMatches * 6) +
      Math.min(20, recognition.filter(r => r.role.startsWith('heading-')).length * 2) +
      Math.min(15, document.tableCount * 5)
    candidates.push({
      templateId: 'template-bank-report',
      score: bankScore,
      reasons: [
        bankKeywordMatches >= 3 ? '文档包含较多金融/风险/信贷业务词汇' : '',
        document.tableCount > 0 ? `包含 ${document.tableCount} 个表格` : ''
      ].filter(Boolean)
    })

    const governmentScore =
      Math.min(45, officialDocKeywordMatches * 9) +
      cappedCountScore(addresseeCount, 10, 20) +
      cappedCountScore(attachmentCount, 10, 20) +
      cappedCountScore(chineseL1Count + chineseParenCount, 2, 15)
    candidates.push({
      templateId: 'template-government',
      score: governmentScore,
      reasons: [
        officialDocKeywordMatches > 0 ? '检测到常见机关公文文种关键词' : '',
        addresseeCount > 0 ? '检测到冒号结尾的主送/称谓段落' : '',
        attachmentCount > 0 ? '检测到附件说明' : ''
      ].filter(Boolean)
    })

    candidates.push({
      templateId: 'template-default',
      score: 20,
      reasons: ['未发现更强的专用模板特征，建议使用通用报告模板']
    })

    const availableIds = new Set(templates.map(t => t.id))
    const best = candidates
      .filter(c => availableIds.has(c.templateId))
      .sort((a, b) => b.score - a.score)[0]

    if (!best) return null

    const template = templates.find(t => t.id === best.templateId)
    if (!template) return null

    // 0.55 ~ 0.98: enough to express confidence without pretending statistical probability.
    const confidence = Math.max(0.55, Math.min(0.98, 0.55 + best.score / 230))

    return {
      templateId: template.id,
      templateName: template.name,
      confidence,
      reasons: best.reasons.length > 0 ? best.reasons : ['根据当前文档结构推荐']
    }
  }
}
