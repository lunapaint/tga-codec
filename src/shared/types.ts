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
  /**
   * The length in bytes of the image ID (field 6).
   *
   * Field 1, 8 bit unsigned
   */
  idLength: number;
  /**
   * The type of color map.
   *
   * Field 2, 8 bit unsigned
   */
  colorMapType: ColorMapType;
  /**
   * The type of image.
   *
   * Field 3, 8 bit unsigned
   */
  imageType: ImageType;
  /**
   * The index of the starting entry when loading the color map. This allows ignoring the beginning
   * of the color map.
   *
   * Field 4.1, 16 bit unsigned
   */
  colorMapOrigin: number;
  /**
   * The total number of entries in the color map.
   *
   * Field 4.2, 16 bit unsigned
   */
  colorMapLength: number;
  /**
   * The bits per entry of the color map. This is typically 15, 16, 24 or 32.
   *
   * Field 4.3, 8 bit unsigned
   */
  colorMapDepth: number;
  /**
   * These bytes specify the absolute horizontal coordinate for the lower left corner of the image
   * as it is positioned on a display device having an origin at the lower left of the screen. This
   * is typically ignored in modern software.
   *
   * Field 5.1, 16 bit unsigned
   */
  xOrigin: number;
  /**
   * These bytes specify the absolute vertical coordinate for the lower left corner of the image as
   * it is positioned on a display device having an origin at the lower left of the screen. This is
   * typically ignored in modern software.
   *
   * Field 5.2, 16 bit unsigned
   */
  yOrigin: number;
  /**
   * The width of the image.
   *
   * Field 5.3, 16 bit unsigned
   */
  width: number;
  /**
   * The height of the image.
   *
   * Field 5.4, 16 bit unsigned
   */
  height: number;
  /**
   * The bit depth of the image.
   *
   * Field 5.5, 8 bit unsigned
   */
  bitDepth: BitDepth;
  /**
   * Specifies the number of attribute bits (aka alpha bits) per pixel
   *
   * | Bits | Meaning
   * |------|-------------------
   * | 0-3  | Alpha channel bits
   * | 4-5  | Image origin
   * | 6-7  | Unused (some documents say this is interleaving but it's not in the v2.0 spec)
   *
   * Field 5.6, 8 bit unsigned
   */
  imageDescriptor: number;
  /**
   * The number of attribute bits (aka alpha bits) extracted from {@link imageDescriptor}.
   */
  attributeBitsPerPixel: number;
  /**
   * The screen origin extracted from {@link imageDescriptor}.
   */
  screenOrigin: ScreenOrigin;
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
