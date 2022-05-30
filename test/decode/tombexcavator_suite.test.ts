/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { IExtensionArea } from '../../typings/api.js';
import { createTestsFromFolder } from '../shared/testUtil.js';

const suiteRoot = 'test/tombexcavator_suite';

const commonExtensionArea: IExtensionArea = {
  aspectRatioDenominator: 0,
  aspectRatioNumerator: 0,
  attributesType: 0,
  authorComments: '',
  authorName: '',
  colorCorrectionOffset: 0,
  dateTimestamp: new Date('1899-12-31T08:00:00.000Z'),
  extensionSize: 495,
  gammaValueDenominator: 0,
  gammaValueNumerator: 0,
  jobName: '',
  jobTime: {
    hours: 0,
    minutes: 0,
    seconds: 0
  },
  keyColor: '',
  postageStampOffset: 0,
  scanLineOffset: 19119,
  softwareId: 'Handmade Software, Inc. Image Alchemy   ',
  softwareVersionLetter: '',
  softwareVersionNumber: 0.32
};

describe('tombexcavator_suite', () => {
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
        softwareVersionNumber: 0
      },
      'rgb15rle': commonExtensionArea,
      'rgb16rle': commonExtensionArea,
    }
  });
});
