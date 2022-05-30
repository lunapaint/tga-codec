# @lunapaint/tga-codec

## Decoder support details

While writing this codec I became aware that other TGA decoders are inconsistent, don't handle seemingly common cases and the spec is ambiguous. Some examples of this are Paint.NET (v4.3.10) decodes 16-bit true color by shifting each 5 bit value left by 3, this means that the maximum value for any channel is 255. Krita (v5.0.2) however handles that case but does not support various features and decodes 16-bit greyscale encoding without understanding the alpha channel.

Here are the details on what this codec supports:

- 15/16-bit rgb values are decoded using `(c << 3) | (c >> 2)` where `c` is the channel value.
- 16-bit greyscale recognizes the first 8 bit values as "attribute bits" (ie. the alpha channel).
- The TGA spec says that arbitrary bit depths are supported but currently only most common bit depths are supported (8, 15, 16, 24 and 32). This seems pretty typical for most decoders.
