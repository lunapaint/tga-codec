/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

export { DecodeError, DecodeWarning } from '../decode/assert.js';
import { IDecodedTga, IDecodeTgaOptions } from '../shared/types.js';

// This file is the entry point the the library, it wraps the implementation files using dynamic
// imports so the bare minimum code is loaded when code splitting is enabled.

export async function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions): Promise<IDecodedTga> {
  return (await import('../decode/tga_decoder.js')).decodeTga(data, options);
}
