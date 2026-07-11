import {
	AddressField,
	ControlField,
	ShortFrame,
} from "@meterbus/wired-datalink";

const frame = new ShortFrame(new ControlField(0x40), new AddressField(0x01));

const bytes = frame.encode();
const hexadecimal = Array.from(bytes, (byte) =>
	byte.toString(16).padStart(2, "0"),
).join(" ");

console.log(hexadecimal);
