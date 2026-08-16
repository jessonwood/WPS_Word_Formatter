import type { WriterAdapter } from './WriterAdapter'
import { productionWpsWriterAdapter } from './ProductionWpsWriterAdapter'
import { mockWriterAdapter } from './MockWriterAdapter'
import { getWpsHostInfo } from '@/addin/wps/systemApi'

/**
 * Explicit adapter selection boundary.
 * - Real WPS host: strict production adapter (no mock fallback)
 * - Standalone Vite/browser development: isolated mock adapter
 */
export function getDefaultWriterAdapter(): WriterAdapter {
  const host = getWpsHostInfo()
  return host.isWps && host.isWriter ? productionWpsWriterAdapter : mockWriterAdapter
}

export const defaultWriterAdapter: WriterAdapter = getDefaultWriterAdapter()
