/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IDeveloperDirectoryEntry, IExtensionArea } from '../../typings/api.js';
import { ColorMapType, IDecodedTga, IDecodeTgaOptions, IImage32, ImageType, IReadPixelDelegate, ITgaDecodeContext, ITgaFooter, ITgaHeader, ITgaInitialDecodeContext, ScreenOrigin } from '../shared/types.js';
import { DecodeError, DecodeWarning, handleWarning } from './assert.js';
import { ByteStreamReader } from './byteStreamReader.js';
import { readText } from './text.js';
import { isValidBitDepth, isValidColorMapDepth, isValidImageType } from './validate.js';

const enum ImageDescriptorMask {
  AttributeBits = 0b00001111,
  ScreenOrigin  = 0b00110000
}

const enum ImageDescriptorShift {
  AttributeBits    = 0,
  ScreenOrigin     = 4,
  InterleavingFlag = 6
}

const enum ImageTypeMask {
  RunLengthEncoded = 0b00001000
}

const enum RunLengthEncodingMask {
  PixelCount = 0b01111111,
  IsRle      = 0b10000000
}

export async function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions = {}): Promise<IDecodedTga> {
  const initialCtx: ITgaInitialDecodeContext = {
    reader: new ByteStreamReader(data, true),
    hasAlpha: false,
    ambiguousAlpha: false,
    options,
    warnings: []
  };
  const header = parseHeader(initialCtx);
  const ctx: ITgaDecodeContext = {
    ...initialCtx,
    header
  };

  ctx.identificationField = readText(ctx, undefined, ctx.header.idLength);

  const colorMapOffset = ctx.reader.offset;

  // Parse the footer before the color map and image data as the extension area has important
  // details on decoding the data.
  ctx.footer = parseFooter(ctx);
  ctx.extensionArea = parseExtensionArea(ctx);
  ctx.developerDirectory = parseDeveloperDirectory(ctx);

  ctx.reader.offset = colorMapOffset;

  if (ctx.header.colorMapType === ColorMapType.ColorMap) {
    ctx.colorMap = parseColorMap(ctx);
  }

  ctx.hasAlpha = (
    (
      ctx.colorMap && ctx.header.colorMapDepth === 32
    ) || (
      (
        ctx.header.attributeBitsPerPixel > 0 ||
        ctx.header.bitDepth === 32
      ) && (
        ctx.extensionArea === undefined ||
        ctx.extensionArea.attributesType > 2
      )
    )
  );

  // The alpha channel is considered ambiguous when the image is determined to have alpha but its
  // attribute bits per pixel is zero. Different decoders behave differently here, it's unclear what
  // the right thing to do here but since this library is most interested in high compatibility,
  // there is an option to sample the image for pixels that and
  ctx.ambiguousAlpha = ctx.hasAlpha && ctx.header.attributeBitsPerPixel === 0;

  ctx.image = parseImageData(ctx, ctx.reader.offset);

  // console.log('ctx', ctx);

  return {
    image: ctx.image,
    details: {
      imageId: ctx.identificationField,
      width: ctx.image.width,
      height: ctx.image.height,
      developerDirectoryOffset: ctx.footer.developerDirectoryOffset,
      extensionAreaOffset: ctx.footer.extensionAreaOffset,
    },
    header: ctx.header,
    footer: ctx.footer,
    extensionArea: ctx.extensionArea,
    developerDirectory: ctx.developerDirectory,
    warnings: ctx.warnings
  };
}

