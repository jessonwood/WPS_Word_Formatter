import { logger } from '@/shared/logger/logger'

export type WpsHostKind = 'browser' | 'writer' | 'spreadsheets' | 'presentation' | 'wps-unknown'

export interface WpsHostInfo {
  isWps: boolean
  isWriter: boolean
  isSpreadsheet?: boolean
  isPresentation?: boolean
  kind?: WpsHostKind
  version?: string
}

function safeRead(target: any, key: string): any {
  try {
    return target?.[key]
  } catch {
    return undefined
  }
}

/**
 * Return only an already-existing WPS/add-in root object.
 *
 * IMPORTANT: host detection must be side-effect free. In particular, never call
 * wps.WpsApplication(), wps.EtApplication() or other component factory functions here:
 * those factories may start another WPS component process merely to answer a host check.
 */
function getExistingWpsRoot(): any {
  if (typeof window === 'undefined') return null

  const win = window as any

  // WPS add-in pages expose Application/wps as the current JS Core root. Prefer the
  // already-created global Application object when present, then the wps alias.
  if (win.Application && typeof win.Application !== 'function') return win.Application
  if (win.wps && typeof win.wps !== 'function') return win.wps

  return null
}

function detectHostKind(root: any): WpsHostKind {
  if (!root) return 'browser'

  // Prefer active-object markers. They identify the component currently hosting this
  // browser page without creating/activating any other WPS component.
  const activeWorkbook = safeRead(root, 'ActiveWorkbook')
  if (activeWorkbook !== undefined && activeWorkbook !== null) return 'spreadsheets'

  const activeDocument = safeRead(root, 'ActiveDocument')
  if (activeDocument !== undefined && activeDocument !== null) return 'writer'

  const activePresentation = safeRead(root, 'ActivePresentation')
  if (activePresentation !== undefined && activePresentation !== null) return 'presentation'

  // Application.Value is documented as "ET" for WPS Spreadsheets. Some WPS builds also
  // expose analogous component identifiers. Reading the value is safe; do not invoke a
  // component factory just because the value is unavailable.
  const value = String(safeRead(root, 'Value') || '').trim().toUpperCase()
  if (value === 'ET') return 'spreadsheets'
  if (value === 'WPP' || value.includes('PRESENTATION')) return 'presentation'
  if (value === 'WPS' || value === 'KWPS' || value.includes('WRITER')) return 'writer'

  // Collection fallbacks are useful when the component has no active file yet.
  const workbooks = safeRead(root, 'Workbooks')
  const documents = safeRead(root, 'Documents')
  const presentations = safeRead(root, 'Presentations')

  if (workbooks !== undefined && workbooks !== null && documents == null) return 'spreadsheets'
  if (documents !== undefined && documents !== null && workbooks == null) return 'writer'
  if (presentations !== undefined && presentations !== null && documents == null && workbooks == null) return 'presentation'

  return 'wps-unknown'
}

/**
 * Inspect the current host without creating another WPS application instance.
 */
export function getWpsHostInfo(): WpsHostInfo {
  if (typeof window === 'undefined') {
    return { isWps: false, isWriter: false, kind: 'browser' }
  }

  const win = window as any
  const root = getExistingWpsRoot()
  const hasWpsRuntime = !!(root || win.wps || win.Application)

  if (!hasWpsRuntime) {
    logger.debug('SystemApi', 'No WPS host detected. Operating in browser simulation / standalone mode.')
    return { isWps: false, isWriter: false, kind: 'browser' }
  }

  const kind = detectHostKind(root)
  const isWriter = kind === 'writer'
  const isSpreadsheet = kind === 'spreadsheets'
  const isPresentation = kind === 'presentation'

  let version: string | undefined
  if (root) {
    const build = safeRead(root, 'Build')
    const appVersion = safeRead(root, 'Version')
    if (build !== undefined && build !== null) version = String(build)
    else if (appVersion !== undefined && appVersion !== null) version = String(appVersion)
  }

  return {
    isWps: true,
    isWriter,
    isSpreadsheet,
    isPresentation,
    kind,
    version
  }
}

/**
 * Get the already-running WPS Writer application object.
 *
 * This function intentionally does NOT call wps.WpsApplication(). Calling a component
 * factory from an ET/Spreadsheets host can start an extra WPS Writer/WPS Office process.
 * The formatter is Writer-only, so fail closed when the current root cannot be proven to
 * be Writer instead of starting another component as a side effect.
 */
export function getWpsApplication(): any {
  const root = getExistingWpsRoot()
  if (!root) return null

  return detectHostKind(root) === 'writer' ? root : null
}
