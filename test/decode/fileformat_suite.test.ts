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
import { decodePng } from '@lunapaint/png-codec';

const suiteRoot = 'test/fileformat_suite';

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
const expectedColorImage: IImage32 = {
  width: 128,
  height: 128,
  data: new Uint8Array(repeatArray(expectedColorImageLine, 128))
};

// Greyscale lines are repeated in a similar fashion
const g1 = [0x4C, 0x4C, 0x4C, 0xFF];
const g2 = [0x95, 0x95, 0x95, 0xFF];
const g3 = [0xB2, 0xB2, 0xB2, 0xFF];
const g4 = [0xFE, 0xFE, 0xFE, 0xFF];
const expectedGreyscaleImageLine = repeatArray([
  ...repeatArray(g1, 8),
  ...repeatArray(g2, 8),
  ...repeatArray(g3, 8),
  ...repeatArray(k, 8),
  ...repeatArray(g1, 8),
  ...repeatArray(g2, 8),
  ...repeatArray(g3, 8),
  ...repeatArray(g4, 8)
], 2);
const expectedGreyscaleImage: IImage32 = {
  width: 128,
  height: 128,
  data: new Uint8Array(repeatArray(expectedGreyscaleImageLine, 128))
};

const commonDetails: ITgaDetails = {
  identificationField: 'Truevision(R) Sample Image'
};

const commonExtensionArea: IExtensionArea = {
  extensionSize: 495,
  authorName: 'Ricky True',
  authorComments: '...',
  dateTimestamp: new Date(),
  jobName: 'TGA Utilities',
  jobTime: { hours: 0, minutes: 0, seconds: 0 },
  softwareId: 'TGAEdit',
  softwareVersionNumber: -1,
  softwareVersionLetter: '',
  keyColor: '',
  aspectRatioNumerator: 0,
  aspectRatioDenominator: 0,
  gammaValueNumerator: 0,
  gammaValueDenominator: 0,
  colorCorrectionOffset: 0,
  postageStampOffset: -1,
  scanLineOffset: 0,
  attributesType: -1,
};

function repeatArray(array: number[], times: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < times; i++) {
    result.push(...array);
  }
  return result;
}

async function getPngImage(path: string): Promise<IImage32> {
  const result = await decodePng(await fs.promises.readFile(path), { force32: true });
  return result.image;
}

type ITestDecodedTga = Omit<IDecodedTga, 'image'> & { image: string | IImage32 };

const testFiles: { [file: string]: ITestDecodedTga } = {
  'cbw8': {
    image: expectedGreyscaleImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 8 bit run length compressed black and white image',
      dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
      softwareVersionNumber: 2,
      postageStampOffset: 4140,
      attributesType: 0,
    },
    developerDirectory: []
  },
  'ccm8': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 8 bit run length compressed color mapped image',
      dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
      softwareVersionNumber: 2,
      postageStampOffset: 4652,
      attributesType: 0,
    },
    developerDirectory: []
  },
  'ctc16': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 16 bit run length compressed true color image',
      dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
      softwareVersionNumber: 2,
      postageStampOffset: 6188,
      attributesType: 2,
    },
    developerDirectory: []
  },
  'ctc24': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 24 bit run length compressed true color image',
      dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
      softwareVersionNumber: 2,
      postageStampOffset: 8236,
      attributesType: 0,
    },
    developerDirectory: []
  },
  'ctc32': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 32 bit run length compressed true color image',
      dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
      softwareVersionNumber: 2,
      postageStampOffset: 10284,
      attributesType: 2,
    },
    developerDirectory: []
  },
  'flag_b16': {
    image: `test/fileformat_suite/flag_b16.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'flag_b24': {
    image: `test/fileformat_suite/flag_b24.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'flag_b32': {
    image: `test/fileformat_suite/flag_b32.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'flag_t16': {
    image: `test/fileformat_suite/flag_t16.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'flag_t32': {
    image: `test/fileformat_suite/flag_t32.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncompressed true color, 24 bit depth, origin 0
  'marbles': {
    image: `test/fileformat_suite/marbles.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'ubw8': {
    image: expectedGreyscaleImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 8 bit uncompressed black and white image',
      dateTimestamp: new Date('1990-03-23T18:00:00.000Z'),
      softwareVersionNumber: 1.3,
      postageStampOffset: 16428,
      attributesType: 0,
    },
    developerDirectory: []
  },
  'ucm8': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 8 bit uncompressed color mapped image',
      dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
      softwareVersionNumber: 1.4,
      postageStampOffset: 16940,
      attributesType: 0,
    },
    developerDirectory: []
  },
  'utc16': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 16 bit uncompressed true color image',
      dateTimestamp: new Date('1990-03-23T18:00:00.000Z'),
      softwareVersionNumber: 1.3,
      postageStampOffset: 32812,
      attributesType: 2,
    },
    developerDirectory: []
  },
  'utc24': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 24 bit uncompressed true color image',
      dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
      softwareVersionNumber: 1.4,
      postageStampOffset: 49196,
      attributesType: 0,
    },
    developerDirectory: []
  },
  'utc32': {
    image: expectedColorImage,
    details: commonDetails,
    extensionArea: {
      ...commonExtensionArea,
      authorComments: 'Sample 32 bit uncompressed true color image',
      dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
      softwareVersionNumber: 1.4,
      postageStampOffset: 65580,
      attributesType: 2,
    },
    developerDirectory: []
  },
  // Uncompressed true color, 16 bit depth, origin 0
  'xing_b16': {
    image: `test/fileformat_suite/xing_b16.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncompressed true color, 24 bit depth, origin 0
  'xing_b24': {
    image: `test/fileformat_suite/xing_b24.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncompressed true color, 32 bit depth, origin 0
  'xing_b32': {
    image: `test/fileformat_suite/xing_b32.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncompressed true color, 16 bit depth, origin 2
  'xing_t16': {
    image: `test/fileformat_suite/xing_t16.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncompressed true color, 24 bit depth, origin 2
  'xing_t24': {
    image: `test/fileformat_suite/xing_t24.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Uncompressed true color, 32 bit depth, origin 2
  'xing_t32': {
    image: `test/fileformat_suite/xing_t32.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
};

describe('fileformat_suite', () => {
  for (const file of Object.keys(testFiles)) {
    it(file, async () => {
      const data = new Uint8Array(await fs.promises.readFile(join(suiteRoot, `${file}.tga`)));
      const result = await decodeTga(data, {});
      const testSpec = testFiles[file];
      const expectedImage = typeof testSpec.image === 'string' ? await getPngImage(testSpec.image) : testSpec.image;
      strictEqual(result.image.width, expectedImage.width);
      strictEqual(result.image.height, expectedImage.height);
      dataArraysEqual(result.image.data, expectedImage.data);
      deepStrictEqual(result.details, testSpec.details);
      deepStrictEqual(result.extensionArea, testSpec.extensionArea);
      deepStrictEqual(result.developerDirectory, testSpec.developerDirectory);
    });
  }
});
