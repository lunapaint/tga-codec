/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

import { ITgaDetails } from '../../typings/api.js';
import { IDecodedTga, ITgaDecodeContext, ITgaDetails2, ITgaInitialDecodeContext } from '../shared/types.js';

export class DecodeError extends Error {
  readonly partiallyDecodedImage: Partial<Omit<IDecodedTga, 'details2'> & { details2: Partial<ITgaDetails2> }>;
  constructor(
    ctx: ITgaInitialDecodeContext | ITgaDecodeContext,
    message: string,
    readonly offset: number
  ) {
    super(message);
    this.partiallyDecodedImage = {
      details2: {
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
