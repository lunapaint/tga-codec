/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IDecodedTga, IDecodeTgaOptions, IImage32, ImageType, InterleavingFlag, ITgaDecodeContext, ITgaFooterDetails, ITgaHeaderDetails, ITgaInitialDecodeContext, ScreenOrigin } from '../shared/types.js';
import { DecodeError, DecodeErrorTga, DecodeWarning, handleTgaWarning, handleWarning } from './assert.js';
import { readText, readTextTga } from './text.js';
import { isValidBitDepthTga } from './validate.js';
import { ByteStreamReader } from './byteStreamReader.js';
import { IExtensionArea } from '../../typings/api.js';

export async function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions = {}): Promise<IDecodedTga> {
  const initialCtx: ITgaInitialDecodeContext = {
    reader: new ByteStreamReader(data, true),
    options,
    warnings: []
  };
  const header = parseHeader(initialCtx);
  const ctx: ITgaDecodeContext = {
    ...initialCtx,
    header
  };
  const idField = readTextTga(ctx, undefined, ctx.header.idLength, false);
  ctx.identificationField = idField.text;

  // TODO: Use reader instead of view in calls below
  ctx.reader.offset += ctx.header.idLength;

  if (ctx.header.colorMapType !== 0) {
    throw new DecodeErrorTga(ctx, 'TGA images with color maps are not supported yet', ctx.reader.offset);
  }
  // TODO: Support color map

  // Parse the footer before the image data as the extension area has important details on decoding
  // the data.
  ctx.footer = parseFooter(ctx);
  ctx.extensionArea = parseExtensionArea(ctx, ctx.footer.extensionAreaOffset);

  ctx.image = parseImageData(ctx, ctx.reader.offset);

  console.log('ctx', ctx);
  return {
    image: ctx.image,
    extensionArea: ctx.extensionArea!
  };
}

function parseHeader(ctx: ITgaInitialDecodeContext): ITgaHeaderDetails {
  const idLength = ctx.reader.readUint8();
  const colorMapType = ctx.reader.readUint8();
  const imageType = ctx.reader.readUint8() as ImageType;
  if (imageType !== ImageType.UncompressedTrueColor) {
    throw new Error('NYI'); // TODO: Implement
  }
  const colorMapOrigin = ctx.reader.readUint16();
  const colorMapLength = ctx.reader.readUint16();
  const colorMapDepth = ctx.reader.readUint8();
  const xOrigin = ctx.reader.readUint16();
  const yOrigin = ctx.reader.readUint16();
  const width = ctx.reader.readUint16();
  const height = ctx.reader.readUint16();
  const bitDepth = ctx.reader.readUint8();
  if (!isValidBitDepthTga(bitDepth)) {
    throw new DecodeErrorTga(ctx, `Unsupported TGA bit depth "${bitDepth}"`, 0x10);
  }
  const imageDescriptor = ctx.reader.readUint8();
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
  currentValue = ctx.reader.view.getUint16(viewOffset, true);
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
  imageData[imageOffset    ] = ctx.reader.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.reader.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.reader.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 3;
}

function readPixel32Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  // Bytes stored as BGRA
  imageData[imageOffset    ] = ctx.reader.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.reader.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.reader.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = ctx.reader.view.getUint8(viewOffset + 3);
  return 4;
}

function readPixel32BitNoAlpha(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  // Bytes stored as BGRA, A gets ignored when attribute bits is 0
  imageData[imageOffset    ] = ctx.reader.view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = ctx.reader.view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = ctx.reader.view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 4;
}

function parseExtensionArea(ctx: ITgaDecodeContext, offset: number): IExtensionArea {
  const extensionSize = ctx.reader.view.getUint16(offset, true);
  if (extensionSize !== 495) {
    // TODO: Should this be info instead?
    handleTgaWarning(ctx, new DecodeWarning('TGA file is a version other than v2', offset));
  }
  offset += 2;
  const authorName = readTextTga(ctx, undefined, 41, false);
  offset += 41;
  const authorComments = readTextTga(ctx, undefined, 324, false);
  offset += 324;
  const dateTimestamp = readDateTimestamp(ctx, offset);
  offset += dateTimestamp.bytesRead;
  const jobName = readTextTga(ctx, undefined, 41, false);
  offset += 41;
  const jobTime = readTimestamp(ctx, offset);
  offset += jobTime.bytesRead;
  const softwareId = readTextTga(ctx, undefined, 41, false);
  offset += 41;
  const softwareVersionNumber = ctx.reader.view.getUint8(offset++) / 100;
  const softwareVersionLetter = readTextTga(ctx, undefined, 2, false);
  offset += 2;
  const keyColor = readTextTga(ctx, undefined, 4, false);
  offset += 4;
  const aspectRatioNumerator = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const aspectRatioDenominator = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const gammaValueNumerator = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const gammaValueDenominator = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const colorCorrectionOffset = ctx.reader.view.getUint32(offset, true);
  offset += 4;
  const postageStampOffset = ctx.reader.view.getUint32(offset, true);
  offset += 4;
  const scanLineOffset = ctx.reader.view.getUint32(offset, true);
  offset += 4;
  const attributesType = ctx.reader.view.getUint8(offset++);
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
  const month = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const day = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const year = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const hour = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const minute = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const second = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  return {
    bytesRead: 12,
    value: new Date(year, month, day, hour, minute, second)
  };
}

function readTimestamp(ctx: ITgaDecodeContext, offset: number): { bytesRead: number, value: { hours: number, minutes: number, seconds: number } } {
  const hours = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const minutes = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  const seconds = ctx.reader.view.getUint16(offset, true);
  offset += 2;
  return {
    bytesRead: 6,
    value: { hours, minutes, seconds }
  };
}

function parseFooter(ctx: ITgaDecodeContext): ITgaFooterDetails {
  // The footer is the last 26 bytes of the file and importantly includes the offsets of the
  // extension area and developer directory
  let offset = ctx.reader.view.byteLength - 26;
  const extensionAreaOffset = ctx.reader.view.getUint32(offset, true);
  offset += 4;
  const developerDirectoryOffset = ctx.reader.view.getUint32(offset, true);
  // TODO: Pull signature
  // TODO: Verify last 2 bytes
  return {
    extensionAreaOffset,
    developerDirectoryOffset,
    signature: ''
  };
}
