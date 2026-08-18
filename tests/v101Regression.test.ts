import { describe, expect, it } from 'vitest'
import { RecognitionEngine } from '../src/modules/wordFormatter/core/recognition/RecognitionEngine'
import { CleanupScanner } from '../src/modules/wordFormatter/core/cleanup/CleanupScanner'
import { FormatEngine } from '../src/modules/wordFormatter/core/formatting/FormatEngine'
import { regulationTemplate } from '../src/modules/wordFormatter/templates/documentProcessing2025'
import type { DocumentModel, ParagraphModel } from '../src/modules/wordFormatter/types/document'
import type { WriterAdapter } from '../src/modules/wordFormatter/adapters/WriterAdapter'

function makeDoc(texts: string[]): DocumentModel {
  const paragraphs: ParagraphModel[] = texts.map((text, i) => ({
    index: i + 1, text, rawText: text, normalizedText: text,
    rangeStart: i * 100, rangeEnd: (i + 1) * 100,
    alignment: 'left', fontSize: 16, chineseFont: '仿宋_GB2312', westernFont: 'Times New Roman', bold: false,
    hasImage: false, hasShape: false, hasField: false, hasBookmark: false, hasCommentReference: false,
    isEmpty: text.trim().length === 0
  }))
  return { id:'v101', name:'v101.docx', paragraphCount:paragraphs.length, tableCount:0, sectionCount:1,
    paragraphs, tables:[], sections:[{index:1,orientation:'portrait'}], metadata:{}, signature:'sig' }
}

class Adapter implements WriterAdapter {
  paragraphStyles:any[]=[]; rangeStyles:any[]=[]
  async hasActiveDocument(){return true} async getActiveDocumentInfo(){return {id:'x',name:'x.docx'}}
  async readParagraphs(){return []} async readTables(){return []} async readSections(){return []}
  async getDocumentTextSignature(){return 'sig'} async applyPageSettings(_s:any){}
  async applyParagraphStyle(i:number,s:any){this.paragraphStyles.push({i,s})}
  async applyRangeStyle(i:number,a:number,b:number,s:any){this.rangeStyles.push({i,a,b,s})}
  async applyOutlineLevel(_i:number,_l:number){} async applyTableStyle(_i:number,_s:any){}
  async beginUndoRecord(_n:string){} async endUndoRecord(){} async executeNativeUndo(){return false}
  async selectParagraph(_i:number){} async setScreenUpdating(_v:boolean){}
  async applyGranularParagraphChanges(i:number,_c:any[],s:any){this.paragraphStyles.push({i,s})}
  async applyGranularSectionChanges(_i:number,_c:any[]){} async applyHeaderFooter(_c:any,_s?:number){}
  async applyPageNumbers(_c:any,_s?:number){} async detectToc(){return null} async insertToc(_c:any){}
  async updateToc(_i?:number){} async deleteToc(_i?:number){} async replaceParagraphText(_i:number,_t:string){}
  async deleteParagraph(_i:number){} async saveCopyAs(_p:string){return true} async saveActiveDocument(){return true}
}

describe('v1.0.1 regressions', () => {
  it('recognizes 第×条 + space + body and preserves separator', () => {
    const result = new RecognitionEngine().analyze(makeDoc(['第一条 为规范业务操作，制定本办法。']), regulationTemplate.customRecognitionRules)
    expect(result[0].role).toBe('heading-2')
    expect(result[0].inlineRanges?.[0].text).toBe('第一条')
    expect(result[0].inlineRanges?.[1].text).toBe(' 为规范业务操作，制定本办法。')
  })

  it('does not split 第×条 without space', () => {
    const result = new RecognitionEngine().analyze(makeDoc(['第一条为规范业务操作，制定本办法。']), regulationTemplate.customRecognitionRules)
    expect(result[0].role).toBe('heading-2')
    expect(result[0].inlineRanges).toBeUndefined()
  })

  it('keeps single structural spaces and only suggests collapsing multiple spaces to one', () => {
    const scanner = new CleanupScanner()
    expect(scanner.scan(makeDoc(['第一章 总则', '第一条 正文内容'])).filter(i => i.type === 'multiple-spaces')).toHaveLength(0)
    const multi = scanner.scan(makeDoc(['第一章   总则', '第一条　　正文内容'])).filter(i => i.type === 'multiple-spaces')
    expect(multi.map(i => i.suggestedText)).toEqual(['第一章 总则', '第一条 正文内容'])
    expect(multi.every(i => i.safeAutoFix === false)).toBe(true)
  })

  it('minimal formatting uses body base and heading-2 range overlay', async () => {
    const doc = makeDoc(['第一条 为规范业务操作，制定本办法。'])
    const recognition = new RecognitionEngine().analyze(doc, regulationTemplate.customRecognitionRules)
    const adapter = new Adapter()
    const result = await new FormatEngine(adapter).execute({document:doc, recognition, template:regulationTemplate, strategy:'minimal', scope:'all'})
    expect(result.success).toBe(true)
    expect(adapter.paragraphStyles.some(x => x.i===1 && x.s.chineseFont===regulationTemplate.body.chineseFont)).toBe(true)
    expect(adapter.rangeStyles.some(x => x.i===1 && x.a===0 && x.b===3 && x.s.chineseFont===regulationTemplate.heading2?.chineseFont)).toBe(true)
  })
})
