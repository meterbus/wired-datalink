import { expect, test } from "vitest";
import { decodeFrame, FrameDecodeError } from "@/decoder/frame";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";
import { AckFrame } from "@/frame/ack";
import { ControlFrame } from "@/frame/control";
import { LongFrame } from "@/frame/long";
import { ShortFrame, ShortFrameDecodeError } from "@/frame/short";

test("decodes acknowledgement frame", () => {
	const frame = decodeFrame(new AckFrame().encode());

	expect(frame).toBeInstanceOf(AckFrame);
});

test("decodes short frame", () => {
	const encoded = new ShortFrame(
		new ControlField(0x40),
		new AddressField(0x01),
	).encode();

	expect(decodeFrame(encoded)).toBeInstanceOf(ShortFrame);
});

test("decodes control frame", () => {
	const encoded = new ControlFrame(
		new ControlField(0x53),
		new AddressField(0xfe),
		0xbd,
	).encode();

	expect(decodeFrame(encoded)).toBeInstanceOf(ControlFrame);
});

test("decodes long frame", () => {
	const encoded = new LongFrame(
		new ControlField(0x53),
		new AddressField(0xfe),
		0x50,
		Uint8Array.of(0x10),
	).encode();

	expect(decodeFrame(encoded)).toBeInstanceOf(LongFrame);
});

test("rejects empty input", () => {
	expect(() => decodeFrame(new Uint8Array())).toThrow(FrameDecodeError);
});

test("rejects invalid start byte", () => {
	expect(() => decodeFrame(Uint8Array.of(0x00))).toThrow(FrameDecodeError);
});

test("rejects incomplete variable frame header", () => {
	expect(() => decodeFrame(Uint8Array.of(0x68, 0x03))).toThrow(
		FrameDecodeError,
	);
});

test("rejects mismatched variable frame length fields", () => {
	expect(() => decodeFrame(Uint8Array.of(0x68, 0x03, 0x04))).toThrow(
		FrameDecodeError,
	);
});

test("rejects invalid variable frame length field", () => {
	expect(() => decodeFrame(Uint8Array.of(0x68, 0x02, 0x02))).toThrow(
		FrameDecodeError,
	);
});

test("preserves concrete decoder errors", () => {
	const frame = Uint8Array.of(0x10, 0x40, 0x01, 0x42, 0x16);

	expect(() => decodeFrame(frame)).toThrow(ShortFrameDecodeError);
});
