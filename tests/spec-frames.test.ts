import { expect, test } from "vitest";
import {
	AckFrame,
	ControlFrame,
	createStreamDecoder,
	decodeFrame,
	LongFrame,
	ShortFrame,
} from "../src";

function fromHex(value: string): Uint8Array {
	return Uint8Array.from(value.split(" "), (byte) => Number.parseInt(byte, 16));
}

const SPEC_FRAMES = [
	{
		name: "SND_NKE short frame",
		source: "https://m-bus.com/documentation-wired/05-data-link-layer",
		bytes: "10 40 01 41 16",
		frameType: ShortFrame,
		control: 0x40,
		address: 0x01,
	},
	{
		name: "baud-rate control frame",
		source: "https://m-bus.com/documentation-wired/06-application-layer",
		bytes: "68 03 03 68 53 FE BD 0E 16",
		frameType: ControlFrame,
		control: 0x53,
		address: 0xfe,
		controlInformation: 0xbd,
	},
	{
		name: "application-reset long frame",
		source: "https://m-bus.com/documentation-wired/06-application-layer",
		bytes: "68 04 04 68 53 FE 50 10 B1 16",
		frameType: LongFrame,
		control: 0x53,
		address: 0xfe,
		controlInformation: 0x50,
		userData: "10",
	},
	{
		name: "fixed-data RSP_UD long frame",
		source: "https://m-bus.com/documentation-wired/06-application-layer",
		bytes:
			"68 13 13 68 08 05 73 78 56 34 12 0A 00 E9 7E 01 00 00 00 35 01 00 00 3C 16",
		frameType: LongFrame,
		control: 0x08,
		address: 0x05,
		controlInformation: 0x73,
		userData: "78 56 34 12 0A 00 E9 7E 01 00 00 00 35 01 00 00",
	},
	{
		name: "variable-data RSP_UD long frame",
		source: "https://m-bus.com/documentation-wired/06-application-layer",
		bytes:
			"68 1F 1F 68 08 02 72 78 56 34 12 24 40 01 07 55 00 00 00 03 13 15 31 00 DA 02 3B 13 01 8B 60 04 37 18 02 18 16",
		frameType: LongFrame,
		control: 0x08,
		address: 0x02,
		controlInformation: 0x72,
		userData:
			"78 56 34 12 24 40 01 07 55 00 00 00 03 13 15 31 00 DA 02 3B 13 01 8B 60 04 37 18 02",
	},
] as const;

test.each(SPEC_FRAMES)("decodes $name", (fixture) => {
	const bytes = fromHex(fixture.bytes);
	const frame = decodeFrame(bytes);

	expect(frame, fixture.source).toBeInstanceOf(fixture.frameType);
	expect(frame.encode(), fixture.source).toStrictEqual(bytes);

	if (frame instanceof ShortFrame) {
		expect(frame.control.value).toBe(fixture.control);
		expect(frame.address.value).toBe(fixture.address);
	}

	if (frame instanceof ControlFrame) {
		expect(frame.control.value).toBe(fixture.control);
		expect(frame.address.value).toBe(fixture.address);
		if ("controlInformation" in fixture) {
			expect(frame.controlInformation).toBe(fixture.controlInformation);
		}
	}

	if (frame instanceof LongFrame) {
		expect(frame.control.value).toBe(fixture.control);
		expect(frame.address.value).toBe(fixture.address);
		if ("controlInformation" in fixture) {
			expect(frame.controlInformation).toBe(fixture.controlInformation);
		}
		if ("userData" in fixture) {
			expect(frame.userData).toStrictEqual(fromHex(fixture.userData));
		}
	}
});

test("decodes a chunked SND_NKE acknowledgement exchange", () => {
	const decoder = createStreamDecoder();

	expect(decoder.push(fromHex("10 40"))).toStrictEqual([]);

	const frames = decoder.push(fromHex("01 41 16 E5"));
	expect(frames).toHaveLength(2);
	expect(frames[0]).toBeInstanceOf(ShortFrame);
	expect(frames[1]).toBeInstanceOf(AckFrame);
});
