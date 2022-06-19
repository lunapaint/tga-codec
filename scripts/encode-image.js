/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

const decoder = require('../out-dist/decode/decoder');
const encoder = require('../out-dist/encode/encoder');
const fs = require('fs/promises');
const { dirname, basename, extname, join, sep } = require('path');

async function encode(file) {
  if (extname(file) !== '.tga') {
    throw new Error('File must end with .tga');
  }
  console.log('Encoding: ' + file);
  const originalData = await fs.readFile(file);
  const decoded = await decoder.decodeTga(originalData);
  const encoded = await encoder.encodeTga(decoded.image);
  await fs.mkdir('out-test', { recursive: true });
  const filename = join('out-test', join(dirname(file), basename(file, '.tga')).replace(/[\\/]/g, '-') + '_tga-codec.tga');
  fs.writeFile(filename, encoded.data);
  console.log(`wrote ${encoded.data.length} bytes to ${filename}`);
}

if (process.argv.length < 3) {
  console.error('Provide a file as the first argument');
  process.exit(1);
}

encode(process.argv[2]);
