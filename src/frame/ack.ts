import { DatalinkError } from "@/error";

/**
 * Single-byte acknowledgment frame
 */
export class AckFrame {
	/**
	 * The encoded acknowledgment frame byte
	 */
	static readonly BYTE = 0xe5;

	/**
	 * The length of the encoded acknowledgment frame in bytes
	 */
	static readonly ENCODED_LENGTH = 1;

	/**
	 * Encode the acknowledgment frame as an array of bytes
	 */
	public encode(): Uint8Array {
		return new Uint8Array([AckFrame.BYTE]);
	}

	/**
	 * Decode an acknowledgment frame from an array of bytes
	 */
	public static decode(bytes: Uint8Array): AckFrame {
		if (bytes.length !== AckFrame.ENCODED_LENGTH) {
			throw AckFrameDecodeError.invalidLength(
				AckFrame.ENCODED_LENGTH,
				bytes.length,
			);
		}

		if (bytes[0] !== AckFrame.BYTE) {
			throw AckFrameDecodeError.invalidByte(bytes[0]);
		}

		return new AckFrame();
	}
}

export class AckFrameDecodeError extends DatalinkError {
	name = "AckFrameDecodeError";

	public static invalidLength(
		expected: number,
		actual: number,
	): AckFrameDecodeError {
		return new AckFrameDecodeError(
			`Invalid ackframe length: expected ${expected}, got ${actual}`,
		);
	}

	public static invalidByte(actual: number): AckFrameDecodeError {
		return new AckFrameDecodeError(
			`Invalid ack frame byte: expected 0xe5, got 0x${actual.toString(16)}`,
		);
	}
}
