import type { DocumentModel, ParagraphModel } from '../../types/document'

let protectedEmbeddedParagraphIndexes = new Set<number>()

/**
 * Returns true when the paragraph contains a WPS object/range that must not receive
 * ordinary paragraph formatting or text cleanup. Inline charts are exposed through
 * InlineShapes, floating charts/images through Shapes, and bookmarks/fields may also
 * be invalidated by whole-range rewrites.
 */
export function paragraphContainsProtectedEmbeddedObject(paragraph: ParagraphModel): boolean {
  return !!(
    paragraph.hasImage ||
    paragraph.hasShape ||
    paragraph.hasField ||
    paragraph.hasBookmark
  )
}

/**
 * Register protected paragraphs for the current formatting session. The template option
 * controls whether ordinary formatting skips these paragraphs.
 */
export function registerEmbeddedObjectProtection(document: DocumentModel, enabled: boolean): void {
  protectedEmbeddedParagraphIndexes = new Set<number>()
  if (!enabled) return

  for (const paragraph of document.paragraphs || []) {
    if (paragraphContainsProtectedEmbeddedObject(paragraph)) {
      protectedEmbeddedParagraphIndexes.add(paragraph.index)
    }
  }
}

export function isEmbeddedObjectParagraphProtected(paragraphIndex: number): boolean {
  return protectedEmbeddedParagraphIndexes.has(paragraphIndex)
}
