# M-Bus Wired DataLink

[![version][version-badge]][package]
[![license][license-badge]][package]
![runtime][runtime-badge]

Encode and decode wired M-Bus data-link frames in TypeScript.

`@meterbus/wired-datalink` provides typed primitives for acknowledgement, short,
control, and long frames. Decode complete frames in one operation or process
arbitrarily chunked byte streams with configurable error recovery.

## Installation

Install the package from npm:

```bash
npm install @meterbus/wired-datalink
```

## Quick start

Use `decodeFrame` when you have exactly one complete data-link frame:

```ts
import { decodeFrame, LongFrame } from "@meterbus/wired-datalink";

const bytes = Uint8Array.of(
	0x68, 0x04, 0x04, 0x68, 0x53, 0xfe, 0x50, 0x10, 0xb1, 0x16,
);

const frame = decodeFrame(bytes);

if (frame instanceof LongFrame) {
	console.log(frame.control.value); // 0x53
	console.log(frame.address.value); // 0xfe
	console.log(frame.controlInformation); // 0x50
	console.log(frame.userData); // Uint8Array [0x10]
}
```

`decodeFrame` validates the frame structure, length fields, checksum, and stop
byte. It returns an `AckFrame`, `ShortFrame`, `ControlFrame`, or `LongFrame`.

## Encode a frame

Construct a frame from typed fields, then call `encode`:

```ts
import { AddressField, ControlField, ShortFrame } from "@meterbus/wired-datalink";

const frame = new ShortFrame(
	new ControlField(0x40),
	new AddressField(0x01),
);

const bytes = frame.encode();
// Uint8Array [0x10, 0x40, 0x01, 0x41, 0x16]
```

Frame constructors validate field values. `AddressField`, `ControlField`, and
control-information values must be integers from `0` through `255`.

## Decode a stream

Use `createStreamDecoder` when frame boundaries do not correspond to incoming
chunks, such as bytes read from a serial transport:

```ts
import { createStreamDecoder } from "@meterbus/wired-datalink";

const decoder = createStreamDecoder();

const firstFrames = decoder.push(Uint8Array.of(0x10, 0x40));
// []: the incomplete short frame is buffered

const nextFrames = decoder.push(Uint8Array.of(0x01, 0x41, 0x16, 0xe5));
// [ShortFrame, AckFrame]

decoder.finish();
```

Each call to `push` returns all complete frames decoded from the new chunk and
any bytes buffered by earlier calls. Call `finish` at the end of the input;
it throws `IncompleteFrameError` if a partial frame remains.

The decoder uses strict recovery by default. Malformed input clears its buffer
and throws an error. Use `"resync"` recovery to discard malformed bytes and
continue scanning for frames:

```ts
const decoder = createStreamDecoder({
	recovery: "resync",
	onRecovery({ error, discarded }) {
		console.warn(error.message, discarded);
	},
});
```

Use `decoder.bufferedByteLength` to inspect the number of retained bytes and
`decoder.reset()` to discard them.

## API overview

### Decoders

| API                             | Description                            |
| ------------------------------- | -------------------------------------- |
| `decodeFrame(bytes)`            | Decodes exactly one complete frame.    |
| `createStreamDecoder(options?)` | Creates an incremental stream decoder. |

### Frames

| Class          | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `AckFrame`     | Single-byte acknowledgement frame.                                     |
| `ShortFrame`   | Fixed-length frame with control and address fields.                    |
| `ControlFrame` | Fixed-length variable frame with control information and no user data. |
| `LongFrame`    | Variable-length frame containing application-layer user data.          |

Every frame class provides `encode()` and a static `decode(bytes)` method.
The `Frame` type is a union of all supported frame classes.

### Errors

All package errors extend `DatalinkError`. Use it to handle any data-link
validation or decoding error, or catch a more specific exported error class
when recovery depends on the failure type.

```ts
import { DatalinkError, decodeFrame } from "@meterbus/wired-datalink";

try {
	decodeFrame(Uint8Array.of(0xff));
} catch (error) {
	if (error instanceof DatalinkError) {
		console.error(error.message);
	}
}
```

## License

Copyright © 2026 Nicolas HEDGER

Licensed under the [MIT License][license].

[downloads-badge]: https://npmx.dev/api/registry/badge/downloads/@meterbus/wired-datalink?style=shieldsio
[license]: ../../LICENSE
[license-badge]: https://npmx.dev/api/registry/badge/license/@meterbus/wired-datalink?labelColor=000000&color=a7f3d0
[package]: https://npmx.dev/package/@meterbus/wired-datalink
[runtime-badge]: https://npmx.dev/api/registry/badge/version/@meterbus/wired-datalink?labelColor=000000&color=fef08a&value=Browser+%7C+Node+%7C+Bun&label=Runtime
[version-badge]: https://npmx.dev/api/registry/badge/version/@meterbus/wired-datalink?labelColor=000000&color=bae6fd
