export type FormTokenPayload = {
	eventId: string;
	issuedAtMs: number;
	baitName: string;
};

export const BAIT_CANDIDATES = ['telephone', 'postal_code', 'company', 'fax', 'homepage'] as const;
export const ADMIN_BAIT_FIELD = BAIT_CANDIDATES[0];

function decodePayload(raw: string): FormTokenPayload | null {
	const parts = raw.split('|');
	if (parts.length !== 3) return null;
	const eventId = parts[0]?.trim();
	const issuedAtMs = Number(parts[1]);
	const baitName = parts[2]?.trim();
	if (!eventId || !Number.isFinite(issuedAtMs) || !baitName) return null;
	return { eventId, issuedAtMs, baitName };
}

/** Decode the public middle segment of a form token (client-safe, no verification). */
export function parseFormTokenPayload(token: string): FormTokenPayload | null {
	const parts = token.split('.');
	if (parts.length !== 3 || parts[0] !== 'v1') return null;
	try {
		const segment = parts[1]!;
		const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
		const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
		return decodePayload(raw);
	} catch {
		return null;
	}
}
