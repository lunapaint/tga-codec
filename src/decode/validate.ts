/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { BitDepth, BitDepthTga, ColorMapDepth, ColorType, FilterMethod, ImageType, InterlaceMethod } from '../shared/types.js';

export function isValidColorMapDepth(colorMapDepth: number): colorMapDepth is ColorMapDepth {
  return (
    colorMapDepth === 15 ||
    colorMapDepth === 16 ||
    colorMapDepth === 24 ||
    colorMapDepth === 32
  );
}

export function isValidBitDepthTga(bitDepth: number, imageType: ImageType): bitDepth is BitDepthTga {
  // TODO: Support more bit depths
  if (imageType === ImageType.UncompressedGrayscale || imageType === ImageType.UncompressedColorMapped) {
    return bitDepth === 8;
  }
  return (
    bitDepth === 16 ||
    bitDepth === 24 ||
    bitDepth === 32
  );
}

export function isValidBitDepth(bitDepth: number): bitDepth is BitDepth {
  return (
    bitDepth === 1 ||
    bitDepth === 2 ||
    bitDepth === 4 ||
    bitDepth === 8 ||
    bitDepth === 16
  );
}

export function isValidColorType(colorType: number, bitDepth: number): colorType is ColorType {
  return (
    (colorType === ColorType.Grayscale         && bitDepth >= 1 && bitDepth <= 16) ||
    (colorType === ColorType.Truecolor         && bitDepth >= 8 && bitDepth <= 16) ||
    (colorType === ColorType.Indexed           && bitDepth >= 1 && bitDepth <=  8) ||
    (colorType === ColorType.GrayscaleAndAlpha && bitDepth >= 8 && bitDepth <= 16) ||
    (colorType === ColorType.TruecolorAndAlpha && bitDepth >= 8 && bitDepth <= 16)
  );
}

export function isValidFilterMethod(filterMethod: number): filterMethod is FilterMethod {
  return filterMethod === FilterMethod.Adaptive;
}

export function isValidInterlaceMethod(interlaceMethod: number): interlaceMethod is InterlaceMethod {
  return (
    interlaceMethod === InterlaceMethod.None ||
    interlaceMethod === InterlaceMethod.Adam7
  );
}
