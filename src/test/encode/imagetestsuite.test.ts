/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { decodePng, IDecodedPng, IImage32 } from '@lunapaint/png-codec';
import { deepStrictEqual } from 'assert';
import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { decodeTga } from '../../decode/decoder.js';
import { encodeTga } from '../../public/tga.js';

const suiteRoot = 'fixtures/imagetestsuite/png';

describe('imagetestsuite', () => {
  const files = readdirSync(suiteRoot);
  describe('decoded png image should equal re-encoded tga image', () => {
    for (const f of files) {
      // Skip invalid files
      if (f === 'json') {
        continue;
      }
      it(f, async () => {
        const file = join(suiteRoot, f);
        const originalData = await readFile(file);
        let decodedPng: IDecodedPng<IImage32>;
        try {
          decodedPng = await decodePng(originalData, { force32: true });
        } catch (e) {
          // Skip if the image cannot be decoded
          return;
        }
        const encodedTga = await encodeTga(decodedPng.image);
        const decodedTga = await decodeTga(encodedTga.data);
        deepStrictEqual(decodedTga.image, decodedPng.image);
      });
    }
  });
});
