import { logger } from '@/shared/logger/logger'

export interface WpsHostInfo {
  isWps: boolean
  isWriter: boolean
  version?: string
}

/**
 * Check host environment
 */
export function getWpsHostInfo(): WpsHostInfo {
  if (typeof window === 'undefined') {
    return { isWps: false, isWriter: false }
  }

  const wpsObj = (window as any).wps || (window as any).Application

  if (!wpsObj) {
    logger.warn('SystemApi', 'No wps object found on window. Operating in browser simulation / standalone mode.')
    return { isWps: false, isWriter: false }
  }

  // Check WPS Writer Application
  try {
    const app = getWpsApplication()
    const isWriter = !!(app && (app.Documents || app.ActiveDocument !== undefined))
    return {
      isWps: true,
      isWriter,
      version: app?.Build || app?.Version || 'WPS 2019+'
    }
  } catch (e) {
    logger.error('SystemApi', 'Failed to inspect WPS host info', e)
    return { isWps: true, isWriter: false }
  }
}

/**
 * Get active WPS application instance safely
 */
export function getWpsApplication(): any {
  if (typeof window === 'undefined') return null

  const wpsObj = (window as any).wps

  // 1. window.wps
  if (wpsObj) {
    // Try wps.WpsApplication
    if (wpsObj.WpsApplication) {
      try {
        if (typeof wpsObj.WpsApplication === 'function') {
          return wpsObj.WpsApplication()
        }
      } catch (e) {
        // In case function invocation throws
      }
      return wpsObj.WpsApplication
    }

    // Try wps.Application
    if (wpsObj.Application) {
      try {
        if (typeof wpsObj.Application === 'function') {
          return wpsObj.Application()
        }
      } catch (e) {}
      return wpsObj.Application
    }

    // Try wps.EtApplication
    if (wpsObj.EtApplication) {
      try {
        if (typeof wpsObj.EtApplication === 'function') {
          return wpsObj.EtApplication()
        }
      } catch (e) {}
      return wpsObj.EtApplication
    }

    return wpsObj
  }

  // 2. window.Application
  if ((window as any).Application) {
    return (window as any).Application
  }

  return null
}
