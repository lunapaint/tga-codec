/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { ColorMapType, IEncodedTga, IEncodeTgaOptions, ImageType, ScreenOrigin } from '../../typings/api.js';
import { ImageDescriptorMask, ImageDescriptorShift, ImageTypeMask, RunLengthEncodingMask } from '../shared/constants.js';
import { IByteStream, IEncodeContext, IImage32, IWritePixelDelegate } from '../shared/types.js';
import { analyze } from './analyze.js';
import { handleWarning } from './assert.js';
import { ByteStream } from './byteStream.js';
import { encodeRunLengthEncoding } from './rle.js';

export async function encodeTga(image: Readonly<IImage32>, options: IEncodeTgaOptions = {}): Promise<IEncodedTga> {
  const ctx = analyze(image, options);

  // Create all file sections
  const sections: Uint8Array[] = [];
  sections.push(writeTgaHeader(ctx));
  if (ctx.imageId.length > 0) {
    sections.push(writeImageId(ctx));
  }
  if (ctx.colorMap) {
    sections.push(writeColorMap(ctx));
  }
  sections.push(writeImageData(ctx));
  // console.log('sections', sections);

  // Merge sections into a single typed array
  const totalLength = sections.reduce((p, c) => p + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const s of sections) {
    result.set(s, offset);
    offset += s.length;
  }
  // console.log('result', result);

  return {
    data: result,
    warnings: ctx.warnings,
    info: ctx.info
  };
}

function writeTgaHeader(ctx: IEncodeContext): Uint8Array {
  const stream = new ByteStream(18, true);
  // Image ID
  stream.writeUint8(ctx.imageId.length);
  // Color Map Type
  stream.writeUint8(ctx.colorMap ? ColorMapType.ColorMap : ColorMapType.NoColorMap);
  // Image Type
  stream.writeUint8(ctx.imageType);

  // Color Map Specification
  // First entry index
  stream.writeUint16(0);
  // Length
  stream.writeUint16(ctx.colorMap?.colorToIndexMap.size ?? 0);
  // Size
  stream.writeUint8(ctx.colorMap?.bitDepth ?? 0);

  // Image Specification
  // X origin
  stream.writeUint16(ctx.options.origin?.x || 0);
  // X origin
  stream.writeUint16(ctx.options.origin?.y || 0);
  // Width
  stream.writeUint16(ctx.image.width);
  // Height
  stream.writeUint16(ctx.image.height);
  // Bit depth
  stream.writeUint8(ctx.bitDepth);
  // Image descriptor
  const imageDescriptor = (
    // alpha channel bits
    ((ctx.bitDepth === 32 ? 8 : 0) & ImageDescriptorMask.AttributeBits) |
    // screen origin
    ((ctx.options.screenOrigin ?? ScreenOrigin.BottomLeft) << ImageDescriptorShift.ScreenOrigin & ImageDescriptorMask.ScreenOrigin)
  );
  stream.writeUint8(imageDescriptor);

  stream.assertAtEnd();
  return stream.array;
}

function writeImageId(ctx: IEncodeContext): Uint8Array {
  const stream = new ByteStream(ctx.imageId.length, true);
  for (let i = 0; i < ctx.imageId.length; i++) {
    stream.writeUint8(ctx.imageId.charCodeAt(i));
  }
  stream.assertAtEnd();
  return stream.array;
}

function writeColorMap(ctx: IEncodeContext): Uint8Array {
  const cm = ctx.colorMap;
  if (!cm) {
    throw new Error('Cannot write color map undefined');
  }
  const bitsPerPixel = Math.ceil(cm.bitDepth / 8);
  const stream = new ByteStream(cm.colorToIndexMap.size * bitsPerPixel, true);

  let writePixel: IWritePixelDelegate;
  switch (cm.bitDepth) {
    case 15: writePixel = writePixel15Bit; break;
    case 16: writePixel = writePixel16Bit; break;
    case 24: writePixel = writePixel24Bit; break;
    case 32: writePixel = writePixel32Bit; break;
    default:
      throw new Error(`Unsupported bit depth for color map "${cm.bitDepth}"`);
  }

  const sortedColors = Array.from(cm.colorToIndexMap.entries()).sort((a, b) => a[1] - b[1]).map(e => e[0]);
  for (const color of sortedColors) {
    writePixel(stream, new Uint8Array([
      (color >> 24) & 0xFF,
      (color >> 16) & 0xFF,
      (color >>  8) & 0xFF,
      (color      ) & 0xFF,
    ]), 0);
  }

  stream.assertAtEnd();
  return stream.array;
}

