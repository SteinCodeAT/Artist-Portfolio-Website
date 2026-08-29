import { createHmac, timingSafeEqual } from 'node:crypto';
import { SESSION_SECRET } from 'astro:env/server';
import type { FormTokenPayload } from './form-token-parse.ts';

export type { FormTokenPayload } from './form-token-parse.ts';
export { parseFormTokenPayload, BAIT_CANDIDATES, ADMIN_BAIT_FIELD } from './form-token-parse.ts';

/**
 * Signed, time-limited proof-of-fetch token for public forms.
 * NOT a CSRF token: not bound to a session, provides no CSRF protection.
 * Safe here only because /api/register-event is unauthenticated.
 */

export const MIN_AGE_MS = 2_000;  // 2 seconds
export const MAX_AGE_MS = 1 * 60 * 60 * 1000;  // 1 hour
export const RELOAD_MSG =
	'Das Formular ist abgelaufen. Bitte laden Sie die Seite neu.';

export type TokenResult =
	| { status: 'ok'; ageMs: number; baitName: string }
	| { status: 'expired' }
	| { status: 'invalid' };

const BAIT_CANDIDATES = ['telephone', 'postal_code', 'company', 'fax', 'homepage'] as const;
const RESERVED = new Set(['eventId', 'name', 'email', 'guests', 'answers', '_sibop']);

function formTokenKey(secret: string): Buffer {
	return createHmac('sha256', secret).update('form-token-v1').digest();
}

function decodePayload(raw: string): FormTokenPayload | null {
	const parts = raw.split('|');
	if (parts.length !== 3) return null;
	const eventId = parts[0]?.trim();
	const issuedAtMs = Number(parts[1]);
	const baitName = parts[2]?.trim();
	if (!eventId || !Number.isFinite(issuedAtMs) || !baitName) return null;
	return { eventId, issuedAtMs, baitName };
}

function encodePayload(payload: FormTokenPayload): string {
	return `${payload.eventId}|${payload.issuedAtMs}|${payload.baitName}`;
}

function signPayload(payload: string, secret: string): string {
	return createHmac('sha256', formTokenKey(secret)).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function pickBaitName(indexBytes: Buffer): string {
	const available = BAIT_CANDIDATES.filter((name) => !RESERVED.has(name));
	return available[indexBytes[0]! % available.length]!;
}

export function issueFormToken(eventId: string): { token: string; baitName: string } {
	const issuedAtMs = Date.now();
	const preHash = createHmac('sha256', formTokenKey(SESSION_SECRET))
		.update(`${eventId}|${issuedAtMs}`)
		.digest();
	const baitName = pickBaitName(preHash);
	const payload = encodePayload({ eventId, issuedAtMs, baitName });
	const sig = signPayload(payload, SESSION_SECRET);
	const token = `v1.${Buffer.from(payload, 'utf8').toString('base64url')}.${sig}`;
	return { token, baitName };
}

export function verifyFormToken(token: unknown, eventId: string): TokenResult {
	if (typeof token !== 'string' || !token) {
		return { status: 'invalid' };
	}

	const parts = token.split('.');
	if (parts.length !== 3 || parts[0] !== 'v1') {
		return { status: 'invalid' };
	}

	let raw: string;
	try {
		raw = Buffer.from(parts[1]!, 'base64url').toString('utf8');
	} catch {
		return { status: 'invalid' };
	}

	const payload = decodePayload(raw);
	if (!payload || payload.eventId !== eventId) {
		return { status: 'invalid' };
	}

	const expected = signPayload(raw, SESSION_SECRET);
	if (!safeEqual(expected, parts[2]!)) {
		return { status: 'invalid' };
	}

	const ageMs = Date.now() - payload.issuedAtMs;
	if (ageMs > MAX_AGE_MS) {
		return { status: 'expired' };
	}

	return { status: 'ok', ageMs, baitName: payload.baitName };
}
