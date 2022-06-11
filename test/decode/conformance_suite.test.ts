/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { ColorMapType, IExtensionArea, IImage32, ImageType, ITgaDetails, ITgaHeader, ScreenOrigin } from '../../typings/api.js';
import { createTests, ITestDecodedTga, repeatArray } from '../shared/testUtil.js';

const suiteRoot = 'test/tga-test-suite/conformance';

// All lines are this pattern repeated twice:
// 8x red, 8x green, 8x blue, 8x black, 8x red, 8x green, 8x blue, 8x white
const r = [0xFF, 0x00, 0x00, 0xFF];
const g = [0x00, 0xFF, 0x00, 0xFF];
const b = [0x00, 0x00, 0xFF, 0xFF];
const k = [0x00, 0x00, 0x00, 0xFF];
const w = [0xFF, 0xFF, 0xFF, 0xFF];
const expectedColorImageLine = repeatArray([
  ...repeatArray(r, 8),
  ...repeatArray(g, 8),
  ...repeatArray(b, 8),
  ...repeatArray(k, 8),
  ...repeatArray(r, 8),
  ...repeatArray(g, 8),
  ...repeatArray(b, 8),
  ...repeatArray(w, 8)
], 2);
const expectedColorImage: IImage32 = {
  width: 128,
  height: 128,
  data: new Uint8Array(repeatArray(expectedColorImageLine, 128))
};

// Greyscale lines are repeated in a similar fashion
const g1 = [0x4C, 0x4C, 0x4C, 0xFF];
const g2 = [0x95, 0x95, 0x95, 0xFF];
const g3 = [0xB2, 0xB2, 0xB2, 0xFF];
const g4 = [0xFE, 0xFE, 0xFE, 0xFF];
const expectedGreyscaleImageLine = repeatArray([
  ...repeatArray(g1, 8),
  ...repeatArray(g2, 8),
  ...repeatArray(g3, 8),
  ...repeatArray(k, 8),
  ...repeatArray(g1, 8),
  ...repeatArray(g2, 8),
  ...repeatArray(g3, 8),
  ...repeatArray(g4, 8)
], 2);
const expectedGreyscaleImage: IImage32 = {
  width: 128,
  height: 128,
  data: new Uint8Array(repeatArray(expectedGreyscaleImageLine, 128))
};

const commonImageId = 'Truevision(R) Sample Image';
const commonExtensionArea: IExtensionArea = {
  extensionSize: 495,
  authorName: 'Ricky True',
  authorComments: '...',
  dateTimestamp: undefined,
  jobName: 'TGA Utilities',
  jobTime: undefined,
  softwareId: 'TGAEdit',
  softwareVersion: undefined,
  keyColor: undefined,
  aspectRatio: undefined,
  gamma: undefined,
  colorCorrectionOffset: 0,
  postageStampOffset: -1,
  scanLineOffset: 0,
  attributesType: -1,
};
const commonHeader: ITgaHeader = {
  idLength: 26,
  colorMapType: ColorMapType.NoColorMap,
  imageType: ImageType.NoImageData,
  colorMapOrigin: 0,
  colorMapLength: 0,
  colorMapDepth: 0,
  xOrigin: 0,
  yOrigin: 0,
  width: 128,
  height: 128,
  bitDepth: 0 as any,
  imageDescriptor: 0,
  attributeBitsPerPixel: 0,
  screenOrigin: ScreenOrigin.BottomLeft,
};

const testFiles: { [file: string]: ITestDecodedTga } = {
  'cbw8': {
    image: expectedGreyscaleImage,
    details2: {
      header: {
        ...commonHeader,
        bitDepth: 8,
        imageType: ImageType.RunLengthEncodedGrayscale
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 8238
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 8 bit run length compressed black and white image',
        dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
        softwareVersion: '2',
        postageStampOffset: 4140,
        attributesType: 0,
      },
      developerDirectory: [],
    }
  },
  'ccm8': {
    image: expectedColorImage,
    details2: {
      header: {
        ...commonHeader,
        bitDepth: 8,
        imageType: ImageType.RunLengthEncodedColorMapped,
        colorMapDepth: 16,
        colorMapLength: 256,
        colorMapType: ColorMapType.ColorMap
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 8750
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 8 bit run length compressed color mapped image',
        dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
        softwareVersion: '2',
        postageStampOffset: 4652,
        attributesType: 0,
      },
      developerDirectory: [],
    }
  },
  'ctc24': {
    image: expectedColorImage,
    details2: {
      header: {
        ...commonHeader,
        bitDepth: 24,
        imageType: ImageType.RunLengthEncodedTrueColor
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 20526
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 24 bit run length compressed true color image',
        dateTimestamp: new Date('1990-04-24T17:00:00.000Z'),
        softwareVersion: '2',
        postageStampOffset: 8236,
        attributesType: 0,
      },
      developerDirectory: [],
    }
  },
  'ubw8': {
    image: expectedGreyscaleImage,
    details2: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedGrayscale,
        bitDepth: 8
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 20526
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 8 bit uncompressed black and white image',
        dateTimestamp: new Date('1990-03-23T18:00:00.000Z'),
        softwareVersion: '1.3',
        postageStampOffset: 16428,
        attributesType: 0,
      },
      developerDirectory: [],
    }
  },
  'ucm8': {
    image: expectedColorImage,
    details2: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedColorMapped,
        bitDepth: 8,
        colorMapDepth: 16,
        colorMapLength: 256,
        colorMapType: ColorMapType.ColorMap
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 21038
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 8 bit uncompressed color mapped image',
        dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
        softwareVersion: '1.4',
        postageStampOffset: 16940,
        attributesType: 0,
      },
      developerDirectory: [],
    }
  },
  'utc16': {
    image: expectedColorImage,
    details2: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedTrueColor,
        bitDepth: 16,
        imageDescriptor: 1,
        attributeBitsPerPixel: 1
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 41006
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 16 bit uncompressed true color image',
        dateTimestamp: new Date('1990-03-23T18:00:00.000Z'),
        softwareVersion: '1.3',
        postageStampOffset: 32812,
        attributesType: 2,
      },
      developerDirectory: [],
    }
  },
  'utc24': {
    image: expectedColorImage,
    details2: {
      header: {
        ...commonHeader,
        bitDepth: 24,
        imageType: ImageType.UncompressedTrueColor
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 61486
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 24 bit uncompressed true color image',
        dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
        softwareVersion: '1.4',
        postageStampOffset: 49196,
        attributesType: 0,
      },
      developerDirectory: [],
    }
  },
  'utc32': {
    image: expectedColorImage,
    details2: {
      header: {
        ...commonHeader,
        imageType: ImageType.UncompressedTrueColor,
        bitDepth: 32,
        imageDescriptor: 8,
        attributeBitsPerPixel: 8
      },
      footer: {
        developerDirectoryOffset: 0,
        extensionAreaOffset: 81966
      },
      imageId: commonImageId,
      extensionArea: {
        ...commonExtensionArea,
        authorComments: 'Sample 32 bit uncompressed true color image',
        dateTimestamp: new Date('1990-03-24T18:00:00.000Z'),
        softwareVersion: '1.4',
        postageStampOffset: 65580,
        attributesType: 2,
      },
      developerDirectory: [],
    }
  }
};

describe('tga-test-suite/conformance', () => {
  createTests(suiteRoot, testFiles);
});
