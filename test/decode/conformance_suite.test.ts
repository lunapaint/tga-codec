/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual, strictEqual } from 'assert';
import { join } from 'path';
import * as fs from 'fs';
import { decodeTga } from '../../out-dev/public/png.js';
import { dataArraysEqual } from '../shared/testUtil.js';
import { IExtensionArea, IImage32 } from '../../typings/api.js';

const suiteRoot = 'test/conformance_suite';

// All lines are this pattern repeated twice:
// 8x red, 8x green, 8x blue, 8x black, 8x red, 8x green, 8x blue, 8x white
const r = [0xFF, 0x00, 0x00, 0xFF];
const g = [0x00, 0xFF, 0x00, 0xFF];
const b = [0x00, 0x00, 0xFF, 0xFF];
const k = [0x00, 0x00, 0x00, 0xFF];
const w = [0xFF, 0xFF, 0xFF, 0xFF];
const expectedColorImageLine = repeatArray([
  ...repeatArray(r, 8),
  ...repeatArray(g, 8),
  ...repeatArray(b, 8),
  ...repeatArray(k, 8),
  ...repeatArray(r, 8),
  ...repeatArray(g, 8),
  ...repeatArray(b, 8),
  ...repeatArray(w, 8)
], 2);
const expectedColorImage = new Uint8Array(repeatArray(expectedColorImageLine, 128));

function repeatArray(array: number[], times: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < times; i++) {
    result.push(...array);
  }
  return result;
}

const testFiles: { [file: string]: { image: IImage32, extensionArea: IExtensionArea }} = {
  'utc16': {
    image: {
      width: 128,
      height: 128,
      data: expectedColorImage
    },
    extensionArea: {
      extensionSize: 495,
      authorName: '',
      authorComments: '',
      dateTimestamp: new Date('1990-03-23T18:00:00.000Z'),
      jobName: '',
      jobTime: { hours: 0, minutes: 0, seconds: 0 },
      softwareId: '',
      softwareVersionNumber: 1.3,
      softwareVersionLetter: '',
      keyColor: '',
      aspectRatioNumerator: 0,
      aspectRatioDenominator: 0,
      gammaValueNumerator: 0,
      gammaValueDenominator: 0,
      colorCorrectionOffset: 0,
      postageStampOffset: 32812,
      scanLineOffset: 0,
      attributesType: 2,
    }
  },
  'utc24': {
    image: {
      width: 128,
      height: 128,
      data: expectedColorImage
    },
    extensionArea: {
      extensionSize: 495,
      authorName: '',
      authorComments: '',
      dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
      jobName: '',
      jobTime: { hours: 0, minutes: 0, seconds: 0 },
      softwareId: '',
      softwareVersionNumber: 1.4,
      softwareVersionLetter: '',
      keyColor: '',
      aspectRatioNumerator: 0,
      aspectRatioDenominator: 0,
      gammaValueNumerator: 0,
      gammaValueDenominator: 0,
      colorCorrectionOffset: 0,
      postageStampOffset: 49196,
      scanLineOffset: 0,
      attributesType: 0,
    }
  },
  'utc32': {
    image: {
      width: 128,
      height: 128,
      data: expectedColorImage
    },
    extensionArea: {
      extensionSize: 495,
      authorName: '',
      authorComments: '',
      dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
      jobName: '',
      jobTime: { hours: 0, minutes: 0, seconds: 0 },
      softwareId: '',
      softwareVersionNumber: 1.4,
      softwareVersionLetter: '',
      keyColor: '',
      aspectRatioNumerator: 0,
      aspectRatioDenominator: 0,
      gammaValueNumerator: 0,
      gammaValueDenominator: 0,
      colorCorrectionOffset: 0,
      postageStampOffset: 65580,
      scanLineOffset: 0,
      attributesType: 2,
    }
  }
};

describe('conformance_suite', () => {
  // const testFiles = fs.readdirSync(suiteRoot);
  for (const file of Object.keys(testFiles)) {
    // if (!file.endsWith('tga')) {
    //   continue;
    // }
    // TODO: Don't skip any
    const skipped = [
      'cbw8',
      'ccm8',
      'ctc24',
      'ubw8',
      'ucm8',
    ];
    (skipped.includes(file) ? it.skip : it)(file, async () => {
      const data = new Uint8Array(await fs.promises.readFile(join(suiteRoot, `${file}.tga`)));
      const result = await decodeTga(data, {});
      const testSpec = testFiles[file];
      strictEqual(result.image.width, testSpec.image.width);
      strictEqual(result.image.height, testSpec.image.height);
      dataArraysEqual(result.image.data, testSpec.image.data);
      deepStrictEqual(result.extensionArea, testSpec.extensionArea);
    });
  }
});
