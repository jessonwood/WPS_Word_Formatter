import fs from 'node:fs'

function read(path) { return fs.readFileSync(path, 'utf8') }
function write(path, content) { fs.writeFileSync(path, content, 'utf8') }
function replaceOnce(text, oldValue, newValue, label) {
  if (!text.includes(oldValue)) throw new Error(`Patch target not found: ${label}`)
  return text.replace(oldValue, newValue)
}

// Heading2Rule: 第×条 + 空格 + 正文 -> inline heading-2 + body, keeping the separator space.
{
  const path = 'src/modules/wordFormatter/core/recognition/rules/Heading2Rule.ts'
  let s = read(path)
  s = replaceOnce(s,
`  // Regex matches （一）, (一), （十一）, (十一) etc.
  private regex = /^[（(][一二三四五六七八九十百零〇]+[）)]\\s*(.*)$/
`,
`  // Regex matches （一）, (一), （十一）, (十一) etc.
  private regex = /^[（(][一二三四五六七八九十百零〇]+[）)]\\s*(.*)$/
  // Clause-style inline heading: 第×条 + at least one half/full-width space + body.
  private articleInlineRegex = /^(第[一二三四五六七八九十百千零〇]+条)([ \\u3000]+)(.+)$/
`, 'Heading2Rule regex')

  s = replaceOnce(s,
`    const text = paragraph.normalizedText.trim()
    const match = text.match(this.regex)

    if (match) {`,
`    const text = paragraph.normalizedText.trim()

    const articleMatch = text.match(this.articleInlineRegex)
    if (articleMatch) {
      const headingText = articleMatch[1]
      const headingLen = headingText.length
      return {
        matched: true,
        role: 'heading-2',
        confidence: 0.99,
        ruleId: this.id,
        reason: ['匹配“第×条 + 空格 + 正文”的同段二级标题结构，空格作为标题与正文边界保留'],
        inlineRanges: [
          { startOffset: 0, endOffset: headingLen, role: 'heading-2', text: headingText },
          { startOffset: headingLen, endOffset: text.length, role: 'body', text: text.slice(headingLen) }
        ]
      }
    }

    const match = text.match(this.regex)

    if (match) {`, 'Heading2Rule evaluate')
  write(path, s)
}

// CustomPatternRule: regulation template custom heading rule has higher priority, enrich it too.
{
  const path = 'src/modules/wordFormatter/core/recognition/rules/CustomPatternRule.ts'
  let s = read(path)
  s = replaceOnce(s,
`import type { RuleEvaluation } from '../../../types/recognition'`,
`import type { RuleEvaluation, InlineRoleRange } from '../../../types/recognition'`, 'CustomPatternRule import')

  s = replaceOnce(s,
`      if (match) {
        return {
          matched: true,
          role: this.ruleConfig.role,
          confidence: 0.98, // High confidence for explicit user-defined regex
          ruleId: this.id,
          reason: [
            \`命中用户自定义规则「\${this.ruleConfig.name}」\`,
            \`正则表达式：/\${this.ruleConfig.pattern}/\`,
            \`匹配文本：“\${text.slice(0, 35)}\${text.length > 35 ? '...' : ''}”\`
          ]
        }
      }`,
`      if (match) {
        let inlineRanges: InlineRoleRange[] | undefined
        const articleMatch = this.ruleConfig.role === 'heading-2'
          ? text.match(/^(第[一二三四五六七八九十百千零〇]+条)([ \\u3000]+)(.+)$/)
          : null
        if (articleMatch) {
          const headingLen = articleMatch[1].length
          inlineRanges = [
            { startOffset: 0, endOffset: headingLen, role: 'heading-2', text: articleMatch[1] },
            { startOffset: headingLen, endOffset: text.length, role: 'body', text: text.slice(headingLen) }
          ]
        }

        return {
          matched: true,
          role: this.ruleConfig.role,
          confidence: inlineRanges ? 0.99 : 0.98,
          ruleId: this.id,
          reason: [
            \`命中用户自定义规则「\${this.ruleConfig.name}」\`,
            \`正则表达式：/\${this.ruleConfig.pattern}/\`,
            \`匹配文本：“\${text.slice(0, 35)}\${text.length > 35 ? '...' : ''}”\`,
            ...(inlineRanges ? ['识别为“第×条 + 空格 + 正文”的同段二级标题，保留分界空格'] : [])
          ],
          inlineRanges
        }
      }`, 'CustomPatternRule match')
  write(path, s)
}

