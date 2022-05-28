/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IDecodedTga, IDecodeTgaOptions, IImage32, ImageType, InterleavingFlag, ITgaHeaderDetails, ITgaInitialDecodeContext, ScreenOrigin } from '../shared/types.js';
import { DecodeError, DecodeErrorTga, DecodeWarning, handleTgaWarning, handleWarning } from './assert.js';
import { readText, readTextTga } from './text.js';

export async function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions = {}): Promise<IDecodedTga> {
  const ctx: ITgaInitialDecodeContext = {
    view: new DataView(data.buffer, data.byteOffset, data.byteLength),
    options,
    warnings: []
  }
  ctx.header = parseHeader(ctx);
  const idField = readTextTga(ctx, undefined, ctx.header.idLength, 18, 18 + ctx.header.idLength, false);
  if (ctx.header.idLength !== idField.bytesRead) {
    // TODO: Warn
  }
  ctx.identificationField = idField.text;
  const offset = 18 + ctx.header.idLength;

  if (ctx.header.colorMapType !== 0) {
    throw new DecodeErrorTga(ctx, 'TGA images with color maps are not supported yet', offset);
  }
  // TODO: Support color map

  ctx.image = parseImageData(ctx, offset);

  console.log(ctx);
  return {
    image: ctx.image
  };
}

function parseHeader(ctx: ITgaInitialDecodeContext): ITgaHeaderDetails {
  const idLength = ctx.view.getUint8(0x00);
  const colorMapType = ctx.view.getUint8(0x01);
  const imageType = ctx.view.getUint8(0x02) as ImageType;
  if (imageType !== ImageType.UncompressedTrueColor) {
    throw new Error('NYI'); // TODO: Implement
  }
  const colorMapOrigin = ctx.view.getUint16(0x03, true);
  const colorMapLength = ctx.view.getUint16(0x05, true);
  const colorMapDepth = ctx.view.getUint8(0x07);
  const xOrigin = ctx.view.getUint16(0x08, true);
  const yOrigin = ctx.view.getUint16(0x0a, true);
  const width = ctx.view.getInt16(0x0c, true);
  const height = ctx.view.getInt16(0x0e, true);
  const pixelDepth = ctx.view.getUint8(0x10);
  if (![16, 24].includes(pixelDepth)) {
    throw new DecodeErrorTga(ctx, `Unsupported TGA pixel depth "${pixelDepth}"`, offset);
  }
  const imageDescriptor = ctx.view.getUint8(0x11);
  const attributeBitsPerPixel = imageDescriptor & 0b1111;
  let reserved = imageDescriptor >> 4 & 0b1;
  if (reserved !== 0) {
    handleTgaWarning(ctx, new DecodeWarning(`Reserved bit "${reserved}" is not zero`, 0x11));
  }
  const screenOrigin = (imageDescriptor >> 5 & 0b1) as ScreenOrigin;
  const interleaving = (imageDescriptor >> 7 & 0b11) as InterleavingFlag;
  return {
    idLength,
    colorMapType,
    imageType,
    colorMapOrigin,
    colorMapLength,
    colorMapDepth,
    xOrigin,
    yOrigin,
    width,
    height,
    pixelDepth,
    imageDescriptor,
    attributeBitsPerPixel,
    screenOrigin,
    interleaving
  };
  // assertChunkDataLengthEquals(ctx, chunk, 13);

  // let offset = chunk.offset + ChunkPartByteLength.Length + ChunkPartByteLength.Type;
  // const width = ctx.view.getUint32(offset); offset += 4;
  // const height = ctx.view.getUint32(offset); offset += 4;

  // const bitDepth = ctx.view.getUint8(offset);
  // if (!isValidBitDepth(bitDepth)) {
  //   throw createChunkDecodeError(ctx, chunk, `Bit depth "${bitDepth}" is not valid`, offset);
  // }
  // offset++;

  // const colorType = ctx.view.getUint8(offset);
  // if (!isValidColorType(colorType, bitDepth)) {
  //   throw createChunkDecodeError(ctx, chunk, `Color type "${colorType}" is not valid with bit depth "${bitDepth}"`, offset);
  // }
  // offset++;

  // const compressionMethod = ctx.view.getUint8(offset);
  // assertChunkCompressionMethod(ctx, chunk, compressionMethod, offset);
  // offset++;

  // let filterMethod = ctx.view.getUint8(offset);
  // if (!isValidFilterMethod(filterMethod)) {
  //   handleWarning(ctx, createChunkDecodeWarning(chunk, `Filter method "${filterMethod}" is not valid`, offset));
  //   // Validation failed. If not in strict mode, continue with adaptive filter method
  //   filterMethod = 0;
  // }
  // offset++;

  // let interlaceMethod = ctx.view.getUint8(offset);
  // if (!isValidInterlaceMethod(interlaceMethod)) {
  //   handleWarning(ctx, createChunkDecodeWarning(chunk, `Interlace method "${interlaceMethod}" is not valid`, offset));
  //   // Validation failed. If not in strict mode, continue with no interlace method
  //   interlaceMethod = InterlaceMethod.None;
  // }
  // offset++;

  // return {
  //   width,
  //   height,
  //   bitDepth,
  //   colorType,
  //   interlaceMethod
  // };
}

// TODO: Support color map
function parseColorMap(ctx: ITgaInitialDecodeContext) {
}

function parseImageData(ctx: ITgaInitialDecodeContext, offset: number): IImage32 {
  // TODO: Narrow ctx to avoid this
  if (!ctx.header) {
    throw new Error('!');
  }
  const image = {
    width: ctx.header.width,
    height: ctx.header.height,
    data: new Uint8Array(ctx.header.width * ctx.header.height * 4)
  }
  let readPixel: (ctx: ITgaInitialDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number) => number;
  switch (ctx.header.pixelDepth) {
    case 16: readPixel = readPixel16Bit; break;
  }
  let imageOffset = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      offset += readPixel(ctx, image.data, imageOffset, offset);
      imageOffset += 4;
    }
  }
  return image;
}

let currentValue = 0;
function readPixel16Bit(ctx: ITgaInitialDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  currentValue = ctx.view.getUint16(viewOffset, true);
  // TODO: How these colors are read differs across editors - does 0b11111 = 248 or 255?
  imageData[imageOffset    ] = (currentValue >> 10 & 0x1f) << 3;
  imageData[imageOffset + 1] = (currentValue >>  5 & 0x1f) << 3;
  imageData[imageOffset + 2] = (currentValue       & 0x1f) << 3;
  imageData[imageOffset + 3] = (1 - currentValue >> 15 & 0x01) * 255;
  return 2;
}
