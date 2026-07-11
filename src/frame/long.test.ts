import { expect, test } from "vitest";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";
import { LongFrame, LongFrameDecodeError, LongFrameError } from "@/frame/long";

const KNOWN_FRAME = Uint8Array.of(
	0x68,
	0x04,
	0x04,
	0x68,
	0x53,
	0xfe,
	0x50,
	0x10,
	0xb1,
	0x16,
);

function createFrame(
	controlInformation = 0x50,
	userData = Uint8Array.of(0x10),
): LongFrame {
	return new LongFrame(
		new ControlField(0x53),
		new AddressField(0xfe),
		controlInformation,
		userData,
	);
}

test("decodes from byte array", () => {
	const frame = LongFrame.decode(KNOWN_FRAME);

	expect(frame.control.value).toBe(0x53);
	expect(frame.address.value).toBe(0xfe);
	expect(frame.controlInformation).toBe(0x50);
	expect(frame.userData).toStrictEqual(Uint8Array.of(0x10));
});

test("encodes to byte array", () => {
	expect(createFrame().encode()).toStrictEqual(KNOWN_FRAME);
});

test("copies user data", () => {
	const userData = Uint8Array.of(0x10);
	const frame = createFrame(0x50, userData);
	userData[0] = 0x11;

	expect(frame.userData).toStrictEqual(Uint8Array.of(0x10));
});

test("supports maximum user data length", () => {
	const userData = new Uint8Array(LongFrame.MAX_USER_DATA_LENGTH);
	const encoded = createFrame(0x50, userData).encode();

	expect(encoded).toHaveLength(261);
	expect(encoded[1]).toBe(0xff);
	expect(LongFrame.decode(encoded).userData).toStrictEqual(userData);
});

test.each([
	-1,
	0x100,
	1.5,
	Number.NaN,
])("rejects invalid control information %i", (controlInformation) => {
	expect(() => createFrame(controlInformation)).toThrow(LongFrameError);
});

test.each([
	0,
	LongFrame.MAX_USER_DATA_LENGTH + 1,
])("rejects invalid user data length %i", (length) => {
	expect(() => createFrame(0x50, new Uint8Array(length))).toThrow(
		LongFrameError,
	);
});

test("rejects invalid checksum", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[8] = 0xb2;

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test.each([0, 3])("rejects invalid start byte at offset %i", (offset) => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[offset] = 0x69;

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test("rejects mismatched length fields", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[2] = 0x05;

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test("rejects control frame length", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[1] = LongFrame.FIXED_DATA_LENGTH;
	frame[2] = LongFrame.FIXED_DATA_LENGTH;

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test("rejects invalid stop byte", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME);
	frame[9] = 0x17;

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test("rejects trailing bytes", () => {
	const frame = Uint8Array.of(...KNOWN_FRAME, 0x00);

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test("rejects truncated frame", () => {
	const frame = KNOWN_FRAME.slice(0, KNOWN_FRAME.length - 1);

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});

test("rejects incomplete header", () => {
	const frame = KNOWN_FRAME.slice(0, 3);

	expect(() => LongFrame.decode(frame)).toThrow(LongFrameDecodeError);
});
