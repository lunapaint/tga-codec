/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

const { decodePng } = require('@lunapaint/png-codec');
const encoder = require('../out-dist/encode/encoder');
const fs = require('fs/promises');
const { dirname, basename, join } = require('path');

async function encode(folder) {
  const files = await fs.readdir(folder);
  console.log('files', files);
  for (const f of files) {
    const file = join(folder, f);
    console.log('Encoding: ' + file);
    const originalData = await fs.readFile(file);
    const decoded = await decodePng(originalData, { force32: true });
    const encoded = await encoder.encodeTga(decoded.image);

    // Save in same folder
    const filename = join(dirname(file), `${basename(file, '.tga')}_tga-codec.tga`);

    // Save in out-test/
    // await fs.mkdir('out-test', { recursive: true });
    // const filename = join('out-test', join(dirname(file), basename(file, '.tga')).replace(/[\\/]/g, '-') + '_tga-codec.tga');

    fs.writeFile(filename, encoded.data);
    console.log(`wrote ${encoded.data.length} bytes to ${filename}`);
  }
}

if (process.argv.length < 3) {
  console.error('Provide a file as the first argument');
  process.exit(1);
}

encode(process.argv[2]);
