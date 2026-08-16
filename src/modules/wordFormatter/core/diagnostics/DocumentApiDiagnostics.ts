import type { DocumentApiCapabilityResult } from '../../types/diagnostics'
import { getWpsApplication } from '@/addin/wps/systemApi'

export class DocumentApiDiagnostics {
  static inspect(): DocumentApiCapabilityResult[] {
    const app = getWpsApplication()
    let doc: any = null
    try { doc = app?.ActiveDocument || null } catch {}

    if (!doc) {
      return [{ api: 'ActiveDocument', status: 'WARN', message: 'No active WPS Writer document' }]
    }

    const rows: DocumentApiCapabilityResult[] = []
    const read = (api: string, getter: () => any) => {
      try {
        const value = getter()
        rows.push({ api, status: 'PASS', value: value ?? '' })
      } catch (e: any) {
        rows.push({ api, status: 'FAIL', message: e?.message || String(e) })
      }
    }

    read('Document.Name', () => doc.Name)
    read('Document.FullName', () => doc.FullName || doc.Path || '')
    try {
      const saved = Boolean(doc.Saved)
      rows.push({
        api: 'Document Saved State',
        status: saved ? 'SAVED' : 'UNSAVED',
        value: saved ? '当前文档全部修改已写入磁盘' : '当前文档存在未保存修改'
      })
    } catch (e: any) {
      rows.push({ api: 'Document Saved State', status: 'FAIL', message: e?.message || String(e) })
    }

    read('Paragraphs.Count', () => doc.Paragraphs?.Count ?? 0)
    read('Tables.Count', () => doc.Tables?.Count ?? 0)
    read('Sections.Count', () => doc.Sections?.Count ?? 0)
    read('InlineShapes.Count', () => doc.InlineShapes?.Count ?? 0)
    read('Shapes.Count', () => doc.Shapes?.Count ?? 0)
    read('Fields.Count', () => doc.Fields?.Count ?? 0)
    read('TablesOfContents.Count', () => doc.TablesOfContents?.Count ?? 0)
    read('Bookmarks.Count', () => doc.Bookmarks?.Count ?? 0)
    read('Comments.Count', () => doc.Comments?.Count ?? 0)

    return rows
  }
}
