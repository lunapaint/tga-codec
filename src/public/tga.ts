/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

export { DecodeError, DecodeWarning } from '../decode/assert.js';
import { IEncodedTga, IEncodeTgaOptions } from '../../typings/api.js';
import { IDecodedTga, IDecodeTgaOptions, IImage32 } from '../shared/types.js';

// This file is the entry point the the library, it wraps the implementation files using dynamic
// imports so the bare minimum code is loaded when code splitting is enabled.

export async function decodeTga(data: Readonly<Uint8Array>, options?: IDecodeTgaOptions): Promise<IDecodedTga> {
  return (await import('../decode/decoder.js')).decodeTga(data, options);
}

export async function encodeTga(data: Readonly<IImage32>, options?: IEncodeTgaOptions): Promise<IEncodedTga> {
  return (await import('../encode/encoder.js')).encodeTga(data, options);
}