function parseHeader(ctx: ITgaInitialDecodeContext): ITgaHeader {
  const idLength = ctx.reader.readUint8();
  const colorMapTypeRaw = ctx.reader.readUint8();
  let colorMapType: ColorMapType;
  if (colorMapTypeRaw === ColorMapType.NoColorMap ||
      colorMapTypeRaw === ColorMapType.ColorMap) {
    colorMapType = colorMapTypeRaw;
  } else {
    handleWarning(ctx, new DecodeWarning('Color map type unrecognized', ctx.reader.offset - 1));
    colorMapType = ColorMapType.Unrecognized;
  }
  const imageType = ctx.reader.readUint8() as ImageType;
  if (!isValidImageType(imageType)) {
    throw new DecodeError(ctx, `Invalid image type "${imageType}"`, ctx.reader.offset - 1);
  }
  if (colorMapType === ColorMapType.ColorMap &&
      imageType !== ImageType.UncompressedColorMapped &&
      imageType !== ImageType.RunLengthEncodedColorMapped) {
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
  const attributeBitsPerPixel = (imageDescriptor & ImageDescriptorMask.AttributeBits) >> ImageDescriptorShift.AttributeBits;
  const screenOrigin = ((imageDescriptor & ImageDescriptorMask.ScreenOrigin) >> ImageDescriptorShift.ScreenOrigin) as ScreenOrigin;
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
    screenOrigin
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
      if (ctx.hasAlpha) {
        readPixel = readPixel16Bit;
      } else {
        readPixel = readPixel15Bit;
      }
      break;
    case 24: readPixel = readPixel24Bit; break;
    case 32:
      // 32-bit color maps always support alpha
      readPixel = readPixel32Bit;
      break;
  }
  return (ctx, imageData, imageOffset, view, viewOffset) => {
    // Pull the color index of view and pass in the ctx's view in case view is a separate decoded
    // array
    const colorIndex = view.getUint8(viewOffset);
    readPixel(ctx, imageData, imageOffset, ctx.reader.view, colorMapOffset + colorIndex * bytesPerEntry);
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
      case 15: readPixel = readPixel15Bit; break;
      case 16:
        if (ctx.header.imageType === ImageType.RunLengthEncodedGrayscale || ctx.header.imageType === ImageType.UncompressedGrayscale) {
          readPixel = readPixel16BitGreyscale;
        } else {
          if (ctx.hasAlpha) {
            readPixel = readPixel16Bit;
          } else {
            readPixel = readPixel15Bit;
          }
        }
        break;
      case 24: readPixel = readPixel24Bit; break;
      case 32:
        if (ctx.hasAlpha) {
          readPixel = readPixel32Bit;
        } else {
          readPixel = readPixel32BitNoAlpha;
        }
        break;
    }
  }
  let view = ctx.reader.view;
  if (ctx.header.imageType & ImageTypeMask.RunLengthEncoded) {
    const decoded = decodeRunLengthEncoding(ctx);
    view = new DataView(decoded.buffer, decoded.byteOffset, decoded.length);
    offset = 0;
  }
  // While the spec does define TopRight and BottomRight, these are basically never used and
  // seemingly never supported to save by image editors. It's also very difficult to find sample
  // files to test against.
  if (ctx.header.screenOrigin === ScreenOrigin.TopLeft) {
    let imageOffset = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        offset += readPixel(ctx, image.data, imageOffset, view, offset);
        imageOffset += 4;
      }
    }
  } else {
    let imageOffset = 0;
    for (let y = image.height - 1; y >= 0; y--) {
      imageOffset = ctx.header.width * y * 4;
      for (let x = 0; x < image.width; x++) {
        offset += readPixel(ctx, image.data, imageOffset, view, offset);
        imageOffset += 4;
      }
    }
  }
  if (ctx.ambiguousAlpha && !ctx.options.strictMode && ctx.options.detectAmbiguousAlphaChannel) {
    let hasOpacity = false;
    for (let i = 3; i < image.width * image.height * 4; i += 4) {
      if (image.data[i] > 0) {
        hasOpacity = true;
      }
    }
    if (!hasOpacity) {
      handleWarning(ctx, new DecodeWarning('Image has ambiguous alpha and is fully transparent, alpha has been disabled', -1));
      for (let i = 3; i < image.width * image.height * 4; i += 4) {
        image.data[i] = 255;
      }
    }
  }
  return image;
}

function decodeRunLengthEncoding(ctx: ITgaDecodeContext): Uint8Array {
  // Decode the array into another array. This is a slow but simple approach, it would be better to
  // do this in-place.
  const bytesPerPixel = Math.ceil(ctx.header.bitDepth / 8);
  const result = new Uint8Array(ctx.header.width * ctx.header.height * bytesPerPixel);
  let byte = 0;
  let count = 0;
  let i = 0, j = 0, k = 0;
  while (i < result.length - 1) {
    byte = ctx.reader.readUint8();
    count = (byte & RunLengthEncodingMask.PixelCount) + 1;
    if (byte & RunLengthEncodingMask.IsRle) {
      // RLE
      for (j = 0; j < bytesPerPixel; j++) {
        byte = ctx.reader.readUint8();
        for (k = 0; k < count; k++) {
          result[i + k * bytesPerPixel + j] = byte;
        }
      }
      i += count * bytesPerPixel;
    } else {
      // Raw
      count *= bytesPerPixel;
      for (let k = 0; k < count; k++) {
        result[i++] = ctx.reader.readUint8();
      }
    }
  }
  return result;
}

function readPixel8BitGreyscale(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  // Bits stored as 0bGGGGGGGG
  imageData[imageOffset    ] = view.getUint8(viewOffset);
  imageData[imageOffset + 1] = imageData[imageOffset    ];
  imageData[imageOffset + 2] = imageData[imageOffset    ];
  imageData[imageOffset + 3] = 255;
  return 1;
}

function readPixel16BitGreyscale(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  // Bits stored as 0bAAAAAAAA 0bGGGGGGGG
  imageData[imageOffset    ] = view.getUint8(viewOffset    );
  imageData[imageOffset + 1] = imageData[imageOffset    ];
  imageData[imageOffset + 2] = imageData[imageOffset    ];
  imageData[imageOffset + 3] = view.getUint8(viewOffset + 1);
  return 2;
}