// CleanupScanner: preserve single internal spaces; collapse only 2+ to exactly one.
{
  const path = 'src/modules/wordFormatter/core/cleanup/CleanupScanner.ts'
  let s = read(path)
  s = replaceOnce(s,
`        // 5. Check Multiple Spaces within Text (Chinese context safe)
        // Avoid collapsing single space between English words (e.g. "Word Formatter" is kept)
        // Match 2 or more consecutive spaces or fullwidth spaces
        if (/[^\\x00-\\x7F][ ]{2,}[^\\x00-\\x7F]|[\\u4e00-\\u9fa5][ ]+[\\u4e00-\\u9fa5]|\\u3000{2,}/.test(raw)) {
          // Replace 2+ spaces between Chinese characters with none or single space
          const fixedText = raw
            .replace(/([\\u4e00-\\u9fa5])\\s+([\\u4e00-\\u9fa5])/g, '$1$2')
            .replace(/ {2,}/g, ' ')
            .replace(/\\u3000+/g, '')
`,
`        // 5. Check Multiple Spaces within Text.
        // A single internal half/full-width space is meaningful content and must be preserved
        // (e.g. "第一章 总则", "第一条 正文"). Only 2+ consecutive spaces are collapsed to one.
        if (/[ \\u3000]{2,}/.test(raw)) {
          const fixedText = raw.replace(/[ \\u3000]{2,}/g, ' ')
`, 'CleanupScanner internal spaces')
  s = s.replace("reason: '中文字符间包含多余连续空格，建议清除'", "reason: '文本中包含连续多个空格，建议压缩为 1 个并保留结构分隔'")
  write(path, s)
}

// Minimal plan: use body style as the paragraph base for inline heading-2.
{
  const path = 'src/modules/wordFormatter/core/planning/FormatPlanBuilder.ts'
  let s = read(path)
  s = replaceOnce(s,
`      if (strategy === 'minimal') {
        const pChanges = FormatComparator.compareParagraph(
          p,
          style,
          role,
          displayName,
          template.options.applyOutlineLevels ? outlineLevel : undefined
        )`,
`      if (strategy === 'minimal') {
        const isInlineHeading2 = role === 'heading-2' &&
          template.options.autoDetectInlineHeading2 &&
          !!rec?.inlineRanges && rec.inlineRanges.length >= 2
        const comparisonStyle = isInlineHeading2 ? template.body : style
        const comparisonRole: ParagraphRole = isInlineHeading2 ? 'body' : role
        const comparisonName = isInlineHeading2 ? '正文（含同段二级标题）' : displayName

        const pChanges = FormatComparator.compareParagraph(
          p,
          comparisonStyle,
          comparisonRole,
          comparisonName,
          template.options.applyOutlineLevels ? outlineLevel : undefined
        )`, 'FormatPlanBuilder minimal')
  write(path, s)
}

// Minimal execution: apply body base granular changes, then overlay only the heading range.
{
  const path = 'src/modules/wordFormatter/core/formatting/FormatEngine.ts'
  let s = read(path)
  s = replaceOnce(s,
`          const rec = recognition.find(r => r.paragraphIndex === pIdx)
          const role = rec?.role || 'body'
          const targetStyle = this.resolveStyleForRole(role, template)
          const targetOutline = this.resolveOutlineLevelForRole(role)

          try {
            await this.adapter.applyGranularParagraphChanges(pIdx, pChanges, targetStyle)
            
            // If outline-level was changed`,
`          const rec = recognition.find(r => r.paragraphIndex === pIdx)
          const role = rec?.role || 'body'
          const isInlineHeading2 = role === 'heading-2' &&
            template.options.autoDetectInlineHeading2 &&
            !!rec?.inlineRanges && rec.inlineRanges.length >= 2
          const targetStyle = isInlineHeading2 ? template.body : this.resolveStyleForRole(role, template)
          const targetOutline = this.resolveOutlineLevelForRole(role)

          try {
            await this.adapter.applyGranularParagraphChanges(pIdx, pChanges, targetStyle)

            if (isInlineHeading2) {
              const h2Style = this.resolveStyleForRole('heading-2', template)
              const hRange = rec!.inlineRanges![0]
              await this.runFormatter.formatInlineRange(pIdx, hRange.startOffset, hRange.endOffset, h2Style)
            }
            
            // If outline-level was changed`, 'FormatEngine minimal inline')
  write(path, s)
}

