import { expect, test } from "vitest";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";
import { ShortFrame, ShortFrameDecodeError } from "@/frame/short";

const KNOWN_FRAME = Uint8Array.of(0x10, 0x40, 0x01, 0x41, 0x16);

test("decodes from byte array", () => {
	const frame = ShortFrame.decode(KNOWN_FRAME);

	expect(frame.control.value).toBe(0x40);
	expect(frame.address.value).toBe(0x01);
});

test("encodes to byte array", () => {
	const frame = new ShortFrame(new ControlField(0x40), new AddressField(0x01));

	expect(frame.encode()).toStrictEqual(KNOWN_FRAME);
});

test("rejects invalid checksum", () => {
	const frame = Uint8Array.of(0x10, 0x40, 0x01, 0x42, 0x16);

	expect(() => ShortFrame.decode(frame)).toThrow(ShortFrameDecodeError);
});

test("rejects invalid start byte", () => {
	const frame = Uint8Array.of(0x11, 0x40, 0x01, 0x41, 0x16);

	expect(() => ShortFrame.decode(frame)).toThrow(ShortFrameDecodeError);
});

test("rejects invalid stop byte", () => {
	const frame = Uint8Array.of(0x10, 0x40, 0x01, 0x41, 0x17);

	expect(() => ShortFrame.decode(frame)).toThrow(ShortFrameDecodeError);
});

test("rejects trailing bytes", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME, 0x00);

	expect(() => ShortFrame.decode(frame)).toThrow(ShortFrameDecodeError);
});

test("rejects truncated frame", () => {
	const frame = KNOWN_FRAME.slice(0, ShortFrame.ENCODED_LENGTH - 1);

	expect(() => ShortFrame.decode(frame)).toThrow(ShortFrameDecodeError);
});