let currentValue = 0;
// The naive approach to decoding 15/16-bit values is to simply shift left by 3 but that would mean
// the maximum value for any channel would be 248. Unfortunately the spec isn't clear on what to do
// here so editors are inconsistent, however an approximation to scaling the value using using bit
// math seems to be the ideal approach:
//
// Convert 5-bit values to 8 bit values by shifting left by 3 and adding it to the same value
// shifted right by 2
// 00000 -> 00000 << 3 | 00000 >> 2 = 00000000
// 11000 -> 11000 << 3 | 11000 >> 2 = 11000110
// 11111 -> 11111 << 3 | 11111 >> 2 = 11111111
function readPixel15Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  currentValue = view.getUint16(viewOffset, true);
  // Bits stored as 0b_RRRRRGG 0bGGGBBBBB
  // See explanation of this in readPixel15Bit
  imageData[imageOffset    ] = currentValue >> 10 & 0x1f;
  imageData[imageOffset + 1] = currentValue >>  5 & 0x1f;
  imageData[imageOffset + 2] = currentValue       & 0x1f;
  imageData[imageOffset    ] = (imageData[imageOffset    ] << 3) | (imageData[imageOffset    ] >> 2);
  imageData[imageOffset + 1] = (imageData[imageOffset + 1] << 3) | (imageData[imageOffset + 1] >> 2);
  imageData[imageOffset + 2] = (imageData[imageOffset + 2] << 3) | (imageData[imageOffset + 2] >> 2);
  // Alpha
  imageData[imageOffset + 3] = 255;
  return 2;
}
function readPixel16Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  currentValue = view.getUint16(viewOffset, true);
  // Bits stored as 0bARRRRRGG 0bGGGBBBBB
  // Get the 5-bit values first
  imageData[imageOffset    ] = currentValue >> 10 & 0x1f;
  imageData[imageOffset + 1] = currentValue >>  5 & 0x1f;
  imageData[imageOffset + 2] = currentValue       & 0x1f;
  // Convert to 8-bit values
  imageData[imageOffset    ] = (imageData[imageOffset    ] << 3) | (imageData[imageOffset    ] >> 2);
  imageData[imageOffset + 1] = (imageData[imageOffset + 1] << 3) | (imageData[imageOffset + 1] >> 2);
  imageData[imageOffset + 2] = (imageData[imageOffset + 2] << 3) | (imageData[imageOffset + 2] >> 2);
  // Alpha
  imageData[imageOffset + 3] = (currentValue & 0x8000) ? 0 : 255;
  return 2;
}

function readPixel24Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  // Bytes stored as BGR
  imageData[imageOffset    ] = view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 3;
}

function readPixel32Bit(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  // Bytes stored as BGRA
  imageData[imageOffset    ] = view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = view.getUint8(viewOffset + 3);
  return 4;
}

function readPixel32BitNoAlpha(ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number): number {
  // Bytes stored as BGRA, A gets ignored when attribute bits is 0
  imageData[imageOffset    ] = view.getUint8(viewOffset + 2);
  imageData[imageOffset + 1] = view.getUint8(viewOffset + 1);
  imageData[imageOffset + 2] = view.getUint8(viewOffset    );
  imageData[imageOffset + 3] = 255;
  return 4;
}

