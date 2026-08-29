import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SCRYPT_N = 16384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_KEYLEN = 64;

const HASH_PREFIX = 'scrypt';

export function hashPassword(plain: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(plain, salt, SCRYPT_KEYLEN, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P,
	});
	return `${HASH_PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function parsePasswordHash(stored: string): {
	N: number;
	r: number;
	p: number;
	salt: Buffer;
	hash: Buffer;
} | null {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== HASH_PREFIX) {
		return null;
	}

	const N = Number(parts[1]);
	const r = Number(parts[2]);
	const p = Number(parts[3]);
	if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
		return null;
	}

	try {
		const salt = Buffer.from(parts[4], 'base64url');
		const hash = Buffer.from(parts[5], 'base64url');
		if (salt.length === 0 || hash.length === 0) {
			return null;
		}
		return { N, r, p, salt, hash };
	} catch {
		return null;
	}
}

export function isValidPasswordHashFormat(stored: string): boolean {
	return parsePasswordHash(stored) !== null;
}

export function verifyPassword(plain: string, stored: string): boolean {
	const parsed = parsePasswordHash(stored);
	if (!parsed) {
		return false;
	}

	const derived = scryptSync(plain, parsed.salt, parsed.hash.length, {
		N: parsed.N,
		r: parsed.r,
		p: parsed.p,
	});

	if (derived.length !== parsed.hash.length) {
		return false;
	}

	return timingSafeEqual(derived, parsed.hash);
}
