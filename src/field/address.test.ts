import { expect, test } from "vitest";
import { AddressField, AddressFieldError } from "@/field/address";

test.each([0x00, 0xff])("accepts address byte %i", (value) => {
	expect(new AddressField(value).value).toBe(value);
});

test.each([
	-1,
	0x100,
	1.5,
	Number.NaN,
])("rejects invalid address %i", (value) => {
	expect(() => new AddressField(value)).toThrow(AddressFieldError);
});
