import { expect, test } from "vitest";
import { FrameDecodeError } from "@/decoder/frame";
import {
	createStreamDecoder,
	FrameStreamDecoder,
	IncompleteFrameError,
} from "@/decoder/stream";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";
import { AckFrame } from "@/frame/ack";
import { ControlFrame } from "@/frame/control";
import { LongFrame } from "@/frame/long";
import { ShortFrame, ShortFrameDecodeError } from "@/frame/short";
import type { FrameStreamDecoderRecoveryEvent } from "@/types";

function shortFrame(): ShortFrame {
	return new ShortFrame(new ControlField(0x40), new AddressField(0x01));
}

function controlFrame(): ControlFrame {
	return new ControlFrame(new ControlField(0x53), new AddressField(0xfe), 0xbd);
}

function longFrame(userData = Uint8Array.of(0x10)): LongFrame {
	return new LongFrame(
		new ControlField(0x53),
		new AddressField(0xfe),
		0x50,
		userData,
	);
}

function concatenate(...chunks: Uint8Array[]): Uint8Array {
	const bytes = new Uint8Array(
		chunks.reduce((length, chunk) => length + chunk.length, 0),
	);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	return bytes;
}

test("creates independent stream decoders", () => {
	const first = createStreamDecoder();
	const second = createStreamDecoder();

	expect(first).toBeInstanceOf(FrameStreamDecoder);
	expect(second).toBeInstanceOf(FrameStreamDecoder);
	expect(first).not.toBe(second);
});

test("resynchronizes after leading noise", () => {
	const recoveries: FrameStreamDecoderRecoveryEvent[] = [];
	const decoder = createStreamDecoder({
		recovery: "resync",
		onRecovery: (event) => recoveries.push(event),
	});

	const frames = decoder.push(Uint8Array.of(0xff, 0x00, AckFrame.BYTE));

	expect(frames).toHaveLength(1);
	expect(frames[0]).toBeInstanceOf(AckFrame);
	expect(recoveries).toHaveLength(2);
	expect(recoveries[0]?.error).toBeInstanceOf(FrameDecodeError);
	expect(recoveries[0]?.discarded).toStrictEqual(Uint8Array.of(0xff));
	expect(recoveries[1]?.discarded).toStrictEqual(Uint8Array.of(0x00));
});

test("resynchronizes after a corrupted frame", () => {
	const decoder = createStreamDecoder({ recovery: "resync" });
	const corrupted = Uint8Array.of(0x10, 0x40, 0x01, 0x42, 0x16);

	const frames = decoder.push(concatenate(corrupted, new AckFrame().encode()));

	expect(frames).toHaveLength(1);
	expect(frames[0]).toBeInstanceOf(AckFrame);
});

test("retains valid frames around recovered noise", () => {
	const decoder = createStreamDecoder({ recovery: "resync" });
	const frames = decoder.push(
		concatenate(
			new AckFrame().encode(),
			Uint8Array.of(0x00),
			shortFrame().encode(),
		),
	);

	expect(frames).toHaveLength(2);
	expect(frames[0]).toBeInstanceOf(AckFrame);
	expect(frames[1]).toBeInstanceOf(ShortFrame);
});

test("clears state when a recovery callback throws", () => {
	const callbackError = new Error("Recovery callback failed");
	const decoder = createStreamDecoder({
		recovery: "resync",
		onRecovery: () => {
			throw callbackError;
		},
	});

	expect(() => decoder.push(Uint8Array.of(0x00))).toThrow(callbackError);
	expect(decoder.bufferedByteLength).toBe(0);
});

test("buffers a split frame", () => {
	const decoder = new FrameStreamDecoder();
	const encoded = shortFrame().encode();

	expect(decoder.push(encoded.slice(0, 2))).toStrictEqual([]);
	expect(decoder.bufferedByteLength).toBe(2);
	expect(decoder.push(encoded.slice(2))[0]).toBeInstanceOf(ShortFrame);
	expect(decoder.bufferedByteLength).toBe(0);
});

test("buffers an incomplete variable frame header", () => {
	const decoder = new FrameStreamDecoder();
	const encoded = controlFrame().encode();

	expect(decoder.push(encoded.slice(0, 2))).toStrictEqual([]);
	expect(decoder.push(encoded.slice(2))[0]).toBeInstanceOf(ControlFrame);
});

