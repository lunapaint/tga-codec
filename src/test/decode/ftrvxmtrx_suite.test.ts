/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { ColorMapType, ImageType, ITgaHeader, ScreenOrigin } from '../../../typings/api.js';
import { createTests, ITestDecodedTga } from '../shared/testUtil.js';

const suiteRoot = 'fixtures/tga-test-suite/ftrvxmtrx';

const commonHeader: ITgaHeader = {
  idLength: 0,
  imageType: ImageType.NoImageData,
  colorMap: undefined,
  origin: {
    x: 0,
    y: 0,
  },
  width: 64,
  height: 64,
  bitDepth: 0 as any,
  imageDescriptor: 0,
  attributeBitsPerPixel: 0,
  screenOrigin: ScreenOrigin.BottomLeft,
};

const testFiles: { [file: string]: ITestDecodedTga } = {
  'monochrome8_bottom_left': {
    image: `${suiteRoot}/monochrome8_bottom_left.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedGrayscale,
        bitDepth: 8
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  // RLE encoding has a mix of both rle and raw sections
  'monochrome8_bottom_left_rle': {
    image: `${suiteRoot}/monochrome8_bottom_left_rle.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.RunLengthEncodedGrayscale,
        bitDepth: 8
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  // Uncommon 16-bit greyscale
  'monochrome16_top_left': {
    image: `${suiteRoot}/monochrome16_top_left.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedGrayscale,
        bitDepth: 16,
        origin: {
          x: 0,
          y: 16448,
        },
        imageDescriptor: 40,
        attributeBitsPerPixel: 8,
        screenOrigin: ScreenOrigin.TopLeft,
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  // Uncommon 16-bit greyscale
  // RLE encoding has a mix of both rle and raw sections
  'monochrome16_top_left_rle': {
    image: `${suiteRoot}/monochrome16_top_left_rle.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.RunLengthEncodedGrayscale,
        bitDepth: 16,
        origin: {
          x: 0,
          y: 16448,
        },
        imageDescriptor: 40,
        attributeBitsPerPixel: 8,
        screenOrigin: ScreenOrigin.TopLeft,
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  'rgb24_bottom_left_rle': {
    image: `${suiteRoot}/rgb24_bottom_left_rle.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.RunLengthEncodedTrueColor,
        bitDepth: 24
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  'rgb24_top_left': {
    image: `${suiteRoot}/rgb24_top_left.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedTrueColor,
        bitDepth: 24,
        origin: {
          x: 0,
          y: 16448,
        },
        imageDescriptor: 32,
        screenOrigin: ScreenOrigin.TopLeft,
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  'rgb24_top_left_colormap': {
    image: `${suiteRoot}/rgb24_top_left_colormap.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedColorMapped,
        bitDepth: 8,
        colorMap: {
          type: ColorMapType.ColorMap,
          depth: 24,
          length: 29,
          origin: 0
        }
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  // Transparent pixels stored as 0x00000000
  'rgb32_top_left_rle': {
    image: `${suiteRoot}/rgb32_top_left_rle.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.RunLengthEncodedTrueColor,
        bitDepth: 32,
        origin: {
          x: 0,
          y: 16448,
        },
        imageDescriptor: 40,
        attributeBitsPerPixel: 8,
        screenOrigin: ScreenOrigin.TopLeft
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  // Transparent pixels stored as 0x00000000
  'rgb32_bottom_left': {
    image: `${suiteRoot}/rgb32_bottom_left.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedTrueColor,
        bitDepth: 32,
        imageDescriptor: 8,
        attributeBitsPerPixel: 8
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
  // Transparent pixels stored as 0xFFFFFF00
  // Image says no alpha support but 32-bit color maps always use alpha
  'rgb32_top_left_rle_colormap': {
    image: `${suiteRoot}/rgb32_top_left_rle_colormap.png`,
    details: {
      header: {
        ...commonHeader,
        imageType: ImageType.RunLengthEncodedColorMapped,
        bitDepth: 8,
        colorMap: {
          type: ColorMapType.ColorMap,
          depth: 32,
          length: 59,
          origin: 0
        },
        origin: {
          x: 0,
          y: 16448,
        },
        imageDescriptor: 32,
        screenOrigin: ScreenOrigin.TopLeft
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 0
      },
      imageId: '',
      extensionArea: undefined,
      developerDirectory: []
    },
  },
};

describe('tga-test-suite/ftrvxmtrx', () => {
  createTests(suiteRoot, testFiles);
});
