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
  'rgb24_bottom_left_rle': {
    image: `${suiteRoot}/rgb24.0.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'rgb24_top_left': {
    image: `${suiteRoot}/rgb24.0.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  'rgb24_top_left_colormap': {
    image: `${suiteRoot}/rgb24.1.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Transparent pixels stored as 0x00000000
  'rgb32_top_left_rle': {
    image: `${suiteRoot}/rgb32.0.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Transparent pixels stored as 0x00000000
  'rgb32_bottom_left': {
    image: `${suiteRoot}/rgb32.0.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  },
  // Transparent pixels stored as 0xFFFFFF00
  // Image says no alpha support but 32-bit color maps always use alpha
  'rgb32_top_left_rle_colormap': {
    image: `${suiteRoot}/rgb32.1.png`,
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
