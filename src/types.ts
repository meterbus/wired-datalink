import type { DatalinkError } from "@/error";
import type { AckFrame } from "@/frame/ack";
import type { ControlFrame } from "@/frame/control";
import type { LongFrame } from "@/frame/long";
import type { ShortFrame } from "@/frame/short";

/** Any supported wired M-Bus data-link frame */
export type Frame = AckFrame | ShortFrame | ControlFrame | LongFrame;

/** Strategy used when malformed data is encountered in a byte stream */
export type FrameStreamDecoderRecovery = "strict" | "resync";

/** Details about malformed data discarded during stream resynchronization */
export interface FrameStreamDecoderRecoveryEvent {
	/** The decoding error that caused recovery */
	readonly error: DatalinkError;

	/** The bytes discarded to resume scanning, currently one byte per event */
	readonly discarded: Uint8Array;
}

/** Configuration for an incremental frame stream decoder */
export interface FrameStreamDecoderOptions {
	/**
	 * How malformed data is handled
	 *
	 * @defaultValue `"strict"`
	 */
	readonly recovery?: FrameStreamDecoderRecovery;

	/**
	 * Called whenever malformed data is discarded in `"resync"` mode
	 *
	 * Errors thrown by this callback clear the decoder buffer and propagate to
	 * the caller of `push()`.
	 */
	readonly onRecovery?: (event: FrameStreamDecoderRecoveryEvent) => void;
}
