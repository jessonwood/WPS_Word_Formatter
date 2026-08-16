import type { ParagraphModel } from '../../types/document'

export interface SpecialObjectsSummary {
  paragraphsWithImages: number[]
  paragraphsWithShapes: number[]
  paragraphsWithFields: number[]
  paragraphsWithBookmarks: number[]
}

export class SpecialObjectScanner {
  scan(paragraphs: ParagraphModel[]): SpecialObjectsSummary {
    const summary: SpecialObjectsSummary = {
      paragraphsWithImages: [],
      paragraphsWithShapes: [],
      paragraphsWithFields: [],
      paragraphsWithBookmarks: []
    }

    for (const p of paragraphs) {
      if (p.hasImage) summary.paragraphsWithImages.push(p.index)
      if (p.hasShape) summary.paragraphsWithShapes.push(p.index)
      if (p.hasField) summary.paragraphsWithFields.push(p.index)
      if (p.hasBookmark) summary.paragraphsWithBookmarks.push(p.index)
    }

    return summary
  }
}
