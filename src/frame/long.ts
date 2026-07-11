import { DatalinkError } from "@/error";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";

/**
 * Variable-length frame containing application-layer user data
 */
export class LongFrame {
	/** The long frame start byte */
	static readonly START = 0x68;

	/** The number of non-user-data bytes covered by the length field */
	static readonly FIXED_DATA_LENGTH = 3;

	/** The minimum number of user-data bytes in a long frame */
	static readonly MIN_USER_DATA_LENGTH = 1;

	/** The maximum number of user-data bytes in a long frame */
	static readonly MAX_USER_DATA_LENGTH = 252;

	/** The long frame stop byte */
	static readonly STOP = 0x16;

	/** The minimum encoded long frame length in bytes */
	static readonly MIN_ENCODED_LENGTH = 10;

	public readonly controlInformation: number;
	public readonly userData: Uint8Array;

	constructor(
		public readonly control: ControlField,
		public readonly address: AddressField,
		controlInformation: number,
		userData: Uint8Array,
	) {
		if (
			!Number.isInteger(controlInformation) ||
			controlInformation < 0 ||
			controlInformation > 255
		) {
			throw LongFrameError.invalidControlInformation(controlInformation);
		}

		if (
			userData.length < LongFrame.MIN_USER_DATA_LENGTH ||
			userData.length > LongFrame.MAX_USER_DATA_LENGTH
		) {
			throw LongFrameError.invalidUserDataLength(userData.length);
		}

		this.controlInformation = controlInformation;
		this.userData = userData.slice();
	}

	/** Encode the long frame into a byte array */
	public encode(): Uint8Array {
		const length = LongFrame.FIXED_DATA_LENGTH + this.userData.length;
		const bytes = new Uint8Array(length + 6);
		const checksumOffset = length + 4;

		bytes[0] = LongFrame.START;
		bytes[1] = length;
		bytes[2] = length;
		bytes[3] = LongFrame.START;
		bytes[4] = this.control.value;
		bytes[5] = this.address.value;
		bytes[6] = this.controlInformation;
		bytes.set(this.userData, 7);
		bytes[checksumOffset] = LongFrame.checksum(
			bytes.subarray(4, checksumOffset),
		);
		bytes[checksumOffset + 1] = LongFrame.STOP;

		return bytes;
	}

	/** Decode a long frame from a byte array */
	public static decode(bytes: Uint8Array): LongFrame {
		if (bytes.length < 4) {
			throw LongFrameDecodeError.invalidMinimumLength(
				LongFrame.MIN_ENCODED_LENGTH,
				bytes.length,
			);
		}

		if (bytes[0] !== LongFrame.START) {
			throw LongFrameDecodeError.invalidStartByte(0, bytes[0]);
		}

		if (bytes[1] !== bytes[2]) {
			throw LongFrameDecodeError.mismatchedLengthFields(bytes[1], bytes[2]);
		}

		const length = bytes[1];
		const minimumLength =
			LongFrame.FIXED_DATA_LENGTH + LongFrame.MIN_USER_DATA_LENGTH;
		if (length < minimumLength) {
			throw LongFrameDecodeError.invalidLengthField(minimumLength, length);
		}

		const expectedEncodedLength = length + 6;
		if (bytes.length !== expectedEncodedLength) {
			throw LongFrameDecodeError.invalidLength(
				expectedEncodedLength,
				bytes.length,
			);
		}

		if (bytes[3] !== LongFrame.START) {
			throw LongFrameDecodeError.invalidStartByte(3, bytes[3]);
		}

		const checksumOffset = length + 4;
		const stopOffset = checksumOffset + 1;
		if (bytes[stopOffset] !== LongFrame.STOP) {
			throw LongFrameDecodeError.invalidStopByte(bytes[stopOffset]);
		}

		const expectedChecksum = LongFrame.checksum(
			bytes.subarray(4, checksumOffset),
		);
		const actualChecksum = bytes[checksumOffset];
		if (expectedChecksum !== actualChecksum) {
			throw LongFrameDecodeError.invalidChecksum(
				expectedChecksum,
				actualChecksum,
			);
		}

		return new LongFrame(
			new ControlField(bytes[4]),
			new AddressField(bytes[5]),
			bytes[6],
			bytes.slice(7, checksumOffset),
		);
	}

	private static checksum(bytes: Uint8Array): number {
		let checksum = 0;
		for (const byte of bytes) {
			checksum = (checksum + byte) & 0xff;
		}
		return checksum;
	}
}

export class LongFrameError extends DatalinkError {
	name = "LongFrameError";

	public static invalidControlInformation(actual: number): LongFrameError {
		return new LongFrameError(
			`Control information must be an integer between 0 and 255, got ${actual}`,
		);
	}

	public static invalidUserDataLength(actual: number): LongFrameError {
		return new LongFrameError(
			`Long frame user data must contain between 1 and 252 bytes, got ${actual}`,
		);
	}
}

export class LongFrameDecodeError extends LongFrameError {
	name = "LongFrameDecodeError";

	public static invalidMinimumLength(
		minimum: number,
		actual: number,
	): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Invalid long frame length: expected at least ${minimum}, got ${actual}`,
		);
	}

	public static invalidLength(
		expected: number,
		actual: number,
	): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Invalid long frame length: expected ${expected}, got ${actual}`,
		);
	}

	public static mismatchedLengthFields(
		first: number,
		second: number,
	): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Mismatched long frame length fields: got ${first} and ${second}`,
		);
	}

	public static invalidLengthField(
		minimum: number,
		actual: number,
	): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Invalid long frame length field: expected at least ${minimum}, got ${actual}`,
		);
	}

	public static invalidStartByte(
		offset: number,
		actual: number,
	): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Invalid long frame start byte at offset ${offset}: expected 0x68, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidStopByte(actual: number): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Invalid long frame stop byte: expected 0x16, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidChecksum(
		expected: number,
		actual: number,
	): LongFrameDecodeError {
		return new LongFrameDecodeError(
			`Invalid long frame checksum: expected 0x${expected.toString(16)}, got 0x${actual.toString(16)}`,
		);
	}
}
