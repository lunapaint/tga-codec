/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { deepStrictEqual, fail, strictEqual } from 'assert';
import * as fs from 'fs';
import { decodeTga } from '../../out-dev/public/tga.js';
import { decodePng, encodePng } from '@lunapaint/png-codec';
import { IDecodedTga, IExtensionArea, IImage32 } from '../../typings/api.js';
import { join } from 'path';

async function getPngImage(path: string): Promise<IImage32> {
  const result = await decodePng(await fs.promises.readFile(path), { force32: true });
  return result.image;
}

export type ITestDecodedTga = Omit<IDecodedTga, 'image'> & {
  image: string | IImage32;
  allowOneOffError?: boolean;
  clearAlphaChannel?: boolean;
};

export function createTestsFromFolder(suiteRoot: string, expectedCount: number, options?: { skip?: string[], allowOneOffError?: string[], extensionArea?: { [file: string]: IExtensionArea } }) {
  const tgaFiles = fs.readdirSync(suiteRoot)
    .filter(e => e.endsWith('.tga'));
  const tgaFilesWithoutSkipped = tgaFiles
    .filter(e => !(options?.skip ?? []).includes(e.replace(/\.tga$/, '')));
  const testFiles: { [file: string]: ITestDecodedTga } = {};
  for (const fileName of tgaFilesWithoutSkipped) {
    const withoutExtension = fileName.replace(/\.tga$/, '');
    testFiles[withoutExtension] = {
      image: `${suiteRoot}/${withoutExtension}.png`,
      details: {
        identificationField: ''
      },
      extensionArea: options?.extensionArea ? options.extensionArea[withoutExtension] : undefined,
      developerDirectory: []
    };
    if (options?.allowOneOffError?.includes(withoutExtension)) {
      testFiles[withoutExtension].allowOneOffError = true;
    }
  }
  strictEqual(Object.keys(tgaFiles).length, expectedCount, 'Expected number of test files not present');

  createTests(suiteRoot, testFiles);
}

export function createTests(suiteRoot: string, testFiles: { [file: string]: ITestDecodedTga }) {
  for (const file of Object.keys(testFiles)) {
    it(file, async () => {
      const data = new Uint8Array(await fs.promises.readFile(join(suiteRoot, `${file}.tga`)));
      const result = await decodeTga(data, {});

      // Uncomment to write decoded tgas as pngs in the repo root
      fs.mkdirSync('encoded', { recursive: true });
      fs.writeFileSync(`encoded/${suiteRoot.replace(/\//g, '_')}_${file}.png`, (await (await encodePng(result.image)).data));

      const testSpec = testFiles[file];
      const expectedImage = typeof testSpec.image === 'string' ? await getPngImage(testSpec.image) : testSpec.image;
      strictEqual(result.image.width, expectedImage.width);
      strictEqual(result.image.height, expectedImage.height);
      // Due to difficulties retaining saved pngs hue in image editors in a fully transparent image,
      // allow a test to clear the alpha channel of the expected image to 0 before checking.
      if (testSpec.clearAlphaChannel) {
        clearAlphaChannel(expectedImage.data);
      }
      if (testSpec.allowOneOffError) {
        for (let i = 0; i < result.image.data.length; i += 4) {
          if (
            Math.abs(result.image.data[i    ] - expectedImage.data[i    ]) > 1 ||
            Math.abs(result.image.data[i + 1] - expectedImage.data[i + 1]) > 1 ||
            Math.abs(result.image.data[i + 2] - expectedImage.data[i + 2]) > 1 ||
            Math.abs(result.image.data[i + 3] - expectedImage.data[i + 3]) > 1
          ) {
            throw new Error(
              `Channel value for pixel ${i / 4} (index=${i}) is off by more than 1.\n\n` +
              `  actual=${Array.prototype.slice.call(result.image.data, i, i + 4)}\n` +
              `  expected=${Array.prototype.slice.call(expectedImage.data, i, i + 4)}`
            );
          }
        }
      } else {
        dataArraysEqual(result.image.data, expectedImage.data);
      }
      deepStrictEqual(result.details, testSpec.details);
      deepStrictEqual(result.extensionArea, testSpec.extensionArea);
      deepStrictEqual(result.developerDirectory, testSpec.developerDirectory);
    });
  }
}

export function dataArraysEqual(actual: ArrayLike<number>, expected: ArrayLike<number>) {
  strictEqual(actual.length, expected.length);

  const padCount = actual.length.toString(16).length;

  const failures: string[] = [];
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      failures.push([
        `Offset 0x${i.toString(16).toUpperCase().padStart(padCount, '0')} (${i})`,
        `          |   Actual  Expected`,
        ` ---------+--------------------`,
        `  binary: | ${actual[i].toString(2).padStart(8, '0')}  ${expected[i].toString(2).padStart(8, '0')}`,
        `  dec:    | ${actual[i].toString(10).padStart(8)}  ${expected[i].toString(10).padStart(8)}`,
        `  hex:    | ${('0x' + actual[i].toString(16)).padStart(8)}  ${('0x' + expected[i].toString(16)).padStart(8)}`,
      ].join('\n'));
    }
  }

  if (failures.length > 0) {
    fail(`Data arrays differ at ${failures.length} offsets:\n\n${failures.slice(0, Math.min(5, failures.length)).join('\n\n')}${failures.length > 5 ? `\n\n...${failures.length - 5} more...\n` : ''}`);
  }

  // Double check using node's assert lib
  deepStrictEqual(actual, expected);
}

export function repeatArray(array: number[], times: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < times; i++) {
    result.push(...array);
  }
  return result;
}

function clearAlphaChannel(data: Uint8Array) {
  for (let i = 3; i < data.length; i += 4) {
    data[i] = 0;
  }
}
