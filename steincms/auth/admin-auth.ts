import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AUTH_FILE, SESSION_SECRET } from 'astro:env/server';
import { getAuthUser, loadAuthUsers, normalizeUsername } from './load-users.ts';
import { verifyPassword } from './password-hash.ts';
import { assertProductionSecrets } from './validate-secrets.ts';

const DEFAULT_AUTH_FILE = 'auth.yaml';

let secretsValidated = false;

function authFilePath(): string {
	return AUTH_FILE ?? DEFAULT_AUTH_FILE;
}

function ensureProductionSecrets(): void {
	if (secretsValidated || !import.meta.env.PROD) {
		return;
	}
	assertProductionSecrets(SESSION_SECRET, authFilePath());
	secretsValidated = true;
}

export const SESSION_COOKIE = 'planner-session';
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;
export const LOGIN_CSRF_FIELD = 'csrf-token';
const LOGIN_CSRF_MAX_AGE_SEC = 60 * 60;

export const PUBLIC_API_PATHS = new Set([
	'/api/logout',
	'/api/register-event',
]);

export function normalizeApiPath(pathname: string): string {
	return pathname.replace(/\/+$/, '') || '/';
}

/** True for public API routes (trailing slash ignored). */
export function isPublicApiPath(pathname: string, extra?: Iterable<string>): boolean {
	const normalized = normalizeApiPath(pathname);
	if (PUBLIC_API_PATHS.has(normalized)) {
		return true;
	}
	if (!extra) {
		return false;
	}
	for (const candidate of extra) {
		if (normalizeApiPath(candidate) === normalized) {
			return true;
		}
	}
	return false;
}

export function sessionCookieOptions(maxAge: number) {
	return {
		httpOnly: true,
		sameSite: 'lax' as const,
		path: '/',
		maxAge,
		secure: import.meta.env.PROD,
	};
}

export { normalizeUsername };

export function publicInternPaths(adminPath: string): Set<string> {
	return new Set([`${adminPath}/login`]);
}

export function verifyCredentials(username: string, password: string): boolean {
	ensureProductionSecrets();

	const normalized = normalizeUsername(username);
	const user = getAuthUser(normalized, authFilePath());
	if (!user || user.status !== 'active') {
		return false;
	}

	return verifyPassword(password, user.passwordHash);
}

export function createLoginCsrfToken(): string {
	const nonce = randomBytes(16).toString('base64url');
	const expiresAt = Date.now() + LOGIN_CSRF_MAX_AGE_SEC * 1000;
	const payload = `login-csrf:${nonce}:${expiresAt}`;
	const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
	return `${nonce}.${expiresAt}.${signature}`;
}

export function isValidLoginCsrfToken(token: string | null | undefined): boolean {
	if (!token) {
		return false;
	}

	const firstDot = token.indexOf('.');
	const secondDot = token.indexOf('.', firstDot + 1);
	if (firstDot === -1 || secondDot === -1) {
		return false;
	}

	const nonce = token.slice(0, firstDot);
	const expiresAt = Number(token.slice(firstDot + 1, secondDot));
	const signature = token.slice(secondDot + 1);
	if (!nonce || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
		return false;
	}

	const payload = `login-csrf:${nonce}:${expiresAt}`;
	const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

	if (expected.length !== signature.length) {
		return false;
	}

	return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function createSessionToken(username: string): string {
	const normalized = normalizeUsername(username);
	const expiresAt = Date.now() + SESSION_MAX_AGE_SEC * 1000;
	const payload = `${normalized}:${expiresAt}`;
	const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
	return `${normalized}.${expiresAt}.${signature}`;
}

function parseSessionToken(token: string | null | undefined): string | null {
	if (token) {
		ensureProductionSecrets();
	}
	if (!token) {
		return null;
	}

	const firstDot = token.indexOf('.');
	const secondDot = token.indexOf('.', firstDot + 1);
	if (firstDot === -1 || secondDot === -1) {
		return null;
	}

	const username = token.slice(0, firstDot);
	const expiresAt = Number(token.slice(firstDot + 1, secondDot));
	const signature = token.slice(secondDot + 1);
	if (!username || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
		return null;
	}

	const payload = `${username}:${expiresAt}`;
	const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

	if (expected.length !== signature.length) {
		return null;
	}

	if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
		return null;
	}

	const user = getAuthUser(username, authFilePath());
	if (!user || user.status !== 'active') {
		return null;
	}

	return username;
}

export function isValidSessionToken(token: string | null | undefined): boolean {
	return parseSessionToken(token) !== null;
}

function getSessionToken(request: Request): string | null {
	const cookieHeader = request.headers.get('cookie');
	if (!cookieHeader) {
		return null;
	}

	for (const part of cookieHeader.split(';')) {
		const [name, ...valueParts] = part.trim().split('=');
		if (name === SESSION_COOKIE) {
			return decodeURIComponent(valueParts.join('='));
		}
	}

	return null;
}

export function isAuthorizedRequest(request: Request): boolean {
	return parseSessionToken(getSessionToken(request)) !== null;
}

export function getAuthenticatedUsername(request: Request): string | null {
	return parseSessionToken(getSessionToken(request));
}

export function unauthorizedResponse(contentType = 'text/plain; charset=utf-8'): Response {
	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'Content-Type': contentType,
		},
	});
}

export function unauthorizedJsonResponse(): Response {
	return new Response(JSON.stringify({ error: 'Unauthorized' }), {
		status: 401,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}

export function safeInternRedirect(next: string | null | undefined, adminPath: string): string {
	const loginPath = `${adminPath}/login`;
	const dashboardPath = adminPath;
	const calendarPath = `${adminPath}/veranstaltungen-manager`;
	const internPrefix = `${adminPath}/`;

	if (next === loginPath) {
		return calendarPath;
	}
	if (next === dashboardPath || (next && next.startsWith(internPrefix))) {
		return next;
	}
	return calendarPath;
}

export function loginPath(adminPath: string): string {
	return `${adminPath}/login`;
}

export function eventsManagerPath(adminPath: string): string {
	return `${adminPath}/veranstaltungen-manager`;
}

// Eagerly load users so missing auth.yaml fails fast at startup.
loadAuthUsers(authFilePath());
