/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { createTestsFromFolder } from '../shared/testUtil.js';

const suiteRoot = 'test/uwaterloo_suite';

describe('uwaterloo_suite', () => {
  createTestsFromFolder(suiteRoot, 32);
});