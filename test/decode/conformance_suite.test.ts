/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { strictEqual } from 'assert';
import { join } from 'path';
import * as fs from 'fs';
import { decodeTga } from '../../out-dev/public/png.js';
import { dataArraysEqual } from '../shared/testUtil.js';

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
const expectedColorImage = repeatArray(expectedColorImageLine, 128);

function repeatArray(array: number[], times: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < times; i++) {
    result.push(...array);
  }
  return result;
}

describe('conformance_suite', () => {
  const testFiles = fs.readdirSync(suiteRoot);
  for (const file of testFiles) {
    if (!file.endsWith('tga')) {
      continue;
    }
    // TODO: Don't skip any
    const skipped = [
      'cbw8.tga',
      'ccm8.tga',
      'ctc24.tga',
      'ubw8.tga',
      'ucm8.tga',
      'utc16.tga',
    ];
    (skipped.includes(file) ? it.skip : it)(file, async () => {
      const data = new Uint8Array(await fs.promises.readFile(join(suiteRoot, file)));
      const result = await decodeTga(data, {});
      strictEqual(result.image.width, 128);
      strictEqual(result.image.height, 128);
      dataArraysEqual(Array.from(result.image.data), expectedColorImage);
    });
  }
});
