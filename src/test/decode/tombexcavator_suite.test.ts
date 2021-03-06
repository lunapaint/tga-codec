/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { IExtensionArea } from '../../../typings/api.js';
import { createTestsFromFolder } from '../shared/testUtil.js';

const suiteRoot = 'fixtures/tga-test-suite/tombexcavator';

const commonExtensionArea: IExtensionArea = {
  aspectRatio: undefined,
  attributesType: 0,
  authorComments: undefined,
  authorName: undefined,
  colorCorrectionOffset: 0,
  dateTimestamp: undefined,
  extensionSize: 495,
  gamma: undefined,
  jobName: undefined,
  jobTime: undefined,
  keyColor: undefined,
  postageStampOffset: 0,
  scanLineOffset: 19119,
  softwareId: 'Handmade Software, Inc. Image Alchemy',
  softwareVersion: '0.32'
};

describe('tga-test-suite/tombexcavator', () => {
  createTestsFromFolder(suiteRoot, 23, {
    allowOneOffError: [
      // Decoders struggle with these files, ImageMagick ended up being used to convert it TGA which
      // uses slightly different decoding of 15-bit values
      'rgb15',
      'rgb15rle',
      'rgb16rle',
    ],
    extensionArea: {
      'rgb15': {
        ...commonExtensionArea,
        scanLineOffset: 79715,
        softwareVersion: undefined
      },
      'rgb15rle': commonExtensionArea,
      'rgb16rle': commonExtensionArea,
    }
  });
});
