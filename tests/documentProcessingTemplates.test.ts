import { describe, expect, it } from 'vitest'
import {
  ordinaryOfficialDocumentTemplate,
  regulationTemplate,
  businessOperationTemplate
} from '../src/modules/wordFormatter/templates/documentProcessing2025'

function expectCommonPhotoRules(template: typeof ordinaryOfficialDocumentTemplate) {
  expect(template.isBuiltIn).toBe(true)
  expect(template.mainTitle.chineseFont).toBe('方正小标宋简体')
  expect(template.mainTitle.fontSizePt).toBe(22)
  expect(template.mainTitle.alignment).toBe('center')
  expect(template.mainTitle.lineSpacingRule).toBe('single')

  expect(template.heading1.chineseFont).toBe('黑体')
  expect(template.heading2?.chineseFont).toBe('楷体_GB2312')
  expect(template.heading3?.chineseFont).toBe('仿宋_GB2312')
  expect(template.heading4?.chineseFont).toBe('仿宋_GB2312')
  expect(template.heading5?.chineseFont).toBe('仿宋_GB2312')

  for (const heading of template.headings ?? []) {
    expect(heading.style.fontSizePt).toBe(16)
    expect(heading.style.firstLineIndentChars).toBe(2)
    expect(heading.style.alignment).toBe('justify')
    expect(heading.style.lineSpacingPt).toBe(30)
    expect(heading.style.lineSpacingRule).toBe('exact')
    expect(heading.style.westernFont).toBe('Times New Roman')
  }

  expect(template.body.chineseFont).toBe('仿宋_GB2312')
  expect(template.body.fontSizePt).toBe(16)
  expect(template.body.firstLineIndentChars).toBe(2)
  expect(template.body.alignment).toBe('justify')
  expect(template.body.lineSpacingPt).toBe(30)

  expect(template.tableCaption.chineseFont).toBe('黑体')
  expect(template.tableCaption.fontSizePt).toBe(16)
  expect(template.tableCaption.alignment).toBe('center')
  expect(template.table.chineseFont).toBe('宋体')
  expect(template.table.fontSizePt).toBe(12)

  expect(template.attachment.chineseFont).toBe('黑体')
  expect(template.attachment.fontSizePt).toBe(16)
  expect(template.attachment.firstLineIndentChars).toBe(0)
}

function expectPattern(template: typeof ordinaryOfficialDocumentTemplate, level: number, sample: string) {
  const definition = template.headings?.find(item => item.level === level)
  expect(definition?.pattern).toBeTruthy()
  expect(new RegExp(definition!.pattern!)).toMatch(sample)
}

describe('2025 document processing built-in templates', () => {
  it('implements common photo typography rules for all three templates', () => {
    expectCommonPhotoRules(ordinaryOfficialDocumentTemplate)
    expectCommonPhotoRules(regulationTemplate)
    expectCommonPhotoRules(businessOperationTemplate)
  })

  it('recognizes ordinary official-document numbering', () => {
    expectPattern(ordinaryOfficialDocumentTemplate, 1, '一、工作要求')
    expectPattern(ordinaryOfficialDocumentTemplate, 2, '（一）总体要求')
    expectPattern(ordinaryOfficialDocumentTemplate, 3, '1. 数据来源')
    expectPattern(ordinaryOfficialDocumentTemplate, 4, '（1）业务范围')
    expectPattern(ordinaryOfficialDocumentTemplate, 5, '①具体步骤')
  })

  it('recognizes regulation numbering', () => {
    expectPattern(regulationTemplate, 1, '第一章 总则')
    expectPattern(regulationTemplate, 2, '第一条 适用范围')
    expectPattern(regulationTemplate, 3, '（一）基本原则')
    expectPattern(regulationTemplate, 4, '1. 工作职责')
    expectPattern(regulationTemplate, 5, '（1）办理流程')
  })

  it('recognizes hierarchical business-operation numbering', () => {
    expectPattern(businessOperationTemplate, 1, '1. 总则')
    expectPattern(businessOperationTemplate, 2, '1.1 适用范围')
    expectPattern(businessOperationTemplate, 3, '1.1.1 岗位职责')
    expectPattern(businessOperationTemplate, 4, '1.1.1.1 操作流程')
    expectPattern(businessOperationTemplate, 5, '1.1.1.1.1 审核要求')
  })
})
