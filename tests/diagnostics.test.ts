import { describe, it, expect } from 'vitest'
import { WpsCapabilityScanner } from '../src/modules/wordFormatter/core/diagnostics/WpsCapabilityScanner'
import { FileSystemDiagnostics } from '../src/modules/wordFormatter/core/diagnostics/FileSystemDiagnostics'
import { DocumentApiDiagnostics } from '../src/modules/wordFormatter/core/diagnostics/DocumentApiDiagnostics'
import { DiagnosticsService } from '../src/modules/wordFormatter/core/diagnostics/DiagnosticsService'
import type { DiagnosticsReport } from '../src/modules/wordFormatter/types/diagnostics'

describe('V2.4 WPS Environment Diagnostics Suite', () => {
  it('1. WpsCapabilityScanner returns 13 core WPS object capabilities without crashing', () => {
    const list = WpsCapabilityScanner.scan()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(13)

    const names = list.map(item => item.name)
    expect(names).toContain('Application')
    expect(names).toContain('ActiveDocument')
    expect(names).toContain('Paragraphs')
    expect(names).toContain('Tables')
    expect(names).toContain('Sections')
    expect(names).toContain('Headers')
    expect(names).toContain('Footers')
    expect(names).toContain('Fields')
    expect(names).toContain('TOC (TablesOfContents)')
    expect(names).toContain('OutlineLevel')
    expect(names).toContain('Undo (UndoRecord)')
    expect(names).toContain('Env')
    expect(names).toContain('FileSystem')
  })

  it('2. FileSystemDiagnostics safely executes probe lifecycle on 8 methods with correct roles', () => {
    const results = FileSystemDiagnostics.runProbe()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(8)

    const apis = results.map(r => r.api)
    expect(apis).toContain('Exists')
    expect(apis).toContain('mkdirSync/Mkdir')
    expect(apis).toContain('ReadFile')
    expect(apis).toContain('WriteFile')
    expect(apis).toContain('readFileString')
    expect(apis).toContain('writeFileString')
    expect(apis).toContain('readAsBinaryString')
    expect(apis).toContain('writeAsBinaryString')

    expect(results.find(r => r.api === 'WriteFile')?.role).toBe('PRIMARY')
    expect(results.find(r => r.api === 'writeAsBinaryString')?.role).toBe('PRIMARY-BINARY')
    expect(results.find(r => r.api === 'writeFileString')?.role).toBe('UNUSED')
  })

  it('3. DocumentApiDiagnostics inspects active document properties non-destructively', () => {
    const results = DocumentApiDiagnostics.inspect()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('4. DiagnosticsService generates full structured report with Role and formatted plain text export', () => {
    const report: DiagnosticsReport = DiagnosticsService.runFullDiagnostics()
    expect(report).toBeDefined()
    expect(report.timestamp).toBeGreaterThan(0)
    expect(report.addinVersion).toContain('v0.9.0-beta.1')
    expect(report.overall).toMatch(/healthy|warning|error/)

    const textReport = DiagnosticsService.generateTextReport(report)
    expect(typeof textReport).toBe('string')
    expect(textReport).toContain('WPS Word Formatter - 环境与能力深度诊断报告')
    expect(textReport).toContain('一、WPS 全局 API 与对象能力探查')
    expect(textReport).toContain('二、FileSystem 文件系统 Capability Matrix')
    expect(textReport).toContain('Role')
    expect(textReport).toContain('三、活动文档对象与属性探查')
    expect(textReport).toContain('持久化存储路径状态')
  })
})
