/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { BitDepth, IEncodeTgaOptions, ImageType, ImageTypeCompressionHint, ScreenOrigin } from '../../typings/api.js';
import { IColorMap, IEncodeContext, IImage32 } from '../shared/types.js';
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
  if (options.bitDepth !== undefined && options.imageType === undefined || options.bitDepth === undefined && options.imageType !== undefined) {
    throw new EncodeError('Bit depth and image type options must be used together', -1);
  }

  // Analyze data
  const imageTypeOrHint = options.imageType;
  let imageType: ImageType | undefined;
  let imageTypeCompressionHint: ImageTypeCompressionHint | undefined;
  if (imageTypeOrHint !== undefined) {
    if (imageTypeOrHint === ImageTypeCompressionHint.RunLengthEncoded || imageTypeOrHint === ImageTypeCompressionHint.Uncompressed) {
      imageTypeCompressionHint = imageTypeOrHint;
    } else {
      imageType = imageTypeOrHint;
    }
  }
  let bitDepth: BitDepth | undefined = options.bitDepth;
  let colorMap: IColorMap | undefined = undefined;

  // Detect transparency if the bit depth does not support it
  if (bitDepth === 24) {
    if (detectTransparencyOnly(image)) {
      // Warn about data loss
      handleWarning({ options, warnings }, new EncodeWarning(`Cannot encode 24 bit image without data loss as it contains transparent colors`, 0));
    }
  }

  if (imageType === ImageType.RunLengthEncodedColorMapped || imageType === ImageType.UncompressedColorMapped) {
    const result = detectIdealImageTypeAndBitDepth(image, imageTypeCompressionHint);
    if (!result.colorMap) {
      throw new EncodeError(`Image has too many colors to encode using a color map`, -1);
    }
    colorMap = result.colorMap;
  }

  // Determine the best bit depth
  if (!bitDepth || imageTypeCompressionHint !== undefined) {
    const result = detectIdealImageTypeAndBitDepth(image, imageTypeCompressionHint);
    if (bitDepth && bitDepth < result.bitDepth) {
      throw new EncodeError(`Image cannot be encoded using specified bit depth`, -1);
    }
    bitDepth = result.bitDepth;
    imageType = result.imageType;
    colorMap = result.colorMap;
  }

  // This shouldn't exist but is here to catch problems just in case
  if (!imageType) {
    throw new Error('No ImageType set');
  }

  return {
    bitDepth,
    imageType,
    colorMap,
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

function detectIdealImageTypeAndBitDepth(image: IImage32, imageTypeCompressionHint: ImageTypeCompressionHint | undefined): { imageType: ImageType, bitDepth: BitDepth, colorMap?: IColorMap } {
  const pixelCount = image.width * image.height;
  const indexCount = pixelCount * 4;
  let hasNon2BitTransparency = false;
  let hasTransparency = false;
  let cannotEncode5Bit = false;
  let hasColor = false;
  const uniqueColors: Set<number> = new Set();
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
    if (!hasColor) {
      hasColor = (
        image.data[i    ] !== image.data[i + 1] ||
        image.data[i    ] !== image.data[i + 2]
      );
    }
    // Stop counting colors after the maximum of 255 is reached
    if (uniqueColors.size < 256) {
      uniqueColors.add(
        (image.data[i    ] << 24) +
        (image.data[i + 1] << 16) +
        (image.data[i + 2] << 8 ) +
        (image.data[i + 3]      )
      );
    }
  }
  if (uniqueColors.size < 255) {
    const colorToIndexMap: Map<number, number> = new Map();
    let i = 0;
    for (const color of uniqueColors) {
      colorToIndexMap.set(color, i++);
    }
    let colorMap: IColorMap;
    if (!cannotEncode5Bit) {
      if (hasTransparency) {
        // 2-bit transparency doesn't seem to be supported by any editor, use 32-bit to be safe
        colorMap = { colorToIndexMap, bitDepth: 32 };
      } else {
        colorMap = { colorToIndexMap, bitDepth: 15 };
      }
    } else {
      if (hasTransparency) {
        colorMap = { colorToIndexMap, bitDepth: 32 };
      } else {
        colorMap = { colorToIndexMap, bitDepth: 24 };
      }
    }
    return {
      imageType: withCompressionHint(ImageType.RunLengthEncodedColorMapped, imageTypeCompressionHint),
      bitDepth: 8,
      colorMap
    };
  }
  if (!hasColor) {
    if (hasTransparency) {
      return { imageType: withCompressionHint(ImageType.RunLengthEncodedGrayscale, imageTypeCompressionHint), bitDepth: 16 };
    }
    return { imageType: withCompressionHint(ImageType.RunLengthEncodedGrayscale, imageTypeCompressionHint), bitDepth: 8 };
  }
  if (!cannotEncode5Bit) {
    if (hasTransparency) {
      if (hasNon2BitTransparency) {
        return { imageType: withCompressionHint(ImageType.RunLengthEncodedTrueColor, imageTypeCompressionHint), bitDepth: 32 };
      }
      return { imageType: withCompressionHint(ImageType.RunLengthEncodedTrueColor, imageTypeCompressionHint), bitDepth: 16 };
    }
    return { imageType: withCompressionHint(ImageType.RunLengthEncodedTrueColor, imageTypeCompressionHint), bitDepth: 15 };
  }
  if (hasTransparency) {
    return { imageType: withCompressionHint(ImageType.RunLengthEncodedTrueColor, imageTypeCompressionHint), bitDepth: 32 };
  }
  return { imageType: withCompressionHint(ImageType.RunLengthEncodedTrueColor, imageTypeCompressionHint), bitDepth: 24 };
}

function withCompressionHint(imageType: Exclude<ImageType, ImageType.NoImageData>, hint: ImageTypeCompressionHint | undefined): ImageType {
  if (hint === undefined) {
    return imageType;
  }
  switch (imageType) {
    case ImageType.UncompressedColorMapped:
    case ImageType.RunLengthEncodedColorMapped:
      return hint === ImageTypeCompressionHint.RunLengthEncoded ? ImageType.RunLengthEncodedColorMapped : ImageType.UncompressedColorMapped;
    case ImageType.UncompressedTrueColor:
    case ImageType.RunLengthEncodedTrueColor:
      return hint === ImageTypeCompressionHint.RunLengthEncoded ? ImageType.RunLengthEncodedTrueColor : ImageType.UncompressedTrueColor;
    case ImageType.UncompressedGrayscale:
    case ImageType.RunLengthEncodedGrayscale:
      return hint === ImageTypeCompressionHint.RunLengthEncoded ? ImageType.RunLengthEncodedGrayscale : ImageType.UncompressedGrayscale;
  }
}

/**
 * Ensure the number can be decoded to the same number using `(x << 3) | (x >> 2)`
 */
function canEncode5Bit(value: number): boolean {
  // If the 3 least significant bits must equal the 3 most significant bits the number can be
  // encoded in 5 bits (ie. xyz__xyz)
  return ((value >> 5) & 7) === (value & 7);
}
