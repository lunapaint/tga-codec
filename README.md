# @lunapaint/tga-codec

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
  - The `attribute bits per pixel` in the `image descriptor` field is > 0, OR
  - The `bit depth` field in the header is 32, OR
  - A `color map` is defined and its `bit depth` is 32
  - When there is no `color map` defined, if the `attributes type` field in the `extension area` is 0, 1 or 2
- TODO: Check with warning

## References

- https://www.dca.fee.unicamp.br/~martino/disciplinas/ea978/tgaffs.pdf
- https://en.wikipedia.org/wiki/Truevision_TGA
- http://www.paulbourke.net/dataformats/tga/
