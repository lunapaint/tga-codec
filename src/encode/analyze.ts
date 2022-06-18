/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { BitDepth, IEncodeTgaOptions, ScreenOrigin } from '../../typings/api.js';
import { IEncodeContext, IImage32 } from '../shared/types.js';
import { EncodeError, EncodeWarning, handleWarning } from './assert.js';

export function analyze(image: Readonly<IImage32>, options: IEncodeTgaOptions = {}): IEncodeContext {
  const warnings: EncodeWarning[] = [];
  const info: string[] = [];
  const partialCtx: Pick<IEncodeContext, 'options' | 'warnings'> = {
    options,
    warnings
  };

  if (image.width > 65535) {
    throw new EncodeError(`Image width is out of range (${image.width} > 65535)`, -1);
  }
  if (image.height > 65535) {
    throw new EncodeError(`Image height is out of range (${image.height} > 65535)`, -1);
  }
  if (image.data.length !== image.width * image.height * 4) {
    throw new EncodeError(`Provided image data length (${image.data.length}) is not expected length (${image.width * image.height * 4})`, Math.min(image.data.length, image.width * image.height * 4) - 1);
  }
  if (options.imageId && options.imageId.length > 255) {
    throw new EncodeError(`Image ID length is out of range (${options.imageId.length} > 255)`, -1);
  }
  if (options.origin && (options.origin.x || 0) > 65535) {
    throw new EncodeError(`X origin is out of range (${options.origin.x} > 65535)`, -1);
  }
  if (options.origin && (options.origin.y || 0) > 65535) {
    throw new EncodeError(`Y origin is out of range (${options.origin.y} > 65535)`, -1);
  }
  if (options.screenOrigin === ScreenOrigin.BottomRight) {
    handleWarning(partialCtx, new EncodeWarning('This image is encoded using a bottom right screen origin, many image editors won\'t read this correctly', 17));
  }
  if (options.screenOrigin === ScreenOrigin.TopRight) {
    handleWarning(partialCtx, new EncodeWarning('This image is encoded using a top right screen origin, many image editors won\'t read this correctly', 17));
  }

  // Analyze data
  // TODO: Support setting options.bitDepth explicitly
  // TODO: Support more bit depths
  let bitDepth: BitDepth | undefined = options.bitDepth;

  // TODO: Warn about other explicit bit depth data loss
  // Detect transparency if the bit depth does not support it
  if (bitDepth === 24) {
    if (detectTransparencyOnly(image)) {
      // Warn about data loss
      handleWarning({ options, warnings }, new EncodeWarning(`Cannot encode 24 bit image without data loss as it contains transparent colors`, 0));
    }
  }

  // Determine the best bit depth
  if (!bitDepth) {
    bitDepth = detectIdealBitDepth(image);
  }

  return {
    bitDepth,
    imageId: options.imageId || '',
    options,
    warnings,
    info,
    image
  };
}

function detectTransparencyOnly(image: IImage32): boolean {
  const pixelCount = image.width * image.height;
  const indexCount = pixelCount * 4;
  let hasTransparency = false;
  for (let i = 0; i < indexCount; i += 4) {
    hasTransparency ||= image.data[i + 3] < 255;
  }
  return hasTransparency;
}

// TODO: This should play nicely with color maps and greyscale
function detectIdealBitDepth(image: IImage32): BitDepth {
  const pixelCount = image.width * image.height;
  const indexCount = pixelCount * 4;
  let hasNon2BitTransparency = false;
  let hasTransparency = false;
  let cannotEncode5Bit = false;
  for (let i = 0; i < indexCount; i += 4) {
    hasNon2BitTransparency ||= image.data[i + 3] > 0 && image.data[i + 3] < 255;
    hasTransparency ||= image.data[i + 3] < 255;
    if (!cannotEncode5Bit) {
      cannotEncode5Bit ||= (
        !canEncode5Bit(image.data[i    ]) ||
        !canEncode5Bit(image.data[i + 1]) ||
        !canEncode5Bit(image.data[i + 2]) ||
        !canEncode5Bit(image.data[i + 3])
      );
    }
  }
  if (!cannotEncode5Bit) {
    if (hasTransparency) {
      if (hasNon2BitTransparency) {
        return 32;
      }
      return 16;
    }
    return 15;
  }
  if (hasTransparency) {
    return 32;
  }
  return 24;
}

/**
 * Ensure the number can be decoded to the same number using `(x << 3) | (x >> 2)`
 */
function canEncode5Bit(value: number): boolean {
  // The least significant 3 bits must equal the most significant 3 bits:
  // zyx__zyx
  // imageData[imageOffset    ] = (imageData[imageOffset    ] << 3) | (imageData[imageOffset    ] >> 2);

  return ((value >> 5) & 7) === (value & 7);
}
