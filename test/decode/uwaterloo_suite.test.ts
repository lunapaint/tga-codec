/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { ok, strictEqual } from 'assert';
import * as fs from 'fs';
import { createTests, ITestDecodedTga } from '../shared/testUtil.js';

const suiteRoot = 'test/uwaterloo_suite';

const testFilesNames = fs.readdirSync(suiteRoot).filter(e => e.endsWith('.tga'));
const testFiles: { [file: string]: ITestDecodedTga } = {};
for (const fileName of testFilesNames) {
  const withoutExtension = fileName.replace(/\.tga$/, '');
  testFiles[withoutExtension] = {
    image: `${suiteRoot}/${withoutExtension}.png`,
    details: {
      identificationField: ''
    },
    extensionArea: undefined,
    developerDirectory: []
  };
}
strictEqual(Object.keys(testFiles).length, 32);

describe('ftrvxmtrx_suite', () => {
  createTests(suiteRoot, testFiles);
});
