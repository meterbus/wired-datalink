import { DatalinkError } from "@/error";
import { AckFrame } from "@/frame/ack";
import { ControlFrame } from "@/frame/control";
import { LongFrame } from "@/frame/long";
import { ShortFrame } from "@/frame/short";
import type { Frame } from "@/types";

/**
 * Decode exactly one complete data-link frame
 */
export function decodeFrame(bytes: Uint8Array): Frame {
	if (bytes.length === 0) {
		throw FrameDecodeError.emptyInput();
	}

	switch (bytes[0]) {
		case AckFrame.BYTE:
			return AckFrame.decode(bytes);
		case ShortFrame.START:
			return ShortFrame.decode(bytes);
		case ControlFrame.START:
			return decodeVariableFrame(bytes);
		default:
			throw FrameDecodeError.invalidStartByte(bytes[0]);
	}
}

function decodeVariableFrame(bytes: Uint8Array): ControlFrame | LongFrame {
	if (bytes.length < 3) {
		throw FrameDecodeError.incompleteHeader(bytes.length);
	}

	if (bytes[1] !== bytes[2]) {
		throw FrameDecodeError.mismatchedLengthFields(bytes[1], bytes[2]);
	}

	if (bytes[1] === ControlFrame.LENGTH) {
		return ControlFrame.decode(bytes);
	}

	if (bytes[1] > ControlFrame.LENGTH) {
		return LongFrame.decode(bytes);
	}

	throw FrameDecodeError.invalidLengthField(bytes[1]);
}

export class FrameDecodeError extends DatalinkError {
	name = "FrameDecodeError";

	public static emptyInput(): FrameDecodeError {
		return new FrameDecodeError(
			"Cannot decode a frame from an empty byte array",
		);
	}

	public static invalidStartByte(actual: number): FrameDecodeError {
		return new FrameDecodeError(
			`Invalid frame start byte: got 0x${actual.toString(16)}`,
		);
	}

	public static incompleteHeader(actual: number): FrameDecodeError {
		return new FrameDecodeError(
			`Incomplete variable frame header: expected at least 3 bytes, got ${actual}`,
		);
	}

	public static mismatchedLengthFields(
		first: number,
		second: number,
	): FrameDecodeError {
		return new FrameDecodeError(
			`Mismatched variable frame length fields: got ${first} and ${second}`,
		);
	}

	public static invalidLengthField(actual: number): FrameDecodeError {
		return new FrameDecodeError(
			`Invalid variable frame length field: expected at least 3, got ${actual}`,
		);
	}
}
