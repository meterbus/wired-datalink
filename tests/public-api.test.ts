import { expect, test } from "vitest";
import {
	AckFrame,
	ControlFrame,
	createStreamDecoder,
	decodeFrame,
	FrameStreamDecoder,
	IncompleteFrameError,
	LongFrame,
	ShortFrame,
} from "../src";

test("exposes the public API", () => {
	expect(AckFrame).toBeDefined();
	expect(ShortFrame).toBeDefined();
	expect(ControlFrame).toBeDefined();
	expect(LongFrame).toBeDefined();
	expect(FrameStreamDecoder).toBeDefined();
	expect(IncompleteFrameError).toBeDefined();
	expect(decodeFrame).toBeTypeOf("function");
	expect(createStreamDecoder).toBeTypeOf("function");
});
