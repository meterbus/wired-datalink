import { decodeFrame, LongFrame } from "@meterbus/wired-datalink";

const bytes = Uint8Array.of(
	0x68,
	0x04,
	0x04,
	0x68,
	0x53,
	0xfe,
	0x50,
	0x10,
	0xb1,
	0x16,
);

const frame = decodeFrame(bytes);

if (!(frame instanceof LongFrame)) {
	throw new Error(`Expected a long frame, got ${frame.constructor.name}`);
}

console.log({
	control: frame.control.value,
	address: frame.address.value,
	controlInformation: frame.controlInformation,
	userData: Array.from(frame.userData),
});
