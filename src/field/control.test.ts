import { expect, test } from "vitest";
import { ControlField, ControlFieldError } from "@/field/control";

test.each([0x00, 0xff])("accepts control byte %i", (value) => {
	expect(new ControlField(value).value).toBe(value);
});

test.each([
	-1,
	0x100,
	1.5,
	Number.NaN,
])("rejects invalid control %i", (value) => {
	expect(() => new ControlField(value)).toThrow(ControlFieldError);
});
