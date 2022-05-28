/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IDecodedTga, IDecodeTgaOptions, IImage32, ImageType, InterleavingFlag, ITgaDecodeContext, ITgaExtensionAreaDetails, ITgaFooterDetails, ITgaHeaderDetails, ITgaInitialDecodeContext, ScreenOrigin } from '../shared/types.js';
import { DecodeError, DecodeErrorTga, DecodeWarning, handleTgaWarning, handleWarning } from './assert.js';
import { readText, readTextTga } from './text.js';
import { isValidBitDepthTga } from './validate.js';

export async function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions = {}): Promise<IDecodedTga> {
  const initialCtx: ITgaInitialDecodeContext = {
    view: new DataView(data.buffer, data.byteOffset, data.byteLength),
    options,
    warnings: []
  };
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
  let offset = 18 + ctx.header.idLength;

  if (ctx.header.colorMapType !== 0) {
    throw new DecodeErrorTga(ctx, 'TGA images with color maps are not supported yet', offset);
  }
  // TODO: Support color map

  // Parse the footer before the image data as the extension area has important details on decoding
  // the data.
  ctx.footer = parseFooter(ctx);
  ctx.extensionArea = parseExtensionArea(ctx, ctx.footer.extensionAreaOffset);

  ctx.image = parseImageData(ctx, offset);
  offset += ctx.header.width * ctx.header.height * (ctx.header.bitDepth / 8);

  console.log('ctx', ctx);
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
  const bitDepth = ctx.view.getUint8(0x10);
  if (!isValidBitDepthTga(bitDepth)) {
    throw new DecodeErrorTga(ctx, `Unsupported TGA bit depth "${bitDepth}"`, 0x10);
  }
  const imageDescriptor = ctx.view.getUint8(0x11);
  // TODO: Use mask constants
  const attributeBitsPerPixel = imageDescriptor & 0b1111;
  console.log('attributeBitsPerPixel', attributeBitsPerPixel);
  const reserved = imageDescriptor >> 4 & 0b1;
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
    bitDepth,
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
  };
  let readPixel: (ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number) => number;
  switch (ctx.header.bitDepth) {
    case 16: readPixel = readPixel16Bit; break;
    case 24: readPixel = readPixel24Bit; break;
    case 32:
      if (ctx.extensionArea?.attributesType === 2) {
        readPixel = readPixel32BitNoAlpha;
      } else {
        readPixel = readPixel32Bit;
      }
      break;
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
  // Bytes stored as BGR
  imageData[imageOffset    ] = ctx.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 3;
}

function readPixel32Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  // Bytes stored as BGRA
  imageData[imageOffset    ] = ctx.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = ctx.view.getUint8(viewOffset + 3);
  return 4;
}

function readPixel32BitNoAlpha(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  // Bytes stored as BGRA, A gets ignored when attribute bits is 0
  imageData[imageOffset    ] = ctx.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 4;
}

function parseExtensionArea(ctx: ITgaDecodeContext, offset: number): ITgaExtensionAreaDetails {
  const extensionSize = ctx.view.getUint16(offset, true);
  if (extensionSize !== 495) {
    handleTgaWarning(ctx, new DecodeWarning('TGA file is a version other than v2', offset));
  }
  offset += 2;
  const authorName = readTextTga(ctx, undefined, 41, offset, offset + 41, false);
  offset += 41;
  const authorComments = readTextTga(ctx, undefined, 324, offset, offset + 324, false);
  offset += 324;
  const dateTimestamp = readDateTimestamp(ctx, offset);
  offset += dateTimestamp.bytesRead;
  const jobName = readTextTga(ctx, undefined, 41, offset, offset + 41, false);
  offset += 41;
  const jobTime = readTimestamp(ctx, offset);
  offset += jobTime.bytesRead;
  const softwareId = readTextTga(ctx, undefined, 41, offset, offset + 41, false);
  offset += 41;
  const softwareVersionNumber = ctx.view.getUint8(offset++) / 100;
  const softwareVersionLetter = readTextTga(ctx, undefined, 2, offset, offset + 2, false);
  offset += 2;
  const keyColor = readTextTga(ctx, undefined, 4, offset, offset + 4, false);
  offset += 4;
  const aspectRatioNumerator = ctx.view.getUint16(offset, true);
  offset += 2;
  const aspectRatioDenominator = ctx.view.getUint16(offset, true);
  offset += 2;
  const gammaValueNumerator = ctx.view.getUint16(offset, true);
  offset += 2;
  const gammaValueDenominator = ctx.view.getUint16(offset, true);
  offset += 2;
  const colorCorrectionOffset = ctx.view.getUint32(offset, true);
  offset += 4;
  const postageStampOffset = ctx.view.getUint32(offset, true);
  offset += 4;
  const scanLineOffset = ctx.view.getUint32(offset, true);
  offset += 4;
  const attributesType = ctx.view.getUint8(offset++);
  // TODO: Warn on unassigned or reserved attributes type
  // TODO: Scan line table
  // TODO: Postage stamp image
  // TODO: Color correction table
  return {
    extensionSize,
    authorName: authorName.text,
    authorComments: authorComments.text,
    dateTimestamp: dateTimestamp.value,
    jobName: jobName.text,
    jobTime: jobTime.value,
    softwareId: softwareId.text,
    softwareVersionNumber,
    softwareVersionLetter: softwareVersionLetter.text,
    keyColor: keyColor.text,
    aspectRatioNumerator,
    aspectRatioDenominator,
    gammaValueNumerator,
    gammaValueDenominator,
    colorCorrectionOffset,
    postageStampOffset,
    scanLineOffset,
    attributesType,
  };
}

function readDateTimestamp(ctx: ITgaDecodeContext, offset: number): { bytesRead: number, value: Date } {
  const month = ctx.view.getUint16(offset, true);
  offset += 2;
  const day = ctx.view.getUint16(offset, true);
  offset += 2;
  const year = ctx.view.getUint16(offset, true);
  offset += 2;
  const hour = ctx.view.getUint16(offset, true);
  offset += 2;
  const minute = ctx.view.getUint16(offset, true);
  offset += 2;
  const second = ctx.view.getUint16(offset, true);
  offset += 2;
  return {
    bytesRead: 12,
    value: new Date(year, month, day, hour, minute, second)
  };
}

function readTimestamp(ctx: ITgaDecodeContext, offset: number): { bytesRead: number, value: { hours: number, minutes: number, seconds: number } } {
  const hours = ctx.view.getUint16(offset, true);
  offset += 2;
  const minutes = ctx.view.getUint16(offset, true);
  offset += 2;
  const seconds = ctx.view.getUint16(offset, true);
  offset += 2;
  return {
    bytesRead: 6,
    value: { hours, minutes, seconds }
  };
}

function parseFooter(ctx: ITgaDecodeContext): ITgaFooterDetails {
  // The footer is the last 26 bytes of the file and importantly includes the offsets of the
  // extension area and developer directory
  let offset = ctx.view.byteLength - 26;
  const extensionAreaOffset = ctx.view.getUint32(offset, true);
  offset += 4;
  const developerDirectoryOffset = ctx.view.getUint32(offset, true);
  // TODO: Pull signature
  // TODO: Verify last 2 bytes
  return {
    extensionAreaOffset,
    developerDirectoryOffset,
    signature: ''
  };
}
