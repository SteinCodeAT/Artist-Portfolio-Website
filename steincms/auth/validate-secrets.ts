import { validateAuthUsersForProduction } from './load-users.ts';

const MIN_SESSION_SECRET_LENGTH = 32;

const WEAK_VALUES = new Set(
	[
		'change-me',
		'change-me-to-a-long-random-string',
		'password',
		'admin',
		'planner',
		'secret',
		'12345678',
		'1234567890',
		'qwerty',
		'letmein',
	].map((value) => value.toLowerCase()),
);

function isBlockedWeakValue(value: string): boolean {
	return WEAK_VALUES.has(value.trim().toLowerCase());
}

function validateSessionSecret(sessionSecret: string): string[] {
	const errors: string[] = [];

	if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
		errors.push(
			`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters (currently ${sessionSecret.length}).`,
		);
	}

	if (isBlockedWeakValue(sessionSecret)) {
		errors.push('SESSION_SECRET is a known weak or placeholder value.');
	}

	return errors;
}

/** Refuses to start the server in production when auth secrets are too weak. */
export function assertProductionSecrets(sessionSecret: string, authFilePath: string): void {
	if (!import.meta.env.PROD) {
		return;
	}

	const errors = [
		...validateSessionSecret(sessionSecret),
		...validateAuthUsersForProduction(authFilePath),
	];

	if (errors.length === 0) {
		return;
	}

	throw new Error(
		['Refusing to start: invalid auth configuration', ...errors.map((error) => `- ${error}`)].join('\n'),
	);
}