function writeImageData(ctx: IEncodeContext): Uint8Array {
  const bytesPerPixel = Math.ceil(ctx.bitDepth / 8);
  const stream = new ByteStream(ctx.image.width * ctx.image.height * bytesPerPixel, true);
  let imageOffset = 0;
  let writePixel: IWritePixelDelegate;
  if (ctx.colorMap) {
    const cm = ctx.colorMap;
    writePixel = (stream: IByteStream, imageData: Uint8Array, imageOffset: number) => {
      const colorIndex = cm.colorToIndexMap.get(
        (imageData[imageOffset    ] << 24) +
        (imageData[imageOffset + 1] << 16) +
        (imageData[imageOffset + 2] << 8 ) +
        (imageData[imageOffset + 3]      )
      )!;
      stream.writeUint8(colorIndex);
    };
  } else {
    switch (ctx.bitDepth) {
      case 8:
        if (ctx.imageType === ImageType.UncompressedGrayscale || ctx.imageType === ImageType.RunLengthEncodedGrayscale) {
          writePixel = writePixel8BitGreyscale;
        } else {
          throw new Error(`Unsupported image type (${ctx.imageType}) with bit depth (${ctx.bitDepth})`);
        }
        break;
      case 15: writePixel = writePixel15Bit; break;
      case 16:
        if (ctx.imageType === ImageType.UncompressedGrayscale || ctx.imageType === ImageType.RunLengthEncodedGrayscale) {
          writePixel = writePixel16BitGreyscale;
        } else {
          writePixel = writePixel16Bit;
        }
        break;
      case 24: writePixel = writePixel24Bit; break;
      case 32: writePixel = writePixel32Bit; break;
      default:
        // TODO: Implement other bit depths
        throw new Error('NYI');
    }
  }
  switch (ctx.options.screenOrigin ?? ScreenOrigin.BottomLeft) {
    case ScreenOrigin.BottomLeft:
      for (let y = ctx.image.height - 1; y >= 0; y--) {
        imageOffset = ctx.image.width * y * 4;
        for (let x = 0; x < ctx.image.width; x++) {
          writePixel(stream, ctx.image.data, imageOffset);
          imageOffset += 4;
        }
      }
      break;
    case ScreenOrigin.BottomRight:
      for (let y = ctx.image.height - 1; y >= 0; y--) {
        imageOffset = (ctx.image.width * y + (ctx.image.width - 1)) * 4;
        for (let x = 0; x < ctx.image.width; x++) {
          writePixel(stream, ctx.image.data, imageOffset);
          imageOffset -= 4;
        }
      }
      break;
    case ScreenOrigin.TopLeft:
      for (let y = 0; y < ctx.image.height; y++) {
        imageOffset = ctx.image.width * y * 4;
        for (let x = 0; x < ctx.image.width; x++) {
          writePixel(stream, ctx.image.data, imageOffset);
          imageOffset += 4;
        }
      }
      break;
    case ScreenOrigin.TopRight:
      for (let y = 0; y < ctx.image.height; y++) {
        imageOffset = (ctx.image.width * y + (ctx.image.width - 1)) * 4;
        for (let x = 0; x < ctx.image.width; x++) {
          writePixel(stream, ctx.image.data, imageOffset);
          imageOffset -= 4;
        }
      }
      break;
  }
  stream.assertAtEnd();

  if (ctx.imageType & ImageTypeMask.RunLengthEncoded) {
    // TODO: Ideally when the RLE result is larger, this would warn only when the option was
    // explicit, otherwise switch to unencoded
    return encodeRunLengthEncoding(ctx, stream.array);
  }
  return stream.array;
}

function writePixel8BitGreyscale(stream: IByteStream, imageData: Uint8Array, imageOffset: number) {
  // Bits stored as 0bGGGGGGGG
  stream.writeUint8(imageData[imageOffset    ]);
}

function writePixel15Bit(stream: IByteStream, imageData: Uint8Array, imageOffset: number) {
  // Bits stored as 0b_RRRRRGG 0bGGGBBBBB
  stream.writeUint16(
    (((imageData[imageOffset + 0] >> 3) & 0x1f) << 10) |
    (((imageData[imageOffset + 1] >> 3) & 0x1f) <<  5) |
    (((imageData[imageOffset + 2] >> 3) & 0x1f) <<  0)
  );
}

function writePixel16Bit(stream: IByteStream, imageData: Uint8Array, imageOffset: number) {
  // Bits stored as 0bARRRRRGG 0bGGGBBBBB
  stream.writeUint16(
    (((imageData[imageOffset + 0] >> 3) & 0x1f) << 10) |
    (((imageData[imageOffset + 1] >> 3) & 0x1f) <<  5) |
    (((imageData[imageOffset + 2] >> 3) & 0x1f) <<  0) |
    (imageData[imageOffset + 3] === 255 ? (1 << 15) : 0)
  );
}

function writePixel16BitGreyscale(stream: IByteStream, imageData: Uint8Array, imageOffset: number) {
  // Bits stored as 0bGGGGGGGG 0bAAAAAAAA
  stream.writeUint8(imageData[imageOffset    ]);
  stream.writeUint8(imageData[imageOffset + 3]);
}

function writePixel24Bit(stream: IByteStream, imageData: Uint8Array, imageOffset: number) {
  // Bytes stored as BGR
  stream.writeUint8(imageData[imageOffset + 2]);
  stream.writeUint8(imageData[imageOffset + 1]);
  stream.writeUint8(imageData[imageOffset + 0]);
}

function writePixel32Bit(stream: IByteStream, imageData: Uint8Array, imageOffset: number) {
  // Bytes stored as BGRA
  stream.writeUint8(imageData[imageOffset + 2]);
  stream.writeUint8(imageData[imageOffset + 1]);
  stream.writeUint8(imageData[imageOffset + 0]);
  stream.writeUint8(imageData[imageOffset + 3]);
}
