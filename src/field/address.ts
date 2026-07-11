import { DatalinkError } from "@/error";

export class AddressField {
	constructor(public readonly value: number) {
		if (!Number.isInteger(value) || value < 0 || value > 255) {
			throw AddressFieldError.invalidValue(value);
		}
	}
}

export class AddressFieldError extends DatalinkError {
	name = "AddressFieldError";

	static invalidValue(value: number): AddressFieldError {
		return new AddressFieldError(
			`Address value must be between 0 and 255, got ${value}`,
		);
	}
}
