import { randomBytes } from 'node:crypto';

function hexByte(value: number): string {
	return value.toString(16).padStart(2, '0');
}

/** Time-ordered UUID v7 (RFC 9562) with millisecond timestamp. */
export function createUuidV7(): string {
	const timestamp = BigInt(Date.now());
	const rand = randomBytes(10);

	const bytes = new Uint8Array(16);
	bytes[0] = Number((timestamp >> 40n) & 0xffn);
	bytes[1] = Number((timestamp >> 32n) & 0xffn);
	bytes[2] = Number((timestamp >> 24n) & 0xffn);
	bytes[3] = Number((timestamp >> 16n) & 0xffn);
	bytes[4] = Number((timestamp >> 8n) & 0xffn);
	bytes[5] = Number(timestamp & 0xffn);

	bytes[6] = 0x70 | (rand[0] & 0x0f);
	bytes[7] = rand[1];
	bytes[8] = 0x80 | (rand[2] & 0x3f);
	bytes[9] = rand[3];
	bytes[10] = rand[4];
	bytes[11] = rand[5];
	bytes[12] = rand[6];
	bytes[13] = rand[7];
	bytes[14] = rand[8];
	bytes[15] = rand[9];

	const hex = Array.from(bytes, hexByte).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
