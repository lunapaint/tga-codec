/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IEncodedTga, IEncodeTgaOptions } from '../../typings/api.js';
import { IEncodeContext, IImage32, ImageType } from '../shared/types.js';
import { EncodeError, EncodeWarning } from './assert.js';
import { ByteStream } from './byteStream.js';

export async function encodeTga(image: Readonly<IImage32>, options: IEncodeTgaOptions = {}): Promise<IEncodedTga> {
  if (image.data.length !== image.width * image.height * 4) {
    throw new EncodeError(`Provided image data length (${image.data.length}) is not expected length (${image.width * image.height * 4})`, Math.min(image.data.length, image.width * image.height * 4) - 1);
  }

  // Create all file sections
  const sections: Uint8Array[] = [];

  const ctx = analyze(image, options);

  sections.push(writeTgaHeader(ctx));
  if (ctx.imageId.length > 0) {
    sections.push(writeImageId(ctx));
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
  // TODO: Support encoding color map
  stream.writeUint8(0);
  // Image Type
  // TODO: Support other image types
  stream.writeUint8(ImageType.UncompressedTrueColor);

  // Color Map Specification
  // First entry index
  stream.writeUint16(0);
  // Length
  stream.writeUint16(0);
  // Size
  stream.writeUint8(0);

  // Image Specification
  // X origin
  // TODO: Support setting x origin
  stream.writeUint16(0);
  // X origin
  // TODO: Support setting y origin
  stream.writeUint16(0);
  // Width
  stream.writeUint16(ctx.image.width);
  // Height
  stream.writeUint16(ctx.image.height);
  // Bit depth
  // TODO: Support other bit depths
  stream.writeUint8(32);
  // Image descriptor
  // TODO: Support image origin
  // TODO: Support other alpha channel bits
  stream.writeUint8(8);

  stream.assertAtEnd();
  return stream.array;
}

function writeImageId(ctx: IEncodeContext): Uint8Array {
  const stream = new ByteStream(ctx.imageId.length, true);

  stream.assertAtEnd();
  return stream.array;
}

function writeImageData(ctx: IEncodeContext): Uint8Array {
  const stream = new ByteStream(ctx.image.width * ctx.image.height * 4, true);
  let imageOffset = 0;
  for (let y = ctx.image.height - 1; y >= 0; y--) {
    imageOffset = ctx.image.width * y * 4;
    for (let x = 0; x < ctx.image.width; x++) {
      // Bytes stored as BGRA
      stream.writeUint8(ctx.image.data[imageOffset + 2]);
      stream.writeUint8(ctx.image.data[imageOffset + 1]);
      stream.writeUint8(ctx.image.data[imageOffset + 0]);
      stream.writeUint8(ctx.image.data[imageOffset + 3]);
      imageOffset += 4;
    }
  }
  return stream.array;
}


  // let i = 0;
  // // Keyword
  // for (; i < keyword.length; i++) {
  //   stream.writeUint8(keyword.charCodeAt(i));
  // }
  // // Null separator
  // stream.writeUint8(0);
  // // Text
  // for (i = 0; i < text.length; i++) {
  //   stream.writeUint8(text.charCodeAt(i));
  // }
// }

function analyze(image: Readonly<IImage32>, options: IEncodeTgaOptions = {}): IEncodeContext {
  const warnings: EncodeWarning[] = [];
  const info: string[] = [];

  if (options.imageId && options.imageId.length > 255) {
    throw new EncodeError(`Image ID length too high ${options.imageId} > 255`, -1);
  }

  // TODO: Analyze image and get actual bit depth
  const bitDepth = options.bitDepth || 32;
  return {
    bitDepth,
    imageId: options.imageId || '',
    options,
    warnings,
    info,
    image
  };
}
