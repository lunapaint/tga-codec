/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

// Re-export types from the api file which cannot be referenced in the out/ directory.
export {
  BitDepth,
  BitDepthTga,
  ColorType,
  DefaultParsedChunkTypes,
  IDecodedTga,
  IDecodeTgaOptions,
  IDecodedPng,
  IDecodePngOptions,
  IEncodePngOptions,
  IImage32,
  IImage64,
  InterlaceMethod,
  IPngChunk,
  IPngDetails,
  IPngMetadataBackgroundColor,
  IPngMetadataCalibrationOfPixelValues,
  IPngMetadataChromaticity,
  IPngMetadataCompressedTextualData,
  IPngMetadataEmbeddedIccProfile,
  IPngMetadataExif,
  IPngMetadataGamma,
  IPngMetadataHistogram,
  IPngMetadataIndicatorOfStereoImage,
  IPngMetadataInternationalTextualData,
  IPngMetadataLastModificationTime,
  IPngMetadataOffset,
  IPngMetadataPhysicalPixelDimensions,
  IPngMetadataPhysicalScaleOfImageSubject,
  IPngMetadataSignificantBits,
  IPngMetadataStandardRgbColorSpace,
  IPngMetadataSuggestedPalette,
  IPngMetadataSuggestedPaletteEntry,
  IPngMetadataTextualData,
  IPngMetadataTransparency,
  KnownChunkTypes,
  OptionalParsedChunkTypes,
  PngMetadata,
  RenderingIntent
} from '../../typings/api.js';

import {
  BitDepth,
  BitDepthTga,
  ColorType,
  DecodeWarning,
  EncodeWarning,
  IDecodePngOptions,
  IDecodeTgaOptions,
  IEncodePngOptions,
  IExtensionArea,
  IImage32,
  IImage64,
  InterlaceMethod,
  IPngChunk,
  IPngPalette,
  PngMetadata
} from '../../typings/api.js';

export interface IBaseDecodeContext {
  view: DataView;
  image?: IImage32 | IImage64;
  palette?: IPngPaletteInternal;
  rawChunks?: IPngChunk[];
  /**
   * A Set of chunks already parsed, this can be used to enforce chunk ordering and preventing
   * multiple when only one is allowed.
   */
  parsedChunks: Set<string>;
  metadata: PngMetadata[];
  info: string[];
  warnings: DecodeWarning[];
  options: IDecodePngOptions;
}

export interface IInitialDecodeContext extends IBaseDecodeContext {
  header?: IPngHeaderDetails;
}

export interface ITgaBaseDecodeContext {
  image?: IImage32;
  reader: IByteStreamReader;
  warnings: DecodeWarning[];
  options: IDecodeTgaOptions;
  header?: ITgaHeaderDetails;
  identificationField?: string;
  footer?: ITgaFooterDetails;
  colorMap?: (ctx: ITgaDecodeContext, imageData: Uint8Array, imageOffset: number, viewOffset: number) => number;
  extensionArea?: IExtensionArea;
}

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

export interface IDecodeContext extends IBaseDecodeContext {
  header: IPngHeaderDetails;
}

export interface IEncodeContext {
  colorType: ColorType;
  bitDepth: BitDepth;
  interlaceMethod: InterlaceMethod;
  /**
   * All unique colors in the image in `0xRRGGBBAA` format for 8 bit or `0xRRRRGGGGBBBBAAAA` for 16
   * bit.
   */
  colorSet: Set<number>;
  palette?: Map<number, number>;
  transparentColorCount: number;
  firstTransparentColor: number | undefined;
  useTransparencyChunk: boolean;
  options: IEncodePngOptionsInternal;
  warnings: EncodeWarning[];
  info: string[];
}

export interface IPngHeaderDetails {
  width: number;
  height: number;
  bitDepth: BitDepth;
  colorType: ColorType;
  interlaceMethod: InterlaceMethod;
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
  bitDepth: BitDepthTga; // char
  imageDescriptor: number; // char
  attributeBitsPerPixel: number;
  screenOrigin: ScreenOrigin;
  interleaving: InterleavingFlag;
}

export interface ITgaFooterDetails {
  extensionAreaOffset: number;
  developerDirectoryOffset: number;
  signature: string;
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
  UpperLeft = 1,
  LowerLeft = 0
}
export const enum InterleavingFlag {
  NonInterleaved = 0,
  TwoWayInterleaving = 1,
  FourWayInterleaving = 2,
  Reserved = 3
}

export const enum ChunkPartByteLength {
  Length = 4,
  Type = 4,
  CRC = 4
}

export interface IPngPaletteInternal extends IPngPalette {
  setRgba(data: Uint8Array, offset: number, colorIndex: number): void;
}

export interface IEncodePngOptionsInternal extends IEncodePngOptions {
  /**
   * An optional filter pattern used for testing. This is internal only as it's not useful outside
   * of testing to ensure each permutation is correct, unless the image is analyzed outside of the
   * library but that's out of scope for this library.
   */
  filterPattern?: FilterType[];
}

export const enum FilterMethod {
  Adaptive = 0
}

export const enum FilterType {
  /**
   * ```
   * Filt(x) = Orig(x)
   * Recon(x) = Filt(x)
   * ```
   */
  None = 0,
  /**
   * ```
   * Filt(x) = Orig(x) - Orig(a)
   * Recon(x) = Filt(x) + Recon(a)
   * ```
   */
  Sub = 1,
  /**
   * ```
   * Filt(x) = Orig(x) - Orig(b)
   * Recon(x) = Filt(x) + Recon(b)
   * ```
   */
  Up = 2,
  /**
   * ```
   * Filt(x) = Orig(x) - floor((Orig(a) + Orig(b)) / 2)
   * Recon(x) = Filt(x) + floor((Recon(a) + Recon(b)) / 2)
   * ```
   */
  Average = 3,
  /**
   * ```
   * Filt(x) = Orig(x) - PaethPredictor(Orig(a), Orig(b), Orig(c))
   * Recon(x) = Filt(x) + PaethPredictor(Recon(a), Recon(b), Recon(c))
   * ```
   */
  Paeth = 4
}
