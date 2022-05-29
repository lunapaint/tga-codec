/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IExtensionArea } from '../../typings/api.js';
import { ColorMapType, IDecodedTga, IDecodeTgaOptions, IImage32, ImageType, InterleavingFlag, IReadPixelDelegate, ITgaDecodeContext, ITgaFooterDetails, ITgaHeaderDetails, ITgaInitialDecodeContext, ScreenOrigin } from '../shared/types.js';
import { DecodeError, DecodeWarning, handleWarning } from './assert.js';
import { ByteStreamReader } from './byteStreamReader.js';
import { readText } from './text.js';
import { isValidBitDepth, isValidColorMapDepth } from './validate.js';

const enum ImageDescriptorMask {
  AttributeBits    = 0b00001111,
  Reserved         = 0b00010000,
  ScreenOrigin     = 0b00100000,
  InterleavingFlag = 0b11000000
}

const enum ImageDescriptorShift {
  AttributeBits    = 0,
  Reserved         = 4,
  ScreenOrigin     = 5,
  InterleavingFlag = 6
}

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

  ctx.identificationField = readText(ctx, undefined, ctx.header.idLength);

  if (ctx.header.colorMapType === ColorMapType.ColorMap) {
    // TODO: Support color map
    ctx.colorMap = parseColorMap(ctx);

    // throw new DecodeErrorTga(ctx, 'TGA images with color maps are not supported yet', ctx.reader.offset);
  }

  const dataOffset = ctx.reader.offset;

  // Parse the footer before the image data as the extension area has important details on decoding
  // the data.
  ctx.footer = parseFooter(ctx);
  ctx.extensionArea = parseExtensionArea(ctx, ctx.footer.extensionAreaOffset);

  ctx.reader.offset = dataOffset;
  ctx.image = parseImageData(ctx, ctx.reader.offset);

  // console.log('ctx', ctx);
  return {
    image: ctx.image,
    extensionArea: ctx.extensionArea!,
    details: {
      identificationField: ctx.identificationField
    }
  };
}

