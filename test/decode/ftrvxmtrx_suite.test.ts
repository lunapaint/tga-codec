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
import { createTests, dataArraysEqual, ITestDecodedTga } from '../shared/testUtil.js';
import { decodePng, encodePng } from '@lunapaint/png-codec';

const suiteRoot = 'test/ftrvxmtrx_suite';

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
  createTests(suiteRoot, testFiles);
});
