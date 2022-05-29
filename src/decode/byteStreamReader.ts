/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IByteStreamReader } from '../shared/types.js';

export class ByteStreamReader implements IByteStreamReader {
  offset: number = 0;
  readonly view: DataView;

  constructor(
    readonly data: Readonly<Uint8Array>,
    private readonly _le: boolean
  ) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  readUint8(): number {
    return this.view.getUint8(this.offset++);
  }

  readUint16(): number {
    const value = this.view.getUint16(this.offset, this._le);
    this.offset += 2;
    return value;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, this._le);
    this.offset += 4;
    return value;
  }
}
