/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IEncodedTga, IEncodeTgaOptions } from '../../typings/api.js';
import { IEncodeContext, IImage32 } from '../shared/types.js';
import { EncodeError, EncodeWarning } from './assert.js';
import { ByteStream } from './byteStream.js';

export async function encodeTga(image: Readonly<IImage32>, options: IEncodeTgaOptions = {}): Promise<IEncodedTga> {
  if (image.data.length !== image.width * image.height * 4) {
    throw new EncodeError(`Provided image data length (${image.data.length}) is not expected length (${image.width * image.height * 4})`, Math.min(image.data.length, image.width * image.height * 4) - 1);
  }

  // Create all file sections
  const sections: Uint8Array[] = [];
  sections.push(writeTgaHeader());

  const ctx = analyze(image, options);

  // sections.push(...);
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

function writeTgaHeader(): Uint8Array {
  const stream = new ByteStream(8);
  // stream.writeUint8(0x89);
  // stream.writeUint8(0x50);
  // stream.writeUint8(0x4E);
  // stream.writeUint8(0x47);
  // stream.writeUint8(0x0D);
  // stream.writeUint8(0x0A);
  // stream.writeUint8(0x1A);
  // stream.writeUint8(0x0A);
  // stream.assertAtEnd();
  return stream.array;
}

function analyze(image: Readonly<IImage32>, options: IEncodeTgaOptions = {}): IEncodeContext {
  const warnings: EncodeWarning[] = [];
  const info: string[] = [];

  // TODO: Analyze image and get actual bit depth
  const bitDepth = options.bitDepth || 32;
  return {
    bitDepth,
    options,
    warnings,
    info
  };
}
