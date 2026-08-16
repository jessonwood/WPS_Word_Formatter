import { logger } from '@/shared/logger/logger'
import { taskPaneManager } from './taskpane'

/**
 * Register ribbon action callbacks on window object for WPS ribbon.xml integration
 */
export function registerRibbonHandlers() {
  if (typeof window === 'undefined') return

  const handleOpen = (control?: any): boolean => {
    try {
      logger.info('Ribbon', 'Opening Formatter TaskPane')
      taskPaneManager.showTaskPane({ title: '智能文档排版', width: 520 })
      try {
        window.dispatchEvent(new CustomEvent('wps:open-formatter'))
      } catch {}
    } catch (e) {
      logger.error('Ribbon', 'Error in handleOpen', e)
    }
    return true
  }

  const handleScan = (control?: any): boolean => {
    try {
      logger.info('Ribbon', 'Running Quick Scan from ribbon')
      taskPaneManager.showTaskPane({ title: '智能文档排版', width: 520 })
      try {
        window.dispatchEvent(new CustomEvent('wps:quick-scan'))
      } catch {}
    } catch (e) {
      logger.error('Ribbon', 'Error in handleScan', e)
    }
    return true
  }

  const handleUndo = (control?: any): boolean => {
    try {
      logger.info('Ribbon', 'Undoing last format from ribbon')
      try {
        window.dispatchEvent(new CustomEvent('wps:undo-format'))
      } catch {}
    } catch (e) {
      logger.error('Ribbon', 'Error in handleUndo', e)
    }
    return true
  }

  // Standard universal WPS Ribbon entry point
  ;(window as any).OnAction = (control: any) => {
    try {
      const eleId = control && (control.Id || control.id || control.ID)
      if (eleId === 'btnScanDoc') {
        return handleScan(control)
      }
      if (eleId === 'btnUndoFormat') {
        return handleUndo(control)
      }
      return handleOpen(control)
    } catch (e) {
      return true
    }
  }

  // Individual callbacks for direct ribbon mappings
  ;(window as any).OnOpenWordFormatter = handleOpen
  ;(window as any).OnQuickScanDoc = handleScan
  ;(window as any).OnUndoLastFormat = handleUndo

  logger.info('Ribbon', 'Ribbon action handlers registered successfully')
}
