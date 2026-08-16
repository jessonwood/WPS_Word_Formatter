import { logger } from '@/shared/logger/logger'

export interface TaskPaneOptions {
  url?: string
  title?: string
  width?: number
}

function getUrlPath(): string {
  try {
    const loc = (typeof document !== 'undefined' && document.location ? document.location.toString() : window.location.href) || ''
    const cleanLoc = loc.split('?')[0].split('#')[0]
    const lastSlash = cleanLoc.lastIndexOf('/')
    if (lastSlash >= 0) {
      return cleanLoc.substring(0, lastSlash + 1)
    }
  } catch {}
  return './'
}

let sessionTaskPane: any = null

class TaskPaneManager {
  /**
   * Open or show the Word Formatter taskpane in WPS Writer
   */
  showTaskPane(options?: TaskPaneOptions): boolean {
    const wpsObj = (window as any).wps
    if (!wpsObj) {
      logger.warn('TaskPane', 'WPS object not found on window.')
      return false
    }

    try {
      // 1. If we already hold an active TaskPane instance, ensure it is visible and set width
      if (sessionTaskPane) {
        try {
          sessionTaskPane.Width = options?.width || 520
          sessionTaskPane.Visible = true
          logger.info('TaskPane', 'Reused existing TaskPane instance with width 520')
          return true
        } catch {
          sessionTaskPane = null
        }
      }

      // 2. Create standard TaskPane
      const targetUrl = options?.url || (getUrlPath() + 'index.html')
      const targetTitle = options?.title || '智能文档排版'

      logger.info('TaskPane', `Creating TaskPane: url=${targetUrl}, title=${targetTitle}`)

      if (typeof wpsObj.CreateTaskPane === 'function') {
        try {
          // Standard official WPS JSAPI takes (url, title)
          sessionTaskPane = wpsObj.CreateTaskPane(targetUrl, targetTitle)
        } catch (e1) {
          try {
            sessionTaskPane = wpsObj.CreateTaskPane(targetUrl)
          } catch (e2) {
            logger.warn('TaskPane', 'CreateTaskPane fallback failed', e2)
          }
        }
      }

      if (sessionTaskPane) {
        try {
          sessionTaskPane.DockPosition = 2 // Right dock
        } catch {}
        try {
          sessionTaskPane.Width = options?.width || 520
        } catch {}
        try {
          sessionTaskPane.Visible = true
        } catch {}

        logger.info('TaskPane', 'TaskPane displayed successfully')
        return true
      }

      return false
    } catch (err) {
      logger.error('TaskPane', 'Failed to show TaskPane', err)
      return false
    }
  }

  hideTaskPane(): void {
    if (sessionTaskPane) {
      try {
        sessionTaskPane.Visible = false
      } catch {
        sessionTaskPane = null
      }
    }
  }
}

export const taskPaneManager = new TaskPaneManager()
