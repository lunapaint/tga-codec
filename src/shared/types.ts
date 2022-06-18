/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

// Re-export types from the api file which cannot be referenced in the out/ directory.
export {
  BitDepth,
  ColorMapType,
  IDecodedTga,
  IDecodeTgaOptions,
  IEncodeTgaOptions,
  IImage32,
  ImageType,
  ITgaDetails,
  ITgaFooter,
  ITgaHeader,
  ScreenOrigin,
} from '../../typings/api.js';

import {
  BitDepth,
  DecodeWarning,
  EncodeWarning,
  IDecodeTgaOptions,
  IDeveloperDirectoryEntry,
  IEncodeTgaOptions,
  IExtensionArea,
  IImage32,
  ITgaFooter,
  ITgaHeader,
} from '../../typings/api.js';

export interface ITgaBaseDecodeContext {
  image?: IImage32;
  hasAlpha: boolean;
  ambiguousAlpha: boolean;
  reader: IByteStreamReader;
  warnings: DecodeWarning[];
  options: IDecodeTgaOptions;
  header?: ITgaHeader;
  identificationField?: string;
  footer?: ITgaFooter;
  colorMap?: IReadPixelDelegate;
  extensionArea?: IExtensionArea;
  developerDirectory?: IDeveloperDirectoryEntry[];
}

export type IReadPixelDelegate = (imageData: Uint8Array, imageOffset: number, view: DataView, viewOffset: number) => number;

export interface ITgaInitialDecodeContext extends ITgaBaseDecodeContext {
  header?: ITgaHeader;
}

export interface ITgaDecodeContext extends ITgaBaseDecodeContext {
  header: ITgaHeader;
}

export interface IByteStreamReader {
  offset: number;
  readonly data: Readonly<Uint8Array>;
  readonly view: DataView;
  readUint8(): number;
  readUint16(): number;
  readUint32(): number;
}

export type ColorMapDepth = 15 | 16 | 24 | 32;

export interface IEncodeContext {
  image: IImage32;
  bitDepth: BitDepth;
  imageId: string;
  options: IEncodeTgaOptions;
  warnings: EncodeWarning[];
  info: string[];
}

export type IWritePixelDelegate = (stream: IByteStream, imageData: Uint8Array, imageOffset: number) => void;

export interface IByteStream {
  readonly array: Uint8Array;
  readonly view: DataView;
  offset: number;
  writeUint8(value: number): void;
  writeUint16(value: number): void;
  writeUint32(value: number): void;
  writeArray(values: Uint8Array): void;
  assertAtEnd(): void;
}

export interface IColorMap {
  colorToIndexMap: Map<number, number>;
  bitDepth: number;

}
