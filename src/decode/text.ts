/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { ITgaDecodeContext } from '../shared/types';
import { DecodeWarning, handleWarning } from './assert.js';

export function readText(ctx: ITgaDecodeContext, textDecoder: TextDecoder | undefined, maxLength: number, isCompressed?: boolean): string {
  const bytes = [];
  let current = 0;
  let i = 0;
  const startOffset = ctx.reader.offset;
  for (; i < maxLength; i++) {
    try {
      current = ctx.reader.view.getUint8(ctx.reader.offset);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Offset is outside the bounds of the DataView') {
        handleWarning(ctx, new DecodeWarning('EOF while reading text', ctx.reader.offset));
      }
      throw e;
    }
    // Only check if not compressed as 0 is valid is deflated data
    if (!isCompressed && current === 0) {
      break;
    }
    ctx.reader.offset++;
    bytes.push(current);
  }
  ctx.reader.offset = startOffset + maxLength;
  if (textDecoder) {
    return textDecoder.decode(new Uint8Array(bytes));
  }
  return String.fromCharCode(...bytes);
}
