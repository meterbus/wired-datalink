import { decodeFrame, FrameDecodeError } from "@/decoder/frame";
import { DatalinkError } from "@/error";
import { AckFrame } from "@/frame/ack";
import { ControlFrame } from "@/frame/control";
import { ShortFrame } from "@/frame/short";
import type {
	Frame,
	FrameStreamDecoderOptions,
	FrameStreamDecoderRecovery,
} from "@/types";

/**
 * Incrementally decode complete frames from arbitrary byte chunks
 *
 * Strict recovery clears buffered state and throws on malformed input. Resync
 * recovery discards malformed bytes and continues scanning for valid frames.
 */
export class FrameStreamDecoder {
	private buffer = new Uint8Array();
	private readonly recovery: FrameStreamDecoderRecovery;
	private readonly onRecovery: FrameStreamDecoderOptions["onRecovery"];

	constructor(options: FrameStreamDecoderOptions = {}) {
		this.recovery = options.recovery ?? "strict";
		this.onRecovery = options.onRecovery;
	}

	/** The number of incomplete frame bytes retained between pushes */
	public get bufferedByteLength(): number {
		return this.buffer.length;
	}

	/**
	 * Add a chunk and return every complete frame it contains
	 */
	public push(chunk: Uint8Array): Frame[] {
		const bytes = new Uint8Array(this.buffer.length + chunk.length);
		bytes.set(this.buffer);
		bytes.set(chunk, this.buffer.length);

		const frames: Frame[] = [];
		let offset = 0;

		try {
			while (offset < bytes.length) {
				try {
					const frameLength = FrameStreamDecoder.frameLength(bytes, offset);
					if (
						frameLength === undefined ||
						bytes.length - offset < frameLength
					) {
						break;
					}

					frames.push(decodeFrame(bytes.slice(offset, offset + frameLength)));
					offset += frameLength;
				} catch (error) {
					if (this.recovery === "strict" || !(error instanceof DatalinkError)) {
						throw error;
					}

					const discarded = bytes.slice(offset, offset + 1);
					this.onRecovery?.({ error, discarded });
					offset += discarded.length;
				}
			}
		} catch (error) {
			this.reset();
			throw error;
		}

		this.buffer = bytes.slice(offset);
		return frames;
	}

	/**
	 * Complete the stream and reject a trailing incomplete frame
	 */
	public finish(): void {
		if (this.buffer.length === 0) {
			return;
		}

		const receivedBytes = this.buffer.length;
		const expectedLength = FrameStreamDecoder.frameLength(this.buffer, 0);
		this.reset();
		throw new IncompleteFrameError(receivedBytes, expectedLength);
	}

	/** Discard any incomplete buffered frame */
	public reset(): void {
		this.buffer = new Uint8Array();
	}

	private static frameLength(
		bytes: Uint8Array,
		offset: number,
	): number | undefined {
		switch (bytes[offset]) {
			case AckFrame.BYTE:
				return AckFrame.ENCODED_LENGTH;
			case ShortFrame.START:
				return ShortFrame.ENCODED_LENGTH;
			case ControlFrame.START: {
				if (bytes.length - offset < 3) {
					return undefined;
				}

				const firstLength = bytes[offset + 1];
				const secondLength = bytes[offset + 2];
				if (firstLength !== secondLength) {
					throw FrameDecodeError.mismatchedLengthFields(
						firstLength,
						secondLength,
					);
				}

				if (firstLength < ControlFrame.LENGTH) {
					throw FrameDecodeError.invalidLengthField(firstLength);
				}

				return firstLength + 6;
			}
			default:
				throw FrameDecodeError.invalidStartByte(bytes[offset]);
		}
	}
}

/** Create a new incremental frame stream decoder */
export function createStreamDecoder(
	options: FrameStreamDecoderOptions = {},
): FrameStreamDecoder {
	return new FrameStreamDecoder(options);
}

export class IncompleteFrameError extends DatalinkError {
	name = "IncompleteFrameError";

	constructor(
		public readonly receivedBytes: number,
		public readonly expectedLength?: number,
	) {
		super(
			expectedLength === undefined
				? `Incomplete frame: received ${receivedBytes} bytes before the stream ended`
				: `Incomplete frame: expected ${expectedLength} bytes, received ${receivedBytes}`,
		);
	}
}
