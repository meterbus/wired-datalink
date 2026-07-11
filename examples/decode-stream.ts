import { createStreamDecoder, type Frame } from "@meterbus/wired-datalink";

function describe(frame: Frame): string {
	return frame.constructor.name;
}

const decoder = createStreamDecoder({
	recovery: "resync",
	onRecovery({ error, discarded }) {
		console.warn(error.message, Array.from(discarded));
	},
});

const chunks = [
	Uint8Array.of(0xff, 0x10, 0x40),
	Uint8Array.of(0x01, 0x41, 0x16, 0xe5),
];

for (const chunk of chunks) {
	for (const frame of decoder.push(chunk)) {
		console.log(describe(frame));
	}
}

decoder.finish();
