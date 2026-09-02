import type { AstroGlobal } from 'astro';
import {
	createLoginCsrfToken,
	createSessionToken,
	isValidLoginCsrfToken,
	LOGIN_CSRF_FIELD,
	safeInternRedirect,
	SESSION_COOKIE,
	SESSION_MAX_AGE_SEC,
	sessionCookieOptions,
	normalizeUsername,
	verifyCredentials,
} from '@steincms/auth/admin-auth';
import { BAIT_CANDIDATES } from '@steincms/cms/forms/form-token';

export type AdminLoginPageProps = {
	lang: string;
	pageTitle: string;
	heading: string;
	subtitle: string;
	logoSrc?: string;
	accentColor?: string;
	accentColorDark?: string;
	backgroundColor?: string;
	next: string;
	csrfToken: string;
	csrfFieldName: string;
	error?: string | null;
	usernameLabel?: string;
	passwordLabel?: string;
	submitLabel?: string;
	invalidCredentialsError?: string;
	sessionExpiredError?: string;
	tooManyAttemptsError?: string;
};

export type AdminLoginSiteConfig = {
	name: string;
	lang: string;
	admin: { path: string; title: string };
	theme: {
		colors: {
			accent: string;
			accentDark: string;
			bgSecondary: string;
		};
	};
};

export type AdminLoginRouteResult =
	| { redirect: string }
	| { forbidden: true }
	| { view: AdminLoginPageProps };

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginHits = new Map<string, number[]>();

function clientIp(request: Request): string {
	return (
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}

function pruneLoginHits(now: number): void {
	for (const [ip, times] of loginHits) {
		const recent = times.filter((t) => now - t < LOGIN_WINDOW_MS);
		if (recent.length === 0) {
			loginHits.delete(ip);
		} else {
			loginHits.set(ip, recent);
		}
	}
}

function tooManyLogins(ip: string): boolean {
	const now = Date.now();
	pruneLoginHits(now);
	const recent = (loginHits.get(ip) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
	if (recent.length >= LOGIN_MAX_ATTEMPTS) {
		loginHits.set(ip, recent);
		return true;
	}
	loginHits.set(ip, [...recent, now]);
	return false;
}

function setSecurityHeaders(astro: AstroGlobal): void {
	astro.response.headers.set('Cache-Control', 'no-store');
	astro.response.headers.set('X-Frame-Options', 'DENY');
	astro.response.headers.set('Referrer-Policy', 'no-referrer');
}

type AdminLoginLabelOverrides = Partial<
	Pick<
		AdminLoginPageProps,
		| 'usernameLabel'
		| 'passwordLabel'
		| 'submitLabel'
		| 'invalidCredentialsError'
		| 'sessionExpiredError'
		| 'tooManyAttemptsError'
	>
>;

function buildViewProps(
	siteConfig: AdminLoginSiteConfig,
	logoSrc: string,
	opts: {
		next: string;
		csrfToken: string;
		error?: string | null;
		subtitle?: string;
		labels?: AdminLoginLabelOverrides;
	},
): AdminLoginPageProps {
	return {
		lang: siteConfig.lang,
		pageTitle: `Admin Login · ${siteConfig.name}`,
		heading: siteConfig.admin.title,
		subtitle: opts.subtitle ?? 'Interner Bereich für Veranstaltungen.',
		logoSrc,
		accentColor: siteConfig.theme.colors.accent,
		accentColorDark: siteConfig.theme.colors.accentDark,
		backgroundColor: siteConfig.theme.colors.bgSecondary,
		next: opts.next,
		csrfToken: opts.csrfToken,
		csrfFieldName: LOGIN_CSRF_FIELD,
		error: opts.error ?? null,
		...opts.labels,
	};
}

function adminBaitFilled(data: FormData): boolean {
	for (const name of BAIT_CANDIDATES) {
		if (String(data.get(name) ?? '').trim()) {
			return true;
		}
	}
	return false;
}

export async function handleAdminLoginRoute(
	astro: AstroGlobal,
	opts: {
		siteConfig: AdminLoginSiteConfig;
		logoSrc: string;
		subtitle?: string;
		labels?: AdminLoginLabelOverrides;
	},
): Promise<AdminLoginRouteResult> {
	const { siteConfig, logoSrc, subtitle, labels } = opts;
	const adminPath = siteConfig.admin.path;

	let error: string | null = astro.url.searchParams.get('error');
	let next = safeInternRedirect(astro.url.searchParams.get('next'), adminPath);

	if (astro.request.method === 'POST') {
		const data = await astro.request.formData();
		next = safeInternRedirect(String(data.get('next') ?? ''), adminPath);

		if (tooManyLogins(clientIp(astro.request))) {
			error = 'rate';
			astro.response.status = 429;
		} else {
			const csrfToken = String(data.get(LOGIN_CSRF_FIELD) ?? '');
			if (!isValidLoginCsrfToken(csrfToken)) {
				error = 'csrf';
				// This is usally caused by a stale login page. Do not return 401 but just a new login page.
				astro.response.status = 200;
			} else {
				if (adminBaitFilled(data)) {
					return { forbidden: true };
				}
				const username = normalizeUsername(String(data.get('username') ?? ''));
				const password = String(data.get('password') ?? '');
				if (!verifyCredentials(username, password)) {
					error = '1';
					astro.response.status = 401;
				} else {
					astro.cookies.set(
						SESSION_COOKIE,
						createSessionToken(username),
						sessionCookieOptions(SESSION_MAX_AGE_SEC),
					);
					setSecurityHeaders(astro);
					return { redirect: new URL(next, astro.url).href };
				}
			}
		}
	}

	const csrfToken = createLoginCsrfToken();
	setSecurityHeaders(astro);
	return {
		view: buildViewProps(siteConfig, logoSrc, { next, csrfToken, error, subtitle, labels }),
	};
}
