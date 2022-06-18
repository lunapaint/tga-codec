/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual } from 'assert';
import { decodeTga } from '../../decode/decoder.js';
import { encodeTga } from '../../encode/encoder.js';
import { IImage32 } from '../../shared/types.js';

const testImage: IImage32 = {
  data: new Uint8Array(4),
  width: 1,
  height: 1
};

describe('encoder', () => {
  describe('options', () => {
    it('origin', async () => {
      const encoded = await encodeTga(testImage, { origin: { x: 10, y: 273 } });
      const decoded = await decodeTga(encoded.data);
      deepStrictEqual(decoded.details.header.origin, { x: 10, y: 273 });
    });
  });
});
