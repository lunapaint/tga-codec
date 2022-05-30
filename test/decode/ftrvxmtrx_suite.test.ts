/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { deepStrictEqual, strictEqual } from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import { decodeTga } from '../../out-dev/public/tga.js';
import { IDecodedTga, IExtensionArea, IImage32, ITgaDetails } from '../../typings/api.js';
import { dataArraysEqual } from '../shared/testUtil.js';
import { decodePng, encodePng } from '@lunapaint/png-codec';

const suiteRoot = 'test/ftrvxmtrx_suite';

async function getPngImage(path: string): Promise<IImage32> {
  const result = await decodePng(await fs.promises.readFile(path), { force32: true });
  return result.image;
}

type ITestDecodedTga = Omit<IDecodedTga, 'image'> & { image: string | IImage32 };

const testFiles: { [file: string]: ITestDecodedTga } = {
  'monochrome8_bottom_left': {
    image: `${suiteRoot}/monochrome8_bottom_left.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // RLE encoding has a mix of both rle and raw sections
  'monochrome8_bottom_left_rle': {
    image: `${suiteRoot}/monochrome8_bottom_left_rle.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncommon 16-bit greyscale
  'monochrome16_top_left': {
    image: `${suiteRoot}/monochrome16_top_left.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncommon 16-bit greyscale
  // RLE encoding has a mix of both rle and raw sections
  'monochrome16_top_left_rle': {
    image: `${suiteRoot}/monochrome16_top_left_rle.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
};

describe('ftrvxmtrx_suite', () => {
  for (const file of Object.keys(testFiles)) {
    it.only(file, async () => {
      const data = new Uint8Array(await fs.promises.readFile(join(suiteRoot, `${file}.tga`)));
      const result = await decodeTga(data, {});
      const testSpec = testFiles[file];
      const expectedImage = typeof testSpec.image === 'string' ? await getPngImage(testSpec.image) : testSpec.image;
      // fs.writeFileSync(`encoded_${file}.png`, (await (await encodePng(result.image)).data));
      strictEqual(result.image.width, expectedImage.width);
      strictEqual(result.image.height, expectedImage.height);
      dataArraysEqual(result.image.data, expectedImage.data);
      deepStrictEqual(result.details, testSpec.details);
      deepStrictEqual(result.extensionArea, testSpec.extensionArea);
      deepStrictEqual(result.developerDirectory, testSpec.developerDirectory);
    });
  }
});
