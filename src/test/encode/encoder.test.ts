/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual, throws } from 'assert';
import { decodeTga } from '../../decode/decoder.js';
import { encodeTga } from '../../encode/encoder.js';
import { IDecodedTga, IEncodeTgaOptions, IImage32 } from '../../shared/types.js';
import { throwsAsync } from '../shared/testUtil.js';

const testImage: IImage32 = {
  data: new Uint8Array(4),
  width: 1,
  height: 1
};

async function assertEncodeDecodeResult<T>(options: IEncodeTgaOptions, getTestProperty: (decoded: IDecodedTga) => T, expected: T) {
  const encoded = await encodeTga(testImage, options);
  const decoded = await decodeTga(encoded.data);
  deepStrictEqual(getTestProperty(decoded), expected);
}

describe('encoder', () => {
  describe('options', () => {
    it('origin', async () => {
      await assertEncodeDecodeResult({}, e => e.details.header.origin, { x: 0, y: 0 });
      await assertEncodeDecodeResult({ origin: { x: 10, y: 273 } }, e => e.details.header.origin, { x: 10, y: 273 });
      await assertEncodeDecodeResult({ origin: { x: 65535, y: 65535 } }, e => e.details.header.origin, { x: 65535, y: 65535 });
      await throwsAsync(async () => await encodeTga(testImage, { origin: { x: 65536, y: 65535 } }), 'IEncodeTGAOptions.origin.x is out of range (65536 > 65535)');
      await throwsAsync(async () => await encodeTga(testImage, { origin: { x: 65535, y: 65536 } }), 'IEncodeTGAOptions.origin.y is out of range (65536 > 65535)');
    });
  });
});
