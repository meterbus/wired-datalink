import { expect, test } from "vitest";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";
import {
	ControlFrame,
	ControlFrameDecodeError,
	ControlFrameError,
} from "@/frame/control";

const KNOWN_FRAME = Uint8Array.of(
	0x68,
	0x03,
	0x03,
	0x68,
	0x53,
	0xfe,
	0xbd,
	0x0e,
	0x16,
);

test("decodes from byte array", () => {
	const frame = ControlFrame.decode(KNOWN_FRAME);

	expect(frame.control.value).toBe(0x53);
	expect(frame.address.value).toBe(0xfe);
	expect(frame.controlInformation).toBe(0xbd);
});

test("encodes to byte array", () => {
	const frame = new ControlFrame(
		new ControlField(0x53),
		new AddressField(0xfe),
		0xbd,
	);

	expect(frame.encode()).toStrictEqual(KNOWN_FRAME);
});

test.each([
	-1,
	0x100,
	1.5,
	Number.NaN,
])("rejects invalid control information %i", (controlInformation) => {
	expect(
		() =>
			new ControlFrame(
				new ControlField(0x53),
				new AddressField(0xfe),
				controlInformation,
			),
	).toThrow(ControlFrameError);
});

test("rejects invalid checksum", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[7] = 0x0f;

	expect(() => ControlFrame.decode(frame)).toThrow(ControlFrameDecodeError);
});

test.each([0, 3])("rejects invalid start byte at offset %i", (offset) => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[offset] = 0x69;

	expect(() => ControlFrame.decode(frame)).toThrow(ControlFrameDecodeError);
});

test.each([1, 2])("rejects invalid length field at offset %i", (offset) => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[offset] = 0x04;

	expect(() => ControlFrame.decode(frame)).toThrow(ControlFrameDecodeError);
});

test("rejects invalid stop byte", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[8] = 0x17;

	expect(() => ControlFrame.decode(frame)).toThrow(ControlFrameDecodeError);
});

test("rejects trailing bytes", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME, 0x00);

	expect(() => ControlFrame.decode(frame)).toThrow(ControlFrameDecodeError);
});

test("rejects truncated frame", () => {
	const frame = KNOWN_FRAME.slice(0, ControlFrame.ENCODED_LENGTH - 1);

	expect(() => ControlFrame.decode(frame)).toThrow(ControlFrameDecodeError);
});
