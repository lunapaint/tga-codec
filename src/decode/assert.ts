/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { IDecodedTga, ITgaDecodeContext, ITgaDetails, ITgaInitialDecodeContext } from '../shared/types.js';

export class DecodeError extends Error {
  readonly partiallyDecodedImage: Partial<Omit<IDecodedTga, 'details'> & { details: Partial<ITgaDetails> }>;
  constructor(
    ctx: ITgaInitialDecodeContext | ITgaDecodeContext,
    message: string,
    readonly offset: number
  ) {
    super(message);
    this.partiallyDecodedImage = {
      details: {
        header: ctx.header,
        footer: ctx.footer,
        imageId: ctx.identificationField,
        developerDirectory: ctx.developerDirectory,
        extensionArea: ctx.extensionArea,
      },
      warnings: ctx.warnings
    };
  }
}

export class DecodeWarning extends Error {
  constructor(message: string, readonly offset: number) {
    super(message);
  }
}

/**
 * Handles a warning, throwing in strict mode or adding to the warnings array otherwise.
 * @param ctx The decode context.
 * @param warning The warning to handle.
 */
 export function handleWarning(ctx: ITgaInitialDecodeContext, warning: DecodeWarning) {
  if (ctx.options.strictMode) {
    throw warning;
  }
  ctx.warnings.push(warning);
}