function parseHeader(ctx: ITgaInitialDecodeContext): ITgaHeaderDetails {
  const idLength = ctx.reader.readUint8();
  const colorMapTypeRaw = ctx.reader.readUint8();
  let colorMapType: ColorMapType;
  if (colorMapTypeRaw === ColorMapType.NoColorMap ||
      colorMapTypeRaw === ColorMapType.ColorMap) {
    colorMapType = colorMapTypeRaw;
  } else {
    // TODO: Info color map type, treat as no color map
    colorMapType = ColorMapType.Unrecognized;
  }
  const imageType = ctx.reader.readUint8() as ImageType;
  if (imageType !== ImageType.UncompressedColorMapped &&
      imageType !== ImageType.UncompressedTrueColor &&
      imageType !== ImageType.UncompressedGrayscale) {
    throw new Error('NYI'); // TODO: Implement
  }
  if (colorMapType === ColorMapType.ColorMap &&
      imageType !== ImageType.UncompressedColorMapped /*&&
      imageType !== ImageType.RunLengthEncodedColorMapped*/) {
    handleWarning(ctx, new DecodeWarning(`Image type "${imageType}" cannot have a color map`, ctx.reader.offset - 2));
  }
  const colorMapOrigin = ctx.reader.readUint16();
  const colorMapLength = ctx.reader.readUint16();
  const colorMapDepth = ctx.reader.readUint8();
  if (colorMapType === ColorMapType.ColorMap) {
    if (colorMapOrigin >= colorMapLength) {
      // This is just a warning as the origin is ignored anyway
      handleWarning(ctx, new DecodeWarning(`Color map origin "${colorMapOrigin}" is greater than color map length "${colorMapLength}"`, ctx.reader.offset - 5));
    }
    if (!isValidColorMapDepth(colorMapDepth)) {
      throw new DecodeError(ctx, `Unsupported color map bit depth "${colorMapDepth}"`, ctx.reader.offset - 1);
    }
  }
  const xOrigin = ctx.reader.readUint16();
  const yOrigin = ctx.reader.readUint16();
  const width = ctx.reader.readUint16();
  const height = ctx.reader.readUint16();
  const bitDepth = ctx.reader.readUint8();
  if (!isValidBitDepth(bitDepth, imageType)) {
    throw new DecodeError(ctx, `Unsupported TGA bit depth "${bitDepth}" with image type ${imageType}`, 0x10);
  }
  const imageDescriptor = ctx.reader.readUint8();
  const attributeBitsPerPixel = imageDescriptor & ImageDescriptorMask.AttributeBits >> ImageDescriptorShift.AttributeBits;
  const reserved = imageDescriptor & ImageDescriptorMask.Reserved >> ImageDescriptorShift.Reserved;
  if (reserved !== 0) {
    handleWarning(ctx, new DecodeWarning(`Reserved bit "${reserved}" is not zero`, 0x11));
  }
  const screenOrigin = (imageDescriptor & ImageDescriptorMask.ScreenOrigin >> ImageDescriptorShift.ScreenOrigin) as ScreenOrigin;
  const interleaving = (imageDescriptor & ImageDescriptorMask.InterleavingFlag >> ImageDescriptorShift.InterleavingFlag) as InterleavingFlag;
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

function parseColorMap(ctx: ITgaDecodeContext): IReadPixelDelegate {
  const colorMapOffset = ctx.reader.offset;
  const bytesPerEntry = Math.ceil(ctx.header.colorMapDepth / 8);
  // Skip the length of the color map
  ctx.reader.offset += ctx.header.colorMapLength * bytesPerEntry;
  let readPixel: IReadPixelDelegate;
  switch (ctx.header.colorMapDepth) {
    case 15: readPixel = readPixel15Bit; break;
    case 16:
      if (ctx.extensionArea?.attributesType === 2 || ctx.header.attributeBitsPerPixel === 0) {
        readPixel = readPixel15Bit;
      } else {
        readPixel = readPixel16Bit;
      }
      break;
    case 24: readPixel = readPixel24Bit; break;
    case 32:
      if (ctx.extensionArea?.attributesType === 2 || ctx.header.attributeBitsPerPixel === 0) {
        readPixel = readPixel32BitNoAlpha;
      } else {
        readPixel = readPixel32Bit;
      }
      break;
  }
  return (ctx, imageData, imageOffset, viewOffset) => {
    const colorIndex = ctx.reader.view.getUint8(viewOffset);
    readPixel(ctx, imageData, imageOffset, colorMapOffset + colorIndex * bytesPerEntry);
    return 1;
  };
}

function parseImageData(ctx: ITgaDecodeContext, offset: number): IImage32 {
  const image = {
    width: ctx.header.width,
    height: ctx.header.height,
    data: new Uint8Array(ctx.header.width * ctx.header.height * 4)
  };
  let readPixel: IReadPixelDelegate;
  if (ctx.colorMap) {
    readPixel = ctx.colorMap;
  } else {
    switch (ctx.header.bitDepth) {
      case 8: readPixel = readPixel8BitGreyscale; break;
      // case 15: readPixel = readPixel15Bit; break;
      case 16:
        if (ctx.extensionArea?.attributesType === 2 || ctx.header.attributeBitsPerPixel === 0) {
          readPixel = readPixel15Bit;
        } else {
          readPixel = readPixel16Bit;
        }
        break;
      case 24: readPixel = readPixel24Bit; break;
      case 32:
        if (ctx.extensionArea?.attributesType === 2 || ctx.header.attributeBitsPerPixel === 0) {
          readPixel = readPixel32BitNoAlpha;
        } else {
          readPixel = readPixel32Bit;
        }
        break;
      default:
        throw new Error('NYI'); // TODO: Implement
    }
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

function readPixel8BitGreyscale(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  // Bits stored as 0bGGGGGGGG
  imageData[imageOffset    ] = ctx.reader.view.getUint8(viewOffset);
  imageData[imageOffset + 1] = imageData[imageOffset    ];
  imageData[imageOffset + 2] = imageData[imageOffset    ];
  imageData[imageOffset + 3] = 255;
  return 1;
}
// The conversion from 5 bit to 8 bit color differs across editors, some naively shift the value
// by 3 meaning the maximum channel value is 248 (`0b11111000`). The most correct approach seems
// to be scaling the value to 0-255.
let currentValue = 0;
function readPixel15Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  currentValue = ctx.reader.view.getUint16(viewOffset, true);
  // Bits stored as 0b_RRRRRGG 0bGGGBBBBB
  imageData[imageOffset    ] = scaleToRange(currentValue >> 10 & 0x1f, 0x1f, 0xff);
  imageData[imageOffset + 1] = scaleToRange(currentValue >>  5 & 0x1f, 0x1f, 0xff);
  imageData[imageOffset + 2] = scaleToRange(currentValue       & 0x1f, 0x1f, 0xff);
  imageData[imageOffset + 3] = 255;
  return 2;
}
function readPixel16Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number): number {
  currentValue = ctx.reader.view.getUint16(viewOffset, true);
  // Bits stored as 0bARRRRRGG 0bGGGBBBBB
  imageData[imageOffset    ] = scaleToRange(currentValue >> 10 & 0x1f, 0x1f, 0xff);
  imageData[imageOffset + 1] = scaleToRange(currentValue >>  5 & 0x1f, 0x1f, 0xff);
  imageData[imageOffset + 2] = scaleToRange(currentValue       & 0x1f, 0x1f, 0xff);
  imageData[imageOffset + 3] = (1 - currentValue >> 15 & 0x01) * 255;
  console.log('readpixel16bit', imageData.slice(imageOffset, imageOffset + 4));
  return 2;
}

function scaleToRange(value: number, maxValue: number, scaledMax: number): number {
  return Math.round((value / maxValue) * scaledMax);
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
  ctx.reader.offset = ctx.footer!.extensionAreaOffset;
  const extensionSize = ctx.reader.readUint16();
  if (extensionSize !== 495) {
    // TODO: Should this be info instead?
    handleWarning(ctx, new DecodeWarning('TGA file is a version other than v2', ctx.reader.offset - 2));
  }
  const authorName = readText(ctx, undefined, 41);
  const authorComments = readText(ctx, undefined, 324);
  const dateTimestamp = readDateTimestamp(ctx);
  const jobName = readText(ctx, undefined, 41);
  const jobTime = readTimestamp(ctx);
  const softwareId = readText(ctx, undefined, 41);
  const softwareVersionNumber = ctx.reader.readUint8() / 100;
  const softwareVersionLetter = readText(ctx, undefined, 2);
  const keyColor = readText(ctx, undefined, 4);
  const aspectRatioNumerator = ctx.reader.readUint16();
  const aspectRatioDenominator = ctx.reader.readUint16();
  const gammaValueNumerator = ctx.reader.readUint16();
  const gammaValueDenominator = ctx.reader.readUint16();
  const colorCorrectionOffset = ctx.reader.readUint32();
  const postageStampOffset = ctx.reader.readUint32();
  const scanLineOffset = ctx.reader.readUint32();
  const attributesType = ctx.reader.readUint8();
  // TODO: Warn on unassigned or reserved attributes type
  // TODO: Scan line table
  // TODO: Postage stamp image
  // TODO: Color correction table
  return {
    extensionSize,
    authorName,
    authorComments,
    dateTimestamp,
    jobName,
    jobTime,
    softwareId,
    softwareVersionNumber,
    softwareVersionLetter,
    keyColor,
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

function readDateTimestamp(ctx: ITgaDecodeContext): Date {
  const month = ctx.reader.readUint16();
  const day = ctx.reader.readUint16();
  const year = ctx.reader.readUint16();
  const hour = ctx.reader.readUint16();
  const minute = ctx.reader.readUint16();
  const second = ctx.reader.readUint16();
  return new Date(year, month, day, hour, minute, second);
}

function readTimestamp(ctx: ITgaDecodeContext): { hours: number, minutes: number, seconds: number } {
  const hours = ctx.reader.readUint16();
  const minutes = ctx.reader.readUint16();
  const seconds = ctx.reader.readUint16();
  return { hours, minutes, seconds };
}

function parseFooter(ctx: ITgaDecodeContext): ITgaFooterDetails {
  // The footer is the last 26 bytes of the file and importantly includes the offsets of the
  // extension area and developer directory
  ctx.reader.offset = ctx.reader.view.byteLength - 26;
  const extensionAreaOffset = ctx.reader.readUint32();
  const developerDirectoryOffset = ctx.reader.readUint32();
  // TODO: Pull signature
  // TODO: Verify last 2 bytes
  return {
    extensionAreaOffset,
    developerDirectoryOffset,
    signature: ''
  };
}
