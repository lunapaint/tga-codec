/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

export function decodeTga(data: Readonly<Uint8Array>, options: IDecodeTgaOptions): Promise<IDecodedTga>;

export interface IDecodedTga {
  image: IImage32;
  details: ITgaDetails;
  extensionArea: IExtensionArea;
}

/**
 * A set of options to configure how decoding happens.
 */
 export interface IDecodeTgaOptions {
  /**
   * Automatically convert 64-bit images (ie. 16 bit depth) to 32-bit images.
   */
  // force32?: boolean;

  /**
   * A list of optional chunk types to parse or `'*'` to parse all known chunk types. By default
   * only the chunk types required to extract the image data is parsed for performance reasons, if a
   * chunk type is of use this option can be used to do that.
   */
  // parseChunkTypes?: OptionalParsedChunkTypes[] | '*';

  /**
   * Enables strict mode which will throw an error when the first warning is encountered. Strict
   * mode should be used when it's important that the TGA is completely valid, when strict mode is
   * not enabled the decoder will be as error tolerant as possible and report any warnings that
   * would has failed in strict mode in {@link IDecodedTga.warnings}.
   */
  strictMode?: boolean;
}

export interface IExtensionArea {
  extensionSize: number;
  authorName: string;
  authorComments: string;
  dateTimestamp: Date;
  jobName: string;
  jobTime: { hours: number, minutes: number, seconds: number };
  softwareId: string;
  softwareVersionNumber: number;
  softwareVersionLetter: string;
  keyColor: string;
  aspectRatioNumerator: number;
  aspectRatioDenominator: number;
  gammaValueNumerator: number;
  gammaValueDenominator: number;
  colorCorrectionOffset: number;
  postageStampOffset: number;
  scanLineOffset: number;
  attributesType: number;
}

export interface ITgaDetails {
  identificationField: string;
}

/**
 * A 32-bit image (ie. 8 bit depth).
 */
export interface IImage32 {
  data: Uint8Array;
  width: number;
  height: number;
}

export type BitDepth = 8 | 16 | 24 | 32;

/**
 * A critical error occurred during decoding.
 */
export class DecodeError extends Error {
  /**
   * The byte offset of the error in the datastream.
   */
  offset: number;

  /**
   * The partially decoded image which gives access to deocde warnings, dimensions, etc.
   */
  // TODO: Export
  // partiallyDecodedImage: Partial<IDecodedTga>;
}

/**
 * A warning occurred during decoding.
 */
export class DecodeWarning extends Error {
  /**
   * The byte offset of the warning in the datastream.
   */
  offset: number;
}
