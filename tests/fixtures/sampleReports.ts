import type { DocumentModel, ParagraphModel } from '../../src/modules/wordFormatter/types/document'

export function createSampleReportFixture(): DocumentModel {
  const rawData = [
    { text: '关于印发2026年小微企业信贷风险管理报告的通知', align: 'center', size: 22, bold: true },
    { text: '银发〔2026〕18号', align: 'center', size: 14, bold: false },
    { text: '各分行、各直属机构、总行各部门：', align: 'left', size: 16, bold: false },
    { text: '为进一步健全普惠小微金融风险防控机制，现将《2026年小微企业信贷风险管理报告》印发给你们，请认真贯彻执行。', align: 'left', size: 16, bold: false },
    { text: '一、总体风险运行情况', align: 'left', size: 16, bold: true },
    { text: '2026年上半年，我行小微企业信贷业务保持稳健发展势头。截至6月末，全行小微企业贷款余额达到1.25亿元，较年初增长3.14%，资产质量整体保持在可控区间。', align: 'left', size: 16, bold: false },
    { text: '（一）资产质量总体稳定。截至6月末，不良贷款率较年初下降1.2个百分点，逾期90天以上贷款与不良贷款比例持续保持在80%以内。', align: 'left', size: 16, bold: false },
    { text: '（二）重点领域风险逐步出清。通过开展专项排查与分类处置，高风险行业小微贷款余额稳步压降。', align: 'left', size: 16, bold: false },
    { text: '1. 重点监测行业名单制管理', align: 'left', size: 16, bold: false },
    { text: '严格实施动态名单制准入，定期评估存量客户经营现金流情况。', align: 'left', size: 16, bold: false },
    { text: '2. 优化担保与抵质押措施', align: 'left', size: 16, bold: false },
    { text: '提升抵押物评估科学性，防范抵押物价值快速变动风险。', align: 'left', size: 16, bold: false },
    { text: '（1）严格贷前调查与穿透核查', align: 'left', size: 16, bold: false },
    { text: '强化对企业实际控制人信用记录及关联负债的穿透式核查。', align: 'left', size: 16, bold: false },
    { text: '表1 2026年上半年小微信贷风险分类统计表', align: 'center', size: 14, bold: false },
    { text: '图1 2026年风险趋势变化图', align: 'center', size: 14, bold: false },
    { text: '二、主要存在问题及成因分析', align: 'left', size: 16, bold: true },
    { text: '部分分支机构对外部经济环境波动的预判仍显不足，贷后主动管理精细化程度有待提升。', align: 'left', size: 16, bold: false },
    { text: '附件：1. 2026年重点小微企业风险台账', align: 'left', size: 16, bold: false },
    { text: '2. 分支机构信贷排查整改清单', align: 'left', size: 16, bold: false }
  ]

  const paragraphs: ParagraphModel[] = rawData.map((d, idx) => ({
    index: idx + 1,
    text: d.text,
    rawText: d.text + '\r',
    normalizedText: d.text,
    rangeStart: idx * 100,
    rangeEnd: (idx + 1) * 100,
    alignment: (d.align as any) || 'left',
    fontSize: d.size || 16,
    bold: d.bold,
    hasImage: idx === 15,
    hasShape: false,
    hasField: false,
    hasBookmark: false,
    hasCommentReference: false,
    isEmpty: d.text.trim().length === 0
  }))

  return {
    id: 'sample_bank_report_01',
    name: '2026年小微企业信贷风险管理报告.docx',
    paragraphCount: paragraphs.length,
    tableCount: 1,
    sectionCount: 1,
    paragraphs,
    tables: [{
      index: 1,
      rangeStart: 1400,
      rangeEnd: 1500,
      rowCount: 4,
      columnCount: 4,
      previousParagraphIndex: 15,
      nextParagraphIndex: 16
    }],
    sections: [{
      index: 1,
      pageWidth: 595.3,
      pageHeight: 841.9,
      topMargin: 104.9,
      bottomMargin: 99.2,
      leftMargin: 79.4,
      rightMargin: 73.7,
      orientation: 'portrait'
    }],
    metadata: {
      title: '2026年小微企业信贷风险管理报告',
      charCount: paragraphs.reduce((acc, p) => acc + p.text.length, 0)
    },
    signature: 'mock_signature_bank_01'
  }
}
