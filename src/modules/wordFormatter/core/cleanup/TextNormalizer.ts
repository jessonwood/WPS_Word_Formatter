import { cleanControlChars } from '@/shared/utils/stringUtils'

export class TextNormalizer {
  normalizeParagraphText(text: string): string {
    return cleanControlChars(text)
  }
}
