const counters = new Map<string, number>();

export type RegistrationCounterReason =
	| 'token_missing'
	| 'token_invalid'
	| 'token_expired'
	| 'too_fast'
	| 'bait'
	| 'schema'
	| 'duplicate'
	| 'ok';

export function incrementRegistrationCounter(reason: RegistrationCounterReason): void {
	counters.set(reason, (counters.get(reason) ?? 0) + 1);
}

export function getRegistrationCounters(): Record<string, number> {
	return Object.fromEntries(counters.entries());
}
