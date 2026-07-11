import { expect, test } from "vitest";
import { AckFrame, AckFrameDecodeError } from "@/frame/ack";

test("encodes to byte array", () => {
	expect(new AckFrame().encode()).toStrictEqual(Uint8Array.of(AckFrame.BYTE));
});

test("decodes from byte array", () => {
	const acknowledgement = AckFrame.decode(Uint8Array.of(AckFrame.BYTE));

	expect(acknowledgement).toBeInstanceOf(AckFrame);
});

test("rejects invalid byte", () => {
	const decode = () => AckFrame.decode(Uint8Array.of(0x00));

	expect(decode).toThrow(AckFrameDecodeError);
});

test("rejects empty byte array", () => {
	expect(() => AckFrame.decode(new Uint8Array())).toThrow(AckFrameDecodeError);
});
