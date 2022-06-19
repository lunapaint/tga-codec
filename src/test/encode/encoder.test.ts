/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual, strictEqual } from 'assert';
import { IEncodedTga, ImageType } from '../../../typings/api.js';
import { decodeTga } from '../../decode/decoder.js';
import { encodeTga } from '../../encode/encoder.js';
import { IDecodedTga, IEncodeTgaOptions, IImage32, ScreenOrigin } from '../../shared/types.js';
import { throwsAsync } from '../shared/testUtil.js';

const testImage: Readonly<IImage32> = {
  // RRGG
  // BBWW
  data: new Uint8Array([
    255, 0, 0, 255, 255, 0, 0, 255,
    0, 255, 0, 255, 0, 255, 0, 255,
    0, 0, 255, 255, 0, 0, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
  ]),
  width: 4,
  height: 2
};

const testGreyscaleImage: Readonly<IImage32> = {
  data: new Uint8Array([
    0, 0, 0, 255, 0, 0, 0, 255,
    0, 0, 0, 255, 0, 0, 0, 255,
    128, 128, 128, 255, 128, 128, 128, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
  ]),
  width: 4,
  height: 2
};

const testBadRleImage: Readonly<IImage32> = {
  data: new Uint8Array([
    0, 0, 0, 255,
    32, 32, 32, 255,
    128, 128, 128, 255,
    255, 255, 255, 255,
  ]),
  width: 2,
  height: 2
};

interface IEncodeDecodeResultOptions {
  customImage?: Readonly<IImage32>;
  decodeWarnings?: string[];
  encodeWarnings?: string[];
}

async function assertEncodeDecodeResult<T>(options: IEncodeTgaOptions, getTestProperty: (decoded: IDecodedTga) => T, expected: T, resultOptions?: IEncodeDecodeResultOptions) {
  const encoded = await encodeTga(resultOptions?.customImage ?? testImage, options);
  const decoded = await decodeTga(encoded.data);
  deepStrictEqual(decoded.image, resultOptions?.customImage ?? testImage, 'Image data that was encoded and re-decoded doesn\'t match original');
  deepStrictEqual(getTestProperty(decoded), expected);
  deepStrictEqual(encoded.warnings.map(e => e.message), resultOptions?.encodeWarnings ?? []);
  deepStrictEqual(decoded.warnings.map(e => e.message), resultOptions?.decodeWarnings ?? []);
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
      describe('bitDepth', () => {
        it('8 (color map)', async () => {
          await assertEncodeDecodeResult({ }, e => ({ bitDepth: e.details.header.bitDepth, imageType: e.details.header.imageType }), { bitDepth: 8, imageType: ImageType.RunLengthEncodedColorMapped });
        });
        it('15', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedTrueColor, bitDepth: 15 }, e => e.details.header.bitDepth, 15);
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 15 }, e => e.details.header.bitDepth, 15);
        });
        it('16', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedTrueColor, bitDepth: 16 }, e => e.details.header.bitDepth, 16);
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 16 }, e => e.details.header.bitDepth, 16);
        });
        it('24', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedTrueColor, bitDepth: 24 }, e => e.details.header.bitDepth, 24);
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 24 }, e => e.details.header.bitDepth, 24);
        });
        it('24 (transparency data loss)', async () => {
          const encoded = await encodeTga({
            data: new Uint8Array([
              255, 0, 0, 255,
              0, 255, 0, 255,
              0, 0, 255, 128, // <- alpha
              255, 255, 255, 255
            ]),
            width: 2,
            height: 2
          }, { imageType: ImageType.UncompressedTrueColor, bitDepth: 24 });
          deepStrictEqual(encoded.warnings.map(e => e.message), ['Cannot encode 24 bit image without data loss as it contains transparent colors']);
          const decoded = await decodeTga(encoded.data);
          deepStrictEqual(decoded.image.data, new Uint8Array([
            255, 0, 0, 255,
            0, 255, 0, 255,
            0, 0, 255, 255, // <- lost alpha
            255, 255, 255, 255
          ]));
        });
        it('32', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedTrueColor, bitDepth: 32 }, e => e.details.header.bitDepth, 32);
        });
      });
      describe('imageType', () => {
        it('UncompressedColorMapped', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedColorMapped, bitDepth: 8 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.UncompressedColorMapped, bitDepth: 8 }
          );
        });
        it('UncompressedTrueColor', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedTrueColor, bitDepth: 32 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.UncompressedTrueColor, bitDepth: 32 }
          );
        });
        it('UncompressedGrayscale', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.UncompressedGrayscale, bitDepth: 8 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.UncompressedGrayscale, bitDepth: 8 }, {
              customImage: testGreyscaleImage
            }
          );
        });
        it('RunLengthEncodedColorMapped', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedColorMapped, bitDepth: 8 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.RunLengthEncodedColorMapped, bitDepth: 8 }
          );
        });
        it('RunLengthEncodedTrueColor', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 32 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 32 }
          );
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 32 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.RunLengthEncodedTrueColor, bitDepth: 32 }, {
              customImage: testBadRleImage,
              encodeWarnings: ['RLE encoded was used but it is larger than unencoded would be']
            }
          );
        });
        it('RunLengthEncodedGrayscale', async () => {
          await assertEncodeDecodeResult({ imageType: ImageType.RunLengthEncodedGrayscale, bitDepth: 8 },
            e => ({ imageType: e.details.header.imageType, bitDepth: e.details.header.bitDepth }),
            { imageType: ImageType.RunLengthEncodedGrayscale, bitDepth: 8 }, {
              customImage: testGreyscaleImage
            }
          );
        });
      });
      it('origin', async () => {
        await assertEncodeDecodeResult({}, e => e.details.header.origin, { x: 0, y: 0 });
        await assertEncodeDecodeResult({ origin: { x: 10, y: 273 } }, e => e.details.header.origin, { x: 10, y: 273 });
        await assertEncodeDecodeResult({ origin: { x: 65535, y: 65535 } }, e => e.details.header.origin, { x: 65535, y: 65535 });
        await throwsAsync(async () => await encodeTga(testImage, { origin: { x: 65536, y: 65535 } }), 'X origin is out of range (65536 > 65535)');
        await throwsAsync(async () => await encodeTga(testImage, { origin: { x: 65535, y: 65536 } }), 'Y origin is out of range (65536 > 65535)');
      });
      describe('screenOrigin', () => {
        it('bottom left', async () => {
          await assertEncodeDecodeResult({}, e => e.image, testImage);
          await assertEncodeDecodeResult({ screenOrigin: ScreenOrigin.BottomLeft }, e => e.image, testImage);
        });
        it('bottom right', async () => {
          await assertEncodeDecodeResult({ screenOrigin: ScreenOrigin.BottomRight }, e => e.image, testImage, {
            decodeWarnings: ['This image is encoded using a bottom right screen origin, many image editors won\'t read this correctly'],
            encodeWarnings: ['This image is encoded using a bottom right screen origin, many image editors won\'t read this correctly']
          });
        });
        it('top left', async () => {
          await assertEncodeDecodeResult({ screenOrigin: ScreenOrigin.TopLeft }, e => e.image, testImage);
        });
        it('top right', async () => {
          await assertEncodeDecodeResult({ screenOrigin: ScreenOrigin.TopRight }, e => e.image, testImage, {
            decodeWarnings: ['This image is encoded using a top right screen origin, many image editors won\'t read this correctly'],
            encodeWarnings: ['This image is encoded using a top right screen origin, many image editors won\'t read this correctly']
          });
        });
      });
    });
  });
});
