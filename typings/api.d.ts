/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

export function decodeTga(data: Readonly<Uint8Array>, options?: IDecodeTgaOptions): Promise<IDecodedTga>;

export interface IDecodedTga {
  image: IImage32;
  details: ITgaDetails;
  extensionArea: IExtensionArea | undefined;
  developerDirectory: IDeveloperDirectoryEntry[];
  warnings: DecodeWarning[];
}

/**
 * A set of options to configure how decoding happens.
 */
export interface IDecodeTgaOptions {
  /**
   * Since different TGA decoders behave slightly differently, sometimes images come out as 100%
   * transparent. When this feature is enabled, any image with ambiguous alpha (when alpha is
   * processed but attribute bits per pixel is 0) will be checked to see if the decoded image is
   * 100% transparent and there is data in the rgb channels and if so will make the image fully
   * opaque and will add a warning to {@link IDecodedTga.warnings}.
   *
   * This setting is ignored when in {@link IDecodeTgaOptions.strictMode}.
   */
  detectAmbiguousAlphaChannel?: boolean;

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

export interface IDeveloperDirectoryEntry {
  tag: number;
  offset: number;
  length: number;
}

export interface ITgaDetails {
  width: number;
  height: number;
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

export type BitDepth = 8 | 15 | 16 | 24 | 32;

/**
 * A critical error occurred during decoding.
 */
export class DecodeError extends Error {
  /**
   * The byte offset of the error in the datastream.
   */
  offset: number;

  /**
   * The partially decoded image which gives access to decode warnings, dimensions, etc.
   */
  partiallyDecodedImage: Partial<Exclude<IDecodedTga, 'details'> & { details: Partial<ITgaDetails> }>;
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
