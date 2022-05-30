/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { createTestsFromFolder } from '../shared/testUtil.js';

const suiteRoot = 'test/tombexcavator_suite';

describe('tombexcavator_suite', () => {
  createTestsFromFolder(suiteRoot, 23, [
    'rgb15',
    'rgb15rle',
    'rgb16',
    'rgb16rle',
    'rgb32',
    'TGA_16_rle',
    'TGA_16_uncompressed',
  ]);
});
