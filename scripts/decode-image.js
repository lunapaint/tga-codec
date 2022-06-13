/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

const decoder = require('..');
const fs = require('fs/promises');
const { extname } = require('path');

async function decode(file) {
  if (extname(file) !== '.tga') {
    throw new Error('File must end with .tga');
  }
  const originalData = await fs.readFile(file);
  const decoded = await decoder.decodeTga(originalData);
  console.log(`Decoded "${file}":`, decoded);
}

if (process.argv.length < 3) {
  console.error('Provide a file as the first argument');
  process.exit(1);
}

decode(process.argv[2]);
