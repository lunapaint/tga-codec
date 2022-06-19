/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { RunLengthEncodingMask } from '../shared/constants.js';
import { IEncodeContext } from '../shared/types.js';
import { EncodeWarning, handleWarning } from './assert.js';

export function encodeRunLengthEncoding(ctx: IEncodeContext, data: Uint8Array): Uint8Array {
  // Encoding strategy is to use raw packets for pixels that differ from the following pixels and
  // RLE packets when 2+ adjacent pixels are the same.
  const bytesPerPixel = Math.ceil(ctx.bitDepth / 8);
  const bytesPerRlePacket = bytesPerPixel + 1;

  // Encode the array into another array. This is a slow but simple approach, it would be faster to
  // do this in-place. The result is initialized as the maximum possible size.
  const result = new Uint8Array(ctx.image.width * ctx.image.height * bytesPerRlePacket);

  // TODO: Improve raw packet encoding by including multiple adjacent raw pixels in the same packet
  let resultIndex = 0;
  let currentPixelOffset = 0;
  let currentPixelCount = 1;
  let j = 0;

  for (let i = bytesPerPixel; i < data.length; i += bytesPerPixel) {
    let notEqual = false;
    for (j = 0; j < bytesPerPixel; j++) {
      notEqual ||= data[currentPixelOffset + j] !== data[i + j];
    }
    // If not equal, flush the current pixel to the result array
    if (notEqual) {
      // Flush the pixel(s) to the result array
      while (currentPixelCount > 0) {
        result[resultIndex] = (Math.min(currentPixelCount, 128) - 1) | (currentPixelCount > 1 ? RunLengthEncodingMask.IsRle : 0);
        for (j = 0; j < bytesPerPixel; j++) {
          result[resultIndex + j + 1] = data[currentPixelOffset + j];
        }
        resultIndex += bytesPerRlePacket;
        currentPixelCount -= 128;
      }
      // Set new current pixel
      currentPixelOffset = i;
      currentPixelCount = 1;
    } else {
      currentPixelCount++;
    }
  }

  // Flush the remaining pixel(s) to the result array
  while (currentPixelCount > 0) {
    result[resultIndex] = (Math.min(currentPixelCount, 128) - 1) | (currentPixelCount > 1 ? RunLengthEncodingMask.IsRle : 0);
    for (j = 0; j < bytesPerPixel; j++) {
      result[resultIndex + j + 1] = data[currentPixelOffset + j];
    }
    resultIndex += bytesPerRlePacket;
    currentPixelCount -= 128;
  }

  if (resultIndex - 1 > data.length) {
    handleWarning(ctx, new EncodeWarning('RLE encoded was used but it is larger than unencoded would be', -1));
  }
  return result.slice(0, resultIndex);
}
