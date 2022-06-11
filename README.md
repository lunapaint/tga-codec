# @lunapaint/tga-codec

This is a TGA decoder library for JavaScript that runs in both the browser and in Node.js. It is used in [Luna Paint](https://marketplace.visualstudio.com/items?itemName=Tyriar.luna-paint) (an image editor for VS Code) to work with TGA files.

You can try it out on [`vscode.dev`](https://vscode.dev/) by installing the Luna Paint extension and opening a tga file.

## Features

- **Performance**: Just like Luna Paint, performance is a priority.
- **Correctness**: The library has a suite of TGA files it tests against, if you have a TGA file that cannot be opened please create an issue.
- **Simple API**: The API is a well documented [TypeScript declaration file](https://github.dev/lunapaint/tga-codec/blob/main/typings/api.d.ts).
- **Compatibility**: Some TGA files have ambiguous alpha channels which is why they open correctly in some editors and are transparent in others. These issues can be detected with the `detectAmbiguousAlphaChannel` option.
- **Readable Codebase**: A big part of this was a learning exercise for me so I put some effort in to make the code as readable as possible to help others on the same journey.
- **Error tolerant**: Images will still load with warnings unless a critical error is hit.


## Install

The supported way of installing the project is through npm:

```
npm install @lunapaint/tga-codec
```

Alternatively, you could add the repo as a git submodule, or download the source from the GitHub [releases page](https://github.com/lunapaint/tga-codec/releases).


## API

Basic usage:

```ts
import { decodeTga } from '@lunapaint/tga-codec';
import * as fs from 'fs/promises';

async function decode(filepath) {
  const data = await fs.readFile(filepath);
  const decoded = await decodeTga(data);
  console.log('decoded image', decoded.image.data);
  // [r, g, b, a, ...]
}
```

The full API is documented as a TypeScript `.d.ts` declaration file. The view the API:

- [github.dev](https://github.dev/lunapaint/tga-codec/blob/main/typings/api.d.ts): View on the web in VS Code, which has symbol support out of the box. Try showing the Outline view and triggering the `Go to Symbol in Editor` command
- [github.com](https://github.com/lunapaint/tga-codec/blob/main/typings/api.d.ts): View the raw file in github.com.


## Decoder support details

While writing this codec I became aware that other TGA decoders are inconsistent, don't handle seemingly common cases and the spec is ambiguous. Some examples of these issues:

- Paint.NET (v4.3.10) decodes 16-bit true color by shifting each 5 bit value left by 3, this means that the maximum value for any channel is 255.
- Krita (v5.0.2) however handles that case but does not support various features and decodes 16-bit greyscale encoding without understanding the alpha channel.
- ImageMagick (v7.1.0) doesn't understand the screen origin flag so it will flip images incorrectly.
- Whether to ignore the alpha channel is quite inconsistent across implementations, so often images will show "correctly" in one editor and be fully transparent in another.

Here are the details on what this codec supports:

- 15/16-bit rgb values are decoded using `(c << 3) | (c >> 2)` where `c` is the channel value.
- 16-bit greyscale recognizes the first 8 bit values as "attribute bits" (ie. the alpha channel).
- The TGA spec says that arbitrary bit depths are supported but currently only most common bit depths are supported (8, 15, 16, 24 and 32). This seems pretty typical for most decoders.
- The alpha channel will be used when:
  ```
  A `color map` is defined and its `bit depth` is 32
  OR
  (
    The `attribute bits per pixel` in the `image descriptor` field is > 0
    OR
    The `bit depth` field is 32
  )
  AND
  (
    There is no `extension area`
    OR
    The `attributes type` field in the `extension area` is 0, 1 or 2
  )
- The decode option `detectAmbiguousAlphaChannel` can be enabled which will detect images with ambiguous alpha and disable alpha is enabling it would result in a fully transparent image. Ambiguoius alpha is defined as when alpha is enabled as above and `attribute bits per pixel` is 0.

## References

- https://www.dca.fee.unicamp.br/~martino/disciplinas/ea978/tgaffs.pdf
- https://en.wikipedia.org/wiki/Truevision_TGA
- http://www.paulbourke.net/dataformats/tga/
