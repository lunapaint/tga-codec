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
   * The details of the TGA including internals on how it was encoded as well as other metadata.
   */
  details: ITgaDetails;

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
   * The details of the TGA including internals on how it was encoded as well as other metadata.
 */
export interface ITgaDetails {
  header: ITgaHeader;
  /**
   * Optional identifying information about the image.
   *
   * Field, 0-255 bytes
   */
  imageId: string;
  footer?: ITgaFooter;
  /**
   * The {@link IExtensionArea} of the TGA file if it exists.
   */
  extensionArea?: IExtensionArea;
  /**
   * Developer directory entries in the TGA file.
   */
  developerDirectory?: IDeveloperDirectoryEntry[];
}

export interface ITgaHeader {
  /**
   * The length in bytes of the image ID (field 6).
   *
   * Field 1, 8 bit unsigned
   */
  idLength: number;
  /**
   * The optional color map of the TGA.
   */
  colorMap: ITgaColorMap | undefined,
  /**
   * The type of image.
   *
   * Field 3, 8 bit unsigned
   */
  imageType: ImageType;
  /**
   * These bytes specify the absolute  coordinate for the lower left corner of the image as it is
   * positioned on a display device having an origin at the lower left of the screen. This is
   * typically ignored in modern software.
   */
  origin: {
    /**
     * These bytes specify the absolute horizontal coordinate for the lower left corner of the image
     * as it is positioned on a display device having an origin at the lower left of the screen. This
     * is typically ignored in modern software.
     *
     * Field 5.1, 16 bit unsigned
     */
    x: number;
    /**
     * These bytes specify the absolute vertical coordinate for the lower left corner of the image as
     * it is positioned on a display device having an origin at the lower left of the screen. This is
     * typically ignored in modern software.
     *
     * Field 5.2, 16 bit unsigned
     */
    y: number;
  };
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

export interface ITgaFooter {
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
  authorName: string | undefined;
  /**
   * Comments of the author.
   */
  authorComments: string | undefined;
  /**
   * The date and time when the image was saved.
   */
  dateTimestamp: Date | undefined;
  /**
   * The name of the job, allowing the author to tie images with jobs.
   */
  jobName: string | undefined;
  /**
   * A running total of the amount of time invested in a particular image.
   */
  jobTime: { hours: number, minutes: number, seconds: number } | undefined;
  /**
   * The program the image was created within.
   */
  softwareId: string | undefined;
  /**
   * The version number of the program used to create the image as a number followed by a letter.
   * Possible range is <0 to 2.55><letter> (eg. 1.17b).
   */
  softwareVersion: string | undefined;
  /**
   * The key color as an array in [r, g, b, a] format. The key color can be thought of as the
   * 'background color' or 'transparent color'. This could be used in image viewers for example to
   * select an idea background color. This library will decode this field but it's left up to the
   * embedding application to use it if applicable.
   *
   * When this is undefined it means all values were 0 which should be treated the same as black
   * according to the specification.
   */
  keyColor: Uint8Array | undefined;
  /**
   * The pixel aspect ratio when it is important to preserve the proper aspect ratio of the saved
   * image. If this is undefined it means the aspect ratio was not specified and is composed of
   * square pixels.
   */
  aspectRatio: number | undefined;
  /**
   * The gamma value which can be used to correct the image. If this is 1.0 gamma was _specified_
   * but there is no gamma value. If this is undefined no gamma value was specified and should be
   * treated the same as no gamma value.
   */
  gamma: number | undefined;
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

export interface ITgaColorMap {
  /**
   * The type of color map.
   *
   * Field 2, 8 bit unsigned
   */
  type: ColorMapType;
  /**
   * The index of the starting entry when loading the color map. This allows ignoring the beginning
   * of the color map.
   *
   * Field 4.1, 16 bit unsigned
   */
  origin: number;
  /**
   * The total number of entries in the color map.
   *
   * Field 4.2, 16 bit unsigned
   */
  length: number;
  /**
   * The bits per entry of the color map. This is typically 15, 16, 24 or 32.
   *
   * Field 4.3, 8 bit unsigned
   */
  depth: number;
}

export const enum ColorMapType {
  NoColorMap = 0,
  ColorMap = 1,
  Unrecognized = 2,
}

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
