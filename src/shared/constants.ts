/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

export const enum ImageDescriptorMask {
  AttributeBits = 0b00001111,
  ScreenOrigin  = 0b00110000
}

export const enum ImageDescriptorShift {
  AttributeBits    = 0,
  ScreenOrigin     = 4,
  InterleavingFlag = 6
}

export const enum ImageTypeMask {
  RunLengthEncoded = 0b00001000
}

export const enum RunLengthEncodingMask {
  PixelCount = 0b01111111,
  IsRle      = 0b10000000
}
