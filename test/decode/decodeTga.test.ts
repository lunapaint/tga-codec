/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual } from 'assert';
import { join } from 'path';
import * as fs from 'fs';
import { decodeTga } from '../../out-dev/public/png.js';

const fileFormatSuiteRoot = 'test/conformance_suite';

describe.only('decodeTga', () => {
  it('should decoded', async () => {
    // const data = new Uint8Array(await fs.promises.readFile(join(fileFormatSuiteRoot, `utc16.tga`)));
    const data = new Uint8Array(await fs.promises.readFile(join(fileFormatSuiteRoot, `utc24.tga`)));
    // This would throw if the offset DataView is not read correctly
    const result = await decodeTga(data, {});
    deepStrictEqual(result, {});
  });
});
