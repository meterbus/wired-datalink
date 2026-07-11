import { DatalinkError } from "@/error";

export class ControlField {
	constructor(public readonly value: number) {
		if (!Number.isInteger(value) || value < 0 || value > 255) {
			throw ControlFieldError.invalidValue(value);
		}
	}
}

export class ControlFieldError extends DatalinkError {
	name = "ControlFieldError";

	static invalidValue(value: number): ControlFieldError {
		return new ControlFieldError(
			`Control value must be between 0 and 255, got ${value}`,
		);
	}
}
