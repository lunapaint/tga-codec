/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { BitDepth, ColorMapDepth, ImageType } from '../shared/types.js';

export function isValidImageType(imageType: ImageType): imageType is ImageType {
  return (
    imageType === ImageType.UncompressedColorMapped ||
    imageType === ImageType.UncompressedTrueColor ||
    imageType === ImageType.UncompressedGrayscale ||
    imageType === ImageType.RunLengthEncodedColorMapped ||
    imageType === ImageType.RunLengthEncodedTrueColor ||
    imageType === ImageType.RunLengthEncodedGrayscale
  );
}

export function isValidColorMapDepth(colorMapDepth: number): colorMapDepth is ColorMapDepth {
  return (
    colorMapDepth === 15 ||
    colorMapDepth === 16 ||
    colorMapDepth === 24 ||
    colorMapDepth === 32
  );
}

export function isValidBitDepth(bitDepth: number, imageType: ImageType): bitDepth is BitDepth {
  // TODO: Support more bit depths
  if (imageType === ImageType.UncompressedColorMapped ||
      imageType === ImageType.RunLengthEncodedColorMapped) {
    return bitDepth === 8;
  }
  if (imageType === ImageType.UncompressedGrayscale ||
      imageType === ImageType.RunLengthEncodedGrayscale) {
    return bitDepth === 8 || bitDepth === 16;
  }
  // TODO 15?
  return (
    bitDepth === 16 ||
    bitDepth === 24 ||
    bitDepth === 32
  );
}
