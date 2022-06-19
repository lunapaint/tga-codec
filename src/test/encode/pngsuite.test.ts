/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { decodePng } from '@lunapaint/png-codec';
import { deepStrictEqual } from 'assert';
import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { decodeTga } from '../../decode/decoder.js';
import { encodeTga } from '../../public/tga.js';

const suiteRoot = 'fixtures/pngsuite/png';

describe('pngsuite', () => {
  const files = readdirSync(suiteRoot);
  console.log('files', files);
  describe('decoded png image should equal re-encoded tga image', () => {
    for (const f of files) {
      // Skip invalid files
      if (f.startsWith('x')) {
        continue;
      }
      it(f, async () => {
        const file = join(suiteRoot, f);
        const originalData = await readFile(file);
        const decodedPng = await decodePng(originalData, { force32: true });
        const encodedTga = await encodeTga(decodedPng.image);
        const decodedTga = await decodeTga(encodedTga.data);
        deepStrictEqual(decodedTga.image, decodedPng.image);
      });
    }
  });
});
