/**
 * WPS Writer JSAPI internal constants & enumerations
 */

export const WpsAlignment = {
  wdAlignParagraphLeft: 0,
  wdAlignParagraphCenter: 1,
  wdAlignParagraphRight: 2,
  wdAlignParagraphJustify: 3
} as const

export const WpsLineSpacing = {
  wdLineSpaceSingle: 0,
  wdLineSpace1pt5: 1,
  wdLineSpaceDouble: 2,
  wdLineSpaceExactly: 4,
  wdLineSpaceMultiple: 5
} as const

export const WpsOutlineLevel = {
  wdOutlineLevel1: 1,
  wdOutlineLevel2: 2,
  wdOutlineLevel3: 3,
  wdOutlineLevel4: 4,
  wdOutlineLevel5: 5,
  wdOutlineLevelBodyText: 10
} as const

export const WpsCellVerticalAlignment = {
  wdCellAlignVerticalTop: 0,
  wdCellAlignVerticalCenter: 1,
  wdCellAlignVerticalBottom: 3
} as const

export const WpsUnderline = {
  wdUnderlineNone: 0,
  wdUnderlineSingle: 1
} as const

export const WpsBorder = {
  wdBorderTop: -1,
  wdBorderLeft: -2,
  wdBorderBottom: -3,
  wdBorderRight: -4,
  wdBorderHorizontal: -5,
  wdBorderVertical: -6,
  wdBorderDiagonalDown: -7,
  wdBorderDiagonalUp: -8
} as const
