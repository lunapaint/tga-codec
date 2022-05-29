/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { BitDepth, ColorMapDepth, ImageType } from '../shared/types.js';

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
  if (imageType === ImageType.UncompressedGrayscale ||
      imageType === ImageType.UncompressedColorMapped ||
      imageType === ImageType.RunLengthEncodedGrayscale) {
    return bitDepth === 8;
  }
  return (
    bitDepth === 16 ||
    bitDepth === 24 ||
    bitDepth === 32
  );
}
