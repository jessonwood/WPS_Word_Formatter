import type { BlankLineMode } from '../../types/template'
import type { ParagraphModel } from '../../types/document'

export interface BlankLineAction {
  paragraphIndex: number
  action: 'keep' | 'remove'
}

export class BlankLineCleaner {
  plan(paragraphs: ParagraphModel[], mode: BlankLineMode): BlankLineAction[] {
    if (mode === 'keep') {
      return paragraphs.map(p => ({ paragraphIndex: p.index, action: 'keep' }))
    }

    const actions: BlankLineAction[] = []
    let consecutiveBlankCount = 0

    for (const p of paragraphs) {
      if (p.isEmpty) {
        consecutiveBlankCount++
        if (mode === 'remove-all') {
          actions.push({ paragraphIndex: p.index, action: 'remove' })
        } else if (mode === 'keep-single-collapse-multiple') {
          // Keep the first blank line, remove subsequent consecutive blanks
          if (consecutiveBlankCount > 1) {
            actions.push({ paragraphIndex: p.index, action: 'remove' })
          } else {
            actions.push({ paragraphIndex: p.index, action: 'keep' })
          }
        } else if (mode === 'remove-single-collapse-multiple') {
          actions.push({ paragraphIndex: p.index, action: 'remove' })
        }
      } else {
        consecutiveBlankCount = 0
        actions.push({ paragraphIndex: p.index, action: 'keep' })
      }
    }

    return actions
  }
}
