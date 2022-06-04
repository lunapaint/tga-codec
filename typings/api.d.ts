/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

/**
 * Decodes a TGA file.
 *
 * @param data The complete TGA file data to decode.
 * @param options Options to configure how decoding happens.
 *
 * @throws A {@link DecodeError} when an error is encountered or a {@link DecodeWarning} when a
 * warning is encountered in strict mode. In Typescript, `instanceof` can be used to narrow the type
 * safely.
 */
export function decodeTga(data: Readonly<Uint8Array>, options?: IDecodeTgaOptions): Promise<IDecodedTga>;

/**
 * A TGA that has been successfully decoded.
 */
export interface IDecodedTga {
  /**
   * The image dimensions and data.
   */
  image: IImage32;

  /**
   * Details about the image, this is mostly useful internally as they are used to decode the image.
   * However, these could be presented in an image viewer.
   */
  details: ITgaDetails;

  /**
   * The {@link IExtensionArea} of the TGA file if it exists.
   */
  extensionArea: IExtensionArea | undefined;

  /**
   * Developer directory entries in the TGA file.
   */
  developerDirectory: IDeveloperDirectoryEntry[];

  /**
   * Any warnings that were encountered during decoding. Warnings are generally safe to ignore, here
   * are some examples:
   *
   * - The image was determined to have ambigous alpha when
   * {@link IDecodeTgaOptions.detectAmbiguousAlphaChannel} was set.
   * - Unexpected field values encountered that have fallbacks like an unrecognized color map type
   * which gets treated as a regular color map.
   * - Invalid offset values
   *
   * Strict mode can be enabled via {@link IDecodeTgaOptions.strictMode} which will throw an error when
   * any warning is encountered.
   */
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

/**
 * An optional extension area in the TGA file, containing various metadata as well as important
 * decoding information like how to use the alpha channel. If an extension area is specified its
 * {@link extensionSize} must be 495 in order to be considered a valid version 2.0 TGA file.
 */
export interface IExtensionArea {
  /**
   * The size of the extension area. This must be 495 for a version 2.0 TGA file.
   */
  extensionSize: number;
  /**
   * The name of the person who created the image.
   */
  authorName: string;
  /**
   * Comments of the author.
   */
  authorComments: string;
  /**
   * The date and time when the image was saved.
   */
  dateTimestamp: Date;
  /**
   * The name of the job, allowing the author to tie images with jobs.
   */
  jobName: string;
  /**
   * A running total of the amount of time invested in a particular image.
   */
  jobTime: { hours: number, minutes: number, seconds: number };
  /**
   * The program the image was created within.
   */
  softwareId: string;
  /**
   * The version number of the program used to create the image, possible rage is 0 to 2.55.
   */
  softwareVersionNumber: number;
  /**
   * The version letter of the program used to create the image, if specified this should be
   * appended to the {@link softwareVersionNumber} (eg. 1.17b).
   */
  softwareVersionLetter: string;
  // TODO: This should be a number[]
  /**
   * The key color can be thought of as the 'background color' or 'transparent color'. This could be
   * used in image viewers for example to select an idea background color. This library will decode
   * this field but it's left up to the embedding application to use it if applicable.
   */
  keyColor: string;
  /**
   * The numerator of the pixel aspect ratio for when it is important to preserve the proper aspect
   * ratio of the saved image. If this is the same as {@link aspectRatioDenominator} it means the
   * image is composed of square pixels.
   */
  aspectRatioNumerator: number;
  /**
   * The denominator of the pixel aspect ratio for when it is important to preserve the proper
   * aspect ratio of the saved image. If this is zero or the same as {@link aspectRatioNumerator} it
   * means the image is composed of square pixels.
   */
  aspectRatioDenominator: number;
  /**
   * The numberator of a fractional gamma value which can be used to correct the image. If this is
   * the same as {@link gammaValueDenominator} it means the image has no gamma value (ie. 1.0).
   */
  gammaValueNumerator: number;
  /**
   * If this is zero or the same as {@link gammaValueNumerator} it means the image has no gamma
   * value (ie. 1.0).
   */
  gammaValueDenominator: number;
  /**
   * The byte offset of the color correction table, this is currently not decoded.
   */
  colorCorrectionOffset: number;
  /**
   * The byte offset of the postage stamp image (ie. the thumbnail), this is currently not decoded.
   */
  postageStampOffset: number;
  /**
   * The byte offset of the scan line table, this is currently not decoded.
   */
  scanLineOffset: number;
  /**
   * The attribute type (aka alpha type) of the image, this field is taken into account when
   * decoding the image data. The meaning of each value is show below:
   *
   * | Value   | Meaning
   * |---------|---------
   * | 0       | No alpha data is included
   * | 1       | Undefined data in the alpha field, can be ignored
   * | 2       | Undefined data in the alpha field, but should be retained
   * | 3       | Useful alpha channel data is present
   * | 4       | Pre-multiplied alpha (not currently supported)
   * | 5-127   | Reserved
   * | 128-255 | Un-assigned
   */
  attributesType: number;
}

/**
 * An entry in the developer area which contains arbitrary data as defined by the developer,
 * typically identified by the {@link tag}. This library doesn't understand any developer area entry
 * since they can be anything. To look at data for each entry read from {@link offset} to
 * {@link offset}+{@link length}.
 */
export interface IDeveloperDirectoryEntry {
  /**
   * An identifying tag for the entry.
   */
  tag: number;
  /**
   * The offset the entry starts at.
   */
  offset: number;
  /**
   * The length of the entry.
   */
  length: number;
}

/**
 * Details about the TGA.
 */
export interface ITgaDetails {
  /**
   * The width of the image.
   */
  width: number;
  /**
   * The height of the image.
   */
  height: number;
  /**
   * Optional identifying information about the image.
   */
  identificationField: string;
  /**
   * The byte offset of the {@link IDecodedTga.extensionArea}.
   */
  extensionAreaOffset?: number;
  /**
   * The byte offset of the {@link IDecodedTga.developerDirectory}.
   */
  developerDirectoryOffset?: number;
}

/**
 * A 32-bit image, 8 bits per channel in rgba format.
 */
export interface IImage32 {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * The bit depth defines how many bits are used per pixel. Whether a bit depth is supported depends
 * on the image type that it's used with as shown in the below table:
 *
 * | Image type   | Bit depths | Channel bits | Alpha bits\*
 * |--------------|------------|--------------|-------------
 * | Color mapped | 8          | 8            | 0
 * | True color   | 15         | 5            | 0
 * | True color   | 16         | 5            | 1
 * | True color   | 24         | 8            | 0
 * | True color   | 32         | 8            | 8
 * | Grayscale    | 8          | 8            | 0
 * | Grayscale    | 16         | 8            | 8
 *
 * \* Alpha bits may get ignored
 */
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