// Regression tests.
write('tests/v101Regression.test.ts', `import { describe, expect, it } from 'vitest'
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

  it('keeps single structural spaces and collapses multiple spaces to one', () => {
    const scanner = new CleanupScanner()
    expect(scanner.scan(makeDoc(['第一章 总则', '第一条 正文内容'])).filter(i => i.type === 'multiple-spaces')).toHaveLength(0)
    const multi = scanner.scan(makeDoc(['第一章   总则', '第一条　　正文内容'])).filter(i => i.type === 'multiple-spaces')
    expect(multi.map(i => i.suggestedText)).toEqual(['第一章 总则', '第一条 正文内容'])
    expect(multi.every(i => i.safeAutoFix)).toBe(true)
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
`)

// Version metadata.
{
  const pkg = JSON.parse(read('package.json')); pkg.version = '1.0.1'; write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  const lock = JSON.parse(read('package-lock.json')); lock.version = '1.0.1'; if (lock.packages?.['']) lock.packages[''].version = '1.0.1'; write('package-lock.json', JSON.stringify(lock, null, 2) + '\n')
  write('public/manifest.xml', read('public/manifest.xml').replace('<version>1.0.0</version>', '<version>1.0.1</version>'))
  write('publish.xml', read('publish.xml').replace('version="1.0.0"', 'version="1.0.1"').replace('WpsWordFormatter_1.0.0', 'WpsWordFormatter_1.0.1'))
  write('README.md', read('README.md').replace('`v1.0.0`', '`v1.0.1`'))
  let c = read('CHANGELOG.md')
  if (!c.includes('## [1.0.1]')) c = c.replace('All notable changes to this project will be documented here.\n', `All notable changes to this project will be documented here.\n\n## [1.0.1] - 2026-08-17\n\n### Fixed\n- 新增“第×条 + 空格 + 正文”的同段二级标题识别，空格作为标题与正文边界保留。\n- 最小修复模式支持同段二级标题：整段按正文做最小修复，仅标题 Range 套用二级标题格式。\n- “第一章 总则”“第一条 正文”等单个内部空格不再被文档清理误删。\n- 连续多个内部半角/全角空格仅压缩为 1 个，不再压缩为 0 个。\n- 一键整理并排版的 safeAutoFix 同步遵循上述空格保护规则。\n`)
  write('CHANGELOG.md', c)
}

// Normal CI coverage for this feature branch.
{
  let s = read('.github/workflows/ci.yml')
  if (!s.includes("      - 'feature/v1.0.1'")) s = s.replace("      - 'feature/v1.0'", "      - 'feature/v1.0'\n      - 'feature/v1.0.1'")
  s = s.replace("github.ref == 'refs/heads/feature/v1.0' || github.head_ref == 'feature/v1.0'", "github.ref == 'refs/heads/feature/v1.0' || github.head_ref == 'feature/v1.0' || github.ref == 'refs/heads/feature/v1.0.1' || github.head_ref == 'feature/v1.0.1'")
  s = s.replace('name: wps-word-formatter-v1.0-release-candidate', 'name: wps-word-formatter-v1.0.1-release-candidate')
  write('.github/workflows/ci.yml', s)
}

// Remove temporary patch machinery from the resulting commit.
for (const path of ['.github/workflows/apply-v1.0.1-fixes-once.yml', 'scripts/apply-v101-fixes.mjs']) {
  if (fs.existsSync(path)) fs.unlinkSync(path)
}