function parseExtensionArea(ctx: ITgaDecodeContext): IExtensionArea | undefined {
  if (ctx.footer?.extensionAreaOffset === undefined || ctx.footer.extensionAreaOffset === 0) {
    return undefined;
  }
  ctx.reader.offset = ctx.footer.extensionAreaOffset;
  const extensionSize = ctx.reader.readUint16();
  if (extensionSize !== 495) {
    handleWarning(ctx, new DecodeWarning('TGA file is a version other than v2', ctx.reader.offset - 2));
  }
  const authorName = readText(ctx, undefined, 41).trim() || undefined;
  const authorComments = readText(ctx, undefined, 324).trim() || undefined;
  const dateTimestamp = readDateTimestamp(ctx);
  const jobName = readText(ctx, undefined, 41).trim() || undefined;
  const jobTime = readTimestamp(ctx);
  const softwareId = readText(ctx, undefined, 41).trim() || undefined;
  const softwareVersionNumber = ctx.reader.readUint8() / 100;
  const softwareVersionLetter = readText(ctx, undefined, 2);
  let softwareVersion: string | undefined;
  if (softwareVersionNumber === 0 && (softwareVersionLetter === ' ' || softwareVersionLetter.length === 0)) {
    softwareVersion = undefined;
  } else {
    softwareVersion = `${softwareVersionNumber}${softwareVersionLetter}`;
  }
  const keyColorA = ctx.reader.readUint8();
  const keyColorR = ctx.reader.readUint8();
  const keyColorG = ctx.reader.readUint8();
  const keyColorB = ctx.reader.readUint8();
  let keyColor: Uint8Array | undefined;
  if (keyColorA === 0 && keyColorR === 0 && keyColorG === 0 && keyColorB === 0) {
    keyColor = undefined;
  } else {
    // The API exposes all colors as rgba
    keyColor = new Uint8Array([keyColorR, keyColorG, keyColorB, keyColorA]);
  }
  const aspectRatioNumerator = ctx.reader.readUint16();
  const aspectRatioDenominator = ctx.reader.readUint16();
  let aspectRatio: number | undefined;
  if (aspectRatioDenominator === 0) {
    aspectRatio = undefined;
  } else {
    aspectRatio = aspectRatioNumerator / aspectRatioDenominator;
  }
  const gammaNumerator = ctx.reader.readUint16();
  const gammaDenominator = ctx.reader.readUint16();
  let gamma: number | undefined;
  if (gammaDenominator === 0) {
    gamma = undefined;
  } else {
    gamma = gammaNumerator / gammaDenominator;
  }
  const colorCorrectionOffset = ctx.reader.readUint32();
  const postageStampOffset = ctx.reader.readUint32();
  const scanLineOffset = ctx.reader.readUint32();
  const attributesType = ctx.reader.readUint8();
  return {
    extensionSize,
    authorName,
    authorComments,
    dateTimestamp,
    jobName,
    jobTime,
    softwareId,
    softwareVersion,
    keyColor,
    aspectRatio,
    gamma,
    colorCorrectionOffset,
    postageStampOffset,
    scanLineOffset,
    attributesType,
  };
}

function parseDeveloperDirectory(ctx: ITgaDecodeContext): IDeveloperDirectoryEntry[] {
  if (ctx.footer?.developerDirectoryOffset === undefined || ctx.footer.developerDirectoryOffset === 0) {
    return [];
  }
  ctx.reader.offset = ctx.footer!.developerDirectoryOffset;
  const tagCount = ctx.reader.readUint16();
  const directory: IDeveloperDirectoryEntry[] = [];
  for (let i = 0; i < tagCount; i++) {
    const tag = ctx.reader.readUint16();
    const offset = ctx.reader.readUint32();
    const length = ctx.reader.readUint32();
    directory.push({ tag, offset, length });
  }
  return directory;
}

function readDateTimestamp(ctx: ITgaDecodeContext): Date | undefined {
  const month = ctx.reader.readUint16();
  const day = ctx.reader.readUint16();
  const year = ctx.reader.readUint16();
  const hour = ctx.reader.readUint16();
  const minute = ctx.reader.readUint16();
  const second = ctx.reader.readUint16();
  if (month === 0 && day === 0 && year === 0 && hour === 0 && minute === 0 && second === 0) {
    return undefined;
  }
  return new Date(year, month, day, hour, minute, second);
}

function readTimestamp(ctx: ITgaDecodeContext): { hours: number, minutes: number, seconds: number } | undefined {
  const hours = ctx.reader.readUint16();
  const minutes = ctx.reader.readUint16();
  const seconds = ctx.reader.readUint16();
  if (hours === 0 && minutes === 0 && seconds === 0) {
    return undefined;
  }
  return { hours, minutes, seconds };
}

function parseFooter(ctx: ITgaDecodeContext): ITgaFooter {
  // The footer is the last 26 bytes of the file and importantly includes the offsets of the
  // extension area and developer directory

  // Verify the signature to see if the footer is present
  ctx.reader.offset = ctx.reader.view.byteLength - 26 + 8;
  const signature = readText(ctx, undefined, 17);
  if (signature !== 'TRUEVISION-XFILE.' || ctx.reader.readUint8() !== 0) {
    return {
      extensionAreaOffset: 0,
      developerDirectoryOffset: 0
    };
  }

  // Valid signature, reset the offset and read
  ctx.reader.offset = ctx.reader.view.byteLength - 26;
  let extensionAreaOffset = ctx.reader.readUint32();
  if (extensionAreaOffset >= ctx.reader.view.byteLength) {
    handleWarning(ctx, new DecodeWarning(`Extension area offset "${extensionAreaOffset}" is invalid`, ctx.reader.offset - 4));
    extensionAreaOffset = 0;
  }
  let developerDirectoryOffset = ctx.reader.readUint32();
  if (developerDirectoryOffset >= ctx.reader.view.byteLength) {
    handleWarning(ctx, new DecodeWarning(`Developer directory offset "${developerDirectoryOffset}" is invalid`, ctx.reader.offset - 4));
    developerDirectoryOffset = 0;
  }
  return {
    extensionAreaOffset,
    developerDirectoryOffset
  };
}
