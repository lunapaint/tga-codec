/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual } from 'assert';
import { decodeTga } from '../../decode/decoder.js';
import { encodeTga } from '../../encode/encoder.js';
import { IDecodedTga, IEncodeTgaOptions, IImage32, ScreenOrigin } from '../../shared/types.js';
import { throwsAsync } from '../shared/testUtil.js';

const testImage: IImage32 = {
  // red  green
  // blue white
  data: new Uint8Array([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 255,
  ]),
  width: 2,
  height: 2
};

async function assertEncodeDecodeResult<T>(options: IEncodeTgaOptions, getTestProperty: (decoded: IDecodedTga) => T, expected: T) {
  const encoded = await encodeTga(testImage, options);
  const decoded = await decodeTga(encoded.data);
  deepStrictEqual(getTestProperty(decoded), expected);
}

describe('encoder', () => {
  describe('details', () => {
    it('image', async () => {
      await throwsAsync(async () => await encodeTga({ width: 65536, height: 2, data: new Uint8Array(16) }), 'Image width is out of range (65536 > 65535)');
      await throwsAsync(async () => await encodeTga({ width: 2, height: 65536, data: new Uint8Array(16) }), 'Image height is out of range (65536 > 65535)');
      await throwsAsync(async () => await encodeTga({ width: 2, height: 3, data: new Uint8Array(4) }), 'Provided image data length (4) is not expected length (24)');
    });
    it('imageId', async () => {
      await assertEncodeDecodeResult({ }, e => e.details.imageId, '');
      await assertEncodeDecodeResult({ imageId: '' }, e => e.details.imageId, '');
      await assertEncodeDecodeResult({ imageId: 'foo' }, e => e.details.imageId, 'foo');
      await assertEncodeDecodeResult({ imageId: 'a'.repeat(255) }, e => e.details.imageId, 'a'.repeat(255));
      await throwsAsync(async () => await encodeTga(testImage, { imageId: 'a'.repeat(256) }), 'Image ID length is out of range (256 > 255)');
    });
    describe('options', () => {
      describe('header', () => {
        it('origin', async () => {
          await assertEncodeDecodeResult({}, e => e.details.header.origin, { x: 0, y: 0 });
          await assertEncodeDecodeResult({ origin: { x: 10, y: 273 } }, e => e.details.header.origin, { x: 10, y: 273 });
          await assertEncodeDecodeResult({ origin: { x: 65535, y: 65535 } }, e => e.details.header.origin, { x: 65535, y: 65535 });
          await throwsAsync(async () => await encodeTga(testImage, { origin: { x: 65536, y: 65535 } }), 'X origin is out of range (65536 > 65535)');
          await throwsAsync(async () => await encodeTga(testImage, { origin: { x: 65535, y: 65536 } }), 'Y origin is out of range (65536 > 65535)');
        });
      });
      describe('screenOrigin', () => {
        it('bottom left', async () => {
          await assertEncodeDecodeResult({}, e => e.image, testImage);
          await assertEncodeDecodeResult({ screenOrigin: ScreenOrigin.BottomLeft }, e => e.image, testImage);
        });
        it('top left', async () => {
          await assertEncodeDecodeResult({ screenOrigin: ScreenOrigin.TopLeft }, e => e.image, testImage);
        });
        // TODO: Other screen origins
      });
    });
  });
});
