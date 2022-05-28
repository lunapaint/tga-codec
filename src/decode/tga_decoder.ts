/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IDecodedTga, IDecodeTgaOptions, IImage32, ImageType, InterleavingFlag, ITgaDecodeContext, ITgaHeaderDetails, ITgaInitialDecodeContext, ScreenOrigin } from '../shared/types.js';
import { DecodeError, DecodeErrorTga, DecodeWarning, handleTgaWarning, handleWarning } from './assert.js';
import { readText, readTextTga } from './text.js';
import { isValidBitDepthTga } from './validate.js';

export async function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions = {}): Promise<IDecodedTga> {
  const initialCtx: ITgaInitialDecodeContext = {
    view: new DataView(data.buffer, data.byteOffset, data.byteLength),
    options,
    warnings: []
  }
  const header = parseHeader(initialCtx);
  const ctx: ITgaDecodeContext = {
    ...initialCtx,
    header
  };
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

  console.log('header', ctx.header);
  console.log('image', ctx.image);
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
  if (!isValidBitDepthTga(pixelDepth)) {
    throw new DecodeErrorTga(ctx, `Unsupported TGA pixel depth "${pixelDepth}"`, 0x10);
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
}

// TODO: Support color map
function parseColorMap(ctx: ITgaDecodeContext) {
}

function parseImageData(ctx: ITgaDecodeContext, offset: number): IImage32 {
  const image = {
    width: ctx.header.width,
    height: ctx.header.height,
    data: new Uint8Array(ctx.header.width * ctx.header.height * 4)
  }
  let readPixel: (ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number) => number;
  switch (ctx.header.pixelDepth) {
    case 16: readPixel = readPixel16Bit; break;
    case 24: readPixel = readPixel24Bit; break;
    default:
      throw new Error('NYI'); // TODO: Implement
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
function readPixel16Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  currentValue = ctx.view.getUint16(viewOffset, true);
  // Bits stored as 0bARRRRRGG 0bGGGBBBBB
  // TODO: How these colors are read differs across editors - does 0b11111 = 248 or 255?
  imageData[imageOffset    ] = (currentValue >> 10 & 0x1f) << 3;
  imageData[imageOffset + 1] = (currentValue >>  5 & 0x1f) << 3;
  imageData[imageOffset + 2] = (currentValue       & 0x1f) << 3;
  imageData[imageOffset + 3] = (1 - currentValue >> 15 & 0x01) * 255;
  return 2;
}

function readPixel24Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  currentValue = ctx.view.getUint16(viewOffset, true);
  // Bytes stored as BGR
  imageData[imageOffset    ] = ctx.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 3;
}
