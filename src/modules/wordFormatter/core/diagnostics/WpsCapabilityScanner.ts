import type { ApiCapabilityInfo } from '../../types/diagnostics'
import { getWpsApplication } from '@/addin/wps/systemApi'

export class WpsCapabilityScanner {
  static scan(): ApiCapabilityInfo[] {
    const app = getWpsApplication()
    let doc: any = null
    try { doc = app?.ActiveDocument || null } catch {}

    const safe = (name: string, getter: () => any, detail: (v: any) => string): ApiCapabilityInfo => {
      try {
        const value = getter()
        return value !== null && value !== undefined
          ? { name, status: 'available', detail: detail(value) }
          : { name, status: 'unavailable', detail: 'Not available in current host context' }
      } catch (e: any) {
        return { name, status: 'unavailable', detail: e?.message || String(e) }
      }
    }

    return [
      safe('Application', () => app, v => `Version: ${v.Version || v.Build || 'unknown'}`),
      safe('ActiveDocument', () => doc, v => `Name: ${v.Name || 'unnamed'}`),
      safe('Paragraphs', () => doc?.Paragraphs, v => `Count: ${v.Count ?? 0}`),
      safe('Tables', () => doc?.Tables, v => `Count: ${v.Count ?? 0}`),
      safe('Sections', () => doc?.Sections, v => `Count: ${v.Count ?? 0}`),
      safe('Headers', () => doc?.Sections?.Count ? doc.Sections.Item(1).Headers : null, () => 'Section Headers collection accessible'),
      safe('Footers', () => doc?.Sections?.Count ? doc.Sections.Item(1).Footers : null, () => 'Section Footers collection accessible'),
      safe('Fields', () => doc?.Fields, v => `Count: ${v.Count ?? 0}`),
      safe('TOC (TablesOfContents)', () => doc?.TablesOfContents, v => `Count: ${v.Count ?? 0}`),
      safe('OutlineLevel', () => doc?.Paragraphs?.Count ? doc.Paragraphs.Item(1).Range?.ParagraphFormat : null, () => 'ParagraphFormat.OutlineLevel accessible'),
      safe('Undo (UndoRecord)', () => app?.UndoRecord || doc?.Undo, () => 'Native UndoRecord/Undo available'),
      safe('Env', () => (window as any)?.wps?.Env || app?.Env, v => `GetAppDataPath: ${v.GetAppDataPath || v.getAppDataPath ? 'YES' : 'NO'}`),
      safe('FileSystem', () => (window as any)?.wps?.FileSystem || app?.FileSystem, () => 'WPS FileSystem object detected')
    ]
  }
}
