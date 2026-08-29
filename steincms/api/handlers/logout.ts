import type { APIRoute } from 'astro';
import { SESSION_COOKIE, sessionCookieOptions } from '@steincms/auth/admin-auth';

export function createLogoutHandler(adminPath: string): APIRoute {
	return async ({ cookies, redirect }) => {
		cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
		return redirect(`${adminPath}/login`);
	};
}
