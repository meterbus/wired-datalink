import { DatalinkError } from "@/error";
import { AddressField } from "@/field/address";
import { ControlField } from "@/field/control";

/**
 * Fixed-length control frame without user data
 */
export class ControlFrame {
	/** The control frame start byte */
	static readonly START = 0x68;

	/** The number of bytes covered by each length field */
	static readonly LENGTH = 3;

	/** The control frame stop byte */
	static readonly STOP = 0x16;

	/** The encoded control frame length in bytes */
	static readonly ENCODED_LENGTH = 9;

	constructor(
		public readonly control: ControlField,
		public readonly address: AddressField,
		public readonly controlInformation: number,
	) {
		if (
			!Number.isInteger(controlInformation) ||
			controlInformation < 0 ||
			controlInformation > 255
		) {
			throw ControlFrameError.invalidControlInformation(controlInformation);
		}
	}

	/** Encode the control frame into a byte array */
	public encode(): Uint8Array {
		return Uint8Array.of(
			ControlFrame.START,
			ControlFrame.LENGTH,
			ControlFrame.LENGTH,
			ControlFrame.START,
			this.control.value,
			this.address.value,
			this.controlInformation,
			ControlFrame.checksum(
				this.control,
				this.address,
				this.controlInformation,
			),
			ControlFrame.STOP,
		);
	}

	/** Decode a control frame from a byte array */
	public static decode(bytes: Uint8Array): ControlFrame {
		if (bytes.length !== ControlFrame.ENCODED_LENGTH) {
			throw ControlFrameDecodeError.invalidLength(
				ControlFrame.ENCODED_LENGTH,
				bytes.length,
			);
		}

		if (bytes[0] !== ControlFrame.START) {
			throw ControlFrameDecodeError.invalidStartByte(0, bytes[0]);
		}

		if (bytes[1] !== ControlFrame.LENGTH) {
			throw ControlFrameDecodeError.invalidLengthField(1, bytes[1]);
		}

		if (bytes[2] !== ControlFrame.LENGTH) {
			throw ControlFrameDecodeError.invalidLengthField(2, bytes[2]);
		}

		if (bytes[3] !== ControlFrame.START) {
			throw ControlFrameDecodeError.invalidStartByte(3, bytes[3]);
		}

		if (bytes[8] !== ControlFrame.STOP) {
			throw ControlFrameDecodeError.invalidStopByte(bytes[8]);
		}

		const expectedChecksum = ControlFrame.checksum(
			bytes[4],
			bytes[5],
			bytes[6],
		);
		const actualChecksum = bytes[7];
		if (expectedChecksum !== actualChecksum) {
			throw ControlFrameDecodeError.invalidChecksum(
				expectedChecksum,
				actualChecksum,
			);
		}

		return new ControlFrame(
			new ControlField(bytes[4]),
			new AddressField(bytes[5]),
			bytes[6],
		);
	}

	private static checksum(
		control: ControlField | number,
		address: AddressField | number,
		controlInformation: number,
	): number {
		const controlValue = typeof control === "number" ? control : control.value;
		const addressValue = typeof address === "number" ? address : address.value;

		return (controlValue + addressValue + controlInformation) & 0xff;
	}
}

export class ControlFrameError extends DatalinkError {
	name = "ControlFrameError";

	public static invalidControlInformation(actual: number): ControlFrameError {
		return new ControlFrameError(
			`Control information must be an integer between 0 and 255, got ${actual}`,
		);
	}
}

export class ControlFrameDecodeError extends ControlFrameError {
	name = "ControlFrameDecodeError";

	public static invalidLength(
		expected: number,
		actual: number,
	): ControlFrameDecodeError {
		return new ControlFrameDecodeError(
			`Invalid control frame length: expected ${expected}, got ${actual}`,
		);
	}

	public static invalidLengthField(
		offset: number,
		actual: number,
	): ControlFrameDecodeError {
		return new ControlFrameDecodeError(
			`Invalid control frame length field at offset ${offset}: expected 0x3, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidStartByte(
		offset: number,
		actual: number,
	): ControlFrameDecodeError {
		return new ControlFrameDecodeError(
			`Invalid control frame start byte at offset ${offset}: expected 0x68, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidStopByte(actual: number): ControlFrameDecodeError {
		return new ControlFrameDecodeError(
			`Invalid control frame stop byte: expected 0x16, got 0x${actual.toString(16)}`,
		);
	}

	public static invalidChecksum(
		expected: number,
		actual: number,
	): ControlFrameDecodeError {
		return new ControlFrameDecodeError(
			`Invalid control frame checksum: expected 0x${expected.toString(16)}, got 0x${actual.toString(16)}`,
		);
	}
}
