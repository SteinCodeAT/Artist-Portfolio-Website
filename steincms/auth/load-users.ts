import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { z } from 'zod';
import { isValidPasswordHashFormat } from './password-hash.ts';

const userRecordSchema = z.object({
	email: z.email(),
	password_hash: z.string().min(1),
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	role: z.string().min(1),
	status: z.enum(['active', 'inactive']),
});

const authFileSchema = z.record(z.string(), userRecordSchema);

export type AuthUser = {
	username: string;
	email: string;
	passwordHash: string;
	firstName: string;
	lastName: string;
	role: string;
	status: 'active' | 'inactive';
};

export function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

export function resolveAuthFilePath(authFile = 'auth.yaml'): string {
	return path.isAbsolute(authFile) ? authFile : path.resolve(process.cwd(), authFile);
}

function parseAuthFile(content: string): Map<string, AuthUser> {
	const raw = loadYaml(content);
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error('auth.yaml must be a YAML mapping of usernames to user records.');
	}

	const parsed = authFileSchema.safeParse(raw);
	if (!parsed.success) {
		const message = parsed.error.issues.map((issue) => issue.message).join('; ');
		throw new Error(`Invalid auth.yaml: ${message}`);
	}

	const users = new Map<string, AuthUser>();
	for (const [usernameKey, record] of Object.entries(parsed.data)) {
		const username = normalizeUsername(usernameKey);
		if (!username) {
			throw new Error('auth.yaml contains an empty username key.');
		}
		if (users.has(username)) {
			throw new Error(`auth.yaml contains duplicate username "${username}".`);
		}

		users.set(username, {
			username,
			email: record.email,
			passwordHash: record.password_hash,
			firstName: record.first_name,
			lastName: record.last_name,
			role: record.role,
			status: record.status,
		});
	}

	return users;
}

let cachedUsers: Map<string, AuthUser> | null = null;
let cachedAuthFilePath: string | null = null;

export function loadAuthUsers(authFilePath: string): Map<string, AuthUser> {
	const resolved = resolveAuthFilePath(authFilePath);
	if (cachedUsers && cachedAuthFilePath === resolved) {
		return cachedUsers;
	}

	if (!fs.existsSync(resolved)) {
		throw new Error(`Auth file not found: ${resolved}`);
	}

	const content = fs.readFileSync(resolved, 'utf8');
	cachedUsers = parseAuthFile(content);
	cachedAuthFilePath = resolved;
	return cachedUsers;
}

export function getAuthUser(username: string, authFilePath: string): AuthUser | undefined {
	return loadAuthUsers(authFilePath).get(normalizeUsername(username));
}

export function validateAuthUsersForProduction(authFilePath: string): string[] {
	const resolved = resolveAuthFilePath(authFilePath);
	const errors: string[] = [];

	if (!fs.existsSync(resolved)) {
		errors.push(`Auth file not found: ${resolved}`);
		return errors;
	}

	const content = fs.readFileSync(resolved, 'utf8');
	const raw = loadYaml(content);
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		for (const [usernameKey, record] of Object.entries(raw as Record<string, unknown>)) {
			if (record && typeof record === 'object' && 'password' in record) {
				errors.push(
					`User "${usernameKey}" uses plaintext "password" — use password_hash (npm run hash_password).`,
				);
			}
		}
	}

	let users: Map<string, AuthUser>;
	try {
		users = parseAuthFile(content);
	} catch (error) {
		errors.push(error instanceof Error ? error.message : 'Invalid auth.yaml.');
		return errors;
	}

	if (users.size === 0) {
		errors.push('auth.yaml must define at least one user.');
	}

	const activeUsers = [...users.values()].filter((user) => user.status === 'active');
	if (activeUsers.length === 0) {
		errors.push('auth.yaml must have at least one active user.');
	}

	for (const user of users.values()) {
		if (!isValidPasswordHashFormat(user.passwordHash)) {
			errors.push(`User "${user.username}" has invalid password_hash format.`);
		}
	}

	return errors;
}
