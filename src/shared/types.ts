/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

// Re-export types from the api file which cannot be referenced in the out/ directory.
export {
  BitDepth,
  IDecodedTga,
  IDecodeTgaOptions,
  IImage32,
} from '../../typings/api.js';

import {
  BitDepth,
  DecodeWarning,
  IDecodeTgaOptions,
  IDeveloperDirectoryEntry,
  IExtensionArea,
  IImage32,
} from '../../typings/api.js';

export interface ITgaBaseDecodeContext {
  image?: IImage32;
  hasAlpha: boolean;
  ambiguousAlpha: boolean;
  reader: IByteStreamReader;
  warnings: DecodeWarning[];
  options: IDecodeTgaOptions;
  header?: ITgaHeaderDetails;
  identificationField?: string;
  footer?: ITgaFooterDetails;
  colorMap?: IReadPixelDelegate;
  extensionArea?: IExtensionArea;
  developerDirectory?: IDeveloperDirectoryEntry[];
}

export type IReadPixelDelegate = (ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number) => number;

export interface ITgaInitialDecodeContext extends ITgaBaseDecodeContext {
  header?: ITgaHeaderDetails;
}

export interface ITgaDecodeContext extends ITgaBaseDecodeContext {
  header: ITgaHeaderDetails;
}

export interface IByteStreamReader {
  offset: number;
  readonly data: Readonly<Uint8Array>;
  readonly view: DataView;
  readUint8(): number;
  readUint16(): number;
  readUint32(): number;
}

export interface ITgaHeaderDetails {
  idLength: number; // char
  /**
   * Whether the image has a color map.
   */
  colorMapType: ColorMapType;
  /**
   * The image type which defines how the image data is encoded.
   */
  imageType: ImageType;
  /**
   * The index (0-65536) of the starting entry when loading the color map. This allows ignoring the beginning
   * of the color map.
   */
  colorMapOrigin: number;
  /**
   * The total number (0-65536) of entries in the color map.
   */
  colorMapLength: number;
  /**
   * The bits per entry (0-255) of the color map. This is typically 15, 16, 24 or 32.
   */
  colorMapDepth: number;
  xOrigin: number; // short int
  yOrigin: number; // short int
  width: number; // short
  height: number; // short
  // TODO: Support more pixel depths
  bitDepth: BitDepth; // char
  imageDescriptor: number; // char
  attributeBitsPerPixel: number;
  screenOrigin: ScreenOrigin;
  interleaving: InterleavingFlag;
}

export interface ITgaFooterDetails {
  extensionAreaOffset: number;
  developerDirectoryOffset: number;
}

export const enum ColorMapType {
  NoColorMap = 0,
  ColorMap = 1,
  Unrecognized = 2,
}

export type ColorMapDepth = 15 | 16 | 24 | 32;

export const enum ImageType {
  NoImageData = 0,
  UncompressedColorMapped = 1,
  UncompressedTrueColor = 2,
  UncompressedGrayscale = 3,
  RunLengthEncodedColorMapped = 9,
  RunLengthEncodedTrueColor = 10,
  RunLengthEncodedGrayscale = 11
}

export const enum ScreenOrigin {
  BottomLeft = 0,
  BottomRight = 1,
  TopLeft = 2,
  TopRight = 3
}
export const enum InterleavingFlag {
  NonInterleaved = 0,
  TwoWayInterleaving = 1,
  FourWayInterleaving = 2,
  Reserved = 3
}