test("emits multiple concatenated frames", () => {
	const decoder = new FrameStreamDecoder();
	const frames = decoder.push(
		concatenate(
			new AckFrame().encode(),
			shortFrame().encode(),
			controlFrame().encode(),
			longFrame().encode(),
		),
	);

	expect(frames).toHaveLength(4);
	expect(frames[0]).toBeInstanceOf(AckFrame);
	expect(frames[1]).toBeInstanceOf(ShortFrame);
	expect(frames[2]).toBeInstanceOf(ControlFrame);
	expect(frames[3]).toBeInstanceOf(LongFrame);
});

test("retains an incomplete trailing frame", () => {
	const decoder = new FrameStreamDecoder();
	const short = shortFrame().encode();
	const frames = decoder.push(
		concatenate(new AckFrame().encode(), short.slice(0, 2)),
	);

	expect(frames).toHaveLength(1);
	expect(frames[0]).toBeInstanceOf(AckFrame);
	expect(decoder.bufferedByteLength).toBe(2);
	expect(decoder.push(short.slice(2))[0]).toBeInstanceOf(ShortFrame);
});

test("buffers a maximum-size long frame", () => {
	const decoder = new FrameStreamDecoder();
	const encoded = longFrame(
		new Uint8Array(LongFrame.MAX_USER_DATA_LENGTH),
	).encode();

	expect(decoder.push(encoded.slice(0, -1))).toStrictEqual([]);
	expect(decoder.bufferedByteLength).toBe(encoded.length - 1);
	expect(decoder.push(encoded.slice(-1))[0]).toBeInstanceOf(LongFrame);
});

test("accepts an empty chunk", () => {
	const decoder = new FrameStreamDecoder();

	expect(decoder.push(new Uint8Array())).toStrictEqual([]);
});

test("reset discards buffered bytes", () => {
	const decoder = new FrameStreamDecoder();
	decoder.push(shortFrame().encode().slice(0, 2));

	decoder.reset();

	expect(decoder.bufferedByteLength).toBe(0);
});

test("finish succeeds after complete frames", () => {
	const decoder = new FrameStreamDecoder();
	decoder.push(new AckFrame().encode());

	expect(() => decoder.finish()).not.toThrow();
});

test("finish rejects an incomplete frame with a known length", () => {
	const decoder = new FrameStreamDecoder();
	decoder.push(shortFrame().encode().slice(0, 2));

	try {
		decoder.finish();
		expect.unreachable("Expected finish to reject an incomplete frame");
	} catch (error) {
		expect(error).toBeInstanceOf(IncompleteFrameError);
		if (error instanceof IncompleteFrameError) {
			expect(error.receivedBytes).toBe(2);
			expect(error.expectedLength).toBe(ShortFrame.ENCODED_LENGTH);
		}
	}

	expect(decoder.bufferedByteLength).toBe(0);
	expect(decoder.push(new AckFrame().encode())[0]).toBeInstanceOf(AckFrame);
});

test("finish rejects an incomplete frame with an unknown length", () => {
	const decoder = new FrameStreamDecoder();
	decoder.push(Uint8Array.of(ControlFrame.START));

	try {
		decoder.finish();
		expect.unreachable("Expected finish to reject an incomplete frame");
	} catch (error) {
		expect(error).toBeInstanceOf(IncompleteFrameError);
		if (error instanceof IncompleteFrameError) {
			expect(error.receivedBytes).toBe(1);
			expect(error.expectedLength).toBeUndefined();
		}
	}

	expect(decoder.bufferedByteLength).toBe(0);
});

test("rejects an invalid start byte and resets", () => {
	const decoder = new FrameStreamDecoder();

	expect(() => decoder.push(Uint8Array.of(0x00))).toThrow(FrameDecodeError);
	expect(decoder.bufferedByteLength).toBe(0);
});

test("rejects mismatched length fields and resets", () => {
	const decoder = new FrameStreamDecoder();

	expect(() => decoder.push(Uint8Array.of(0x68, 0x03, 0x04))).toThrow(
		FrameDecodeError,
	);
	expect(decoder.bufferedByteLength).toBe(0);
});

test("rejects an invalid variable frame length and resets", () => {
	const decoder = new FrameStreamDecoder();

	expect(() => decoder.push(Uint8Array.of(0x68, 0x02, 0x02))).toThrow(
		FrameDecodeError,
	);
	expect(decoder.bufferedByteLength).toBe(0);
});

test("preserves concrete decoder errors and resets", () => {
	const decoder = new FrameStreamDecoder();
	const frame = Uint8Array.of(0x10, 0x40, 0x01, 0x42, 0x16);

	expect(() => decoder.push(frame)).toThrow(ShortFrameDecodeError);
	expect(decoder.bufferedByteLength).toBe(0);
});
