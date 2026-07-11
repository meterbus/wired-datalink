import { DatalinkError } from "@/error";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";

export class ShortFrame {
	/**
	 * The short frame start byte
	 */
	static readonly START = 0x10;

	/**
	 * The short frame stop byte
	 */
	static readonly STOP = 0x16;

	/**
	 * The short frame length in bytes
	 */
	static readonly ENCODED_LENGTH = 5;

	/**
	 * Create a new short frame
	 *
	 * @param control The control field of the short frame
	 * @param address The address field of the short frame
	 */
	constructor(
		public readonly control: ControlField,
		public readonly address: AddressField,
	) {}

	/**
	 * Encode the short frame into a byte array
	 */
	public encode(): Uint8Array {
		return new Uint8Array([
			ShortFrame.START,
			this.control.value,
			this.address.value,
			ShortFrame.checksum(this.control, this.address),
			ShortFrame.STOP,
		]);
	}

	/**
	 * Decode a short frame from a byte array
	 */
	public static decode(bytes: Uint8Array): ShortFrame {
		if (bytes.length !== ShortFrame.ENCODED_LENGTH) {
			throw ShortFrameDecodeError.invalidLength(
				ShortFrame.ENCODED_LENGTH,
				bytes.length,
			);
		}

		if (bytes[0] !== ShortFrame.START) {
			throw ShortFrameDecodeError.invalidStartByte(bytes[0]);
		}

		if (bytes[4] !== ShortFrame.STOP) {
			throw ShortFrameDecodeError.invalidStopByte(bytes[4]);
		}

		const expectedChecksum = ShortFrame.checksum(bytes[1], bytes[2]);
		const actualChecksum = bytes[3];
		if (expectedChecksum !== actualChecksum) {
			throw ShortFrameDecodeError.invalidChecksum(
				expectedChecksum,
				actualChecksum,
			);
		}

		return new ShortFrame(
			new ControlField(bytes[1]),
			new AddressField(bytes[2]),
		);
	}

	/**
	 * Compute the checksum for a short frame given the control and address fields
	 *
	 * @param control The control field of the short frame
	 * @param address The address field of the short frame
	 *
	 * @returns The computed checksum byte
	 */
	private static checksum(
		control: ControlField | number,
		address: AddressField | number,
	): number {
		const controlValue = typeof control === "number" ? control : control.value;
		const addressValue = typeof address === "number" ? address : address.value;
		return (controlValue + addressValue) & 0xff;
	}
}

export class ShortFrameDecodeError extends DatalinkError {
	name = "ShortFrameDecodeError";

	public static invalidLength(
		expected: number,
		actual: number,
	): ShortFrameDecodeError {
		return new ShortFrameDecodeError(
			`Invalid short frame length: expected ${expected}, got ${actual}`,
		);
	}

	public static invalidStartByte(actual: number): ShortFrameDecodeError {
		return new ShortFrameDecodeError(
			`Invalid short frame start byte: expected 0x10, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidStopByte(actual: number): ShortFrameDecodeError {
		return new ShortFrameDecodeError(
			`Invalid short frame stop byte: expected 0x16, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidChecksum(
		expected: number,
		actual: number,
	): ShortFrameDecodeError {
		return new ShortFrameDecodeError(
			`Invalid short frame checksum: expected 0x${expected.toString(16)}, got 0x${actual.toString(16)}`,
		);
	}
}
