import type { WriterAdapter } from './WriterAdapter'
import { productionWpsWriterAdapter } from './ProductionWpsWriterAdapter'
import { mockWriterAdapter } from './MockWriterAdapter'
import { getWpsHostInfo } from '@/addin/wps/systemApi'

/**
 * Explicit adapter selection boundary.
 * - Real WPS Writer host: strict production adapter
 * - Standalone Vite/browser development: isolated mock adapter
 * - Other WPS components: fail closed; never fall back to a fake Writer document
 */
export function getDefaultWriterAdapter(): WriterAdapter {
  const host = getWpsHostInfo()

  if (!host.isWps) {
    return mockWriterAdapter
  }

  if (host.isWriter) {
    return productionWpsWriterAdapter
  }

  throw new Error(
    `WPS Word Formatter only supports WPS Writer. Current host: ${host.kind || 'unknown'}.`
  )
}

export const defaultWriterAdapter: WriterAdapter = getDefaultWriterAdapter()
