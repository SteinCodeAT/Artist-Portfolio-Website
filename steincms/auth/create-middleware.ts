import { defineMiddleware } from 'astro:middleware';
import {
	isAuthorizedRequest,
	isPublicApiPath,
	publicInternPaths,
	unauthorizedJsonResponse,
} from './admin-auth.ts';

export type AuthMiddlewareOptions = {
	adminPath: string;
	publicApiPaths?: Iterable<string>;
};

export function createAuthMiddleware(adminPathOrOptions: string | AuthMiddlewareOptions) {
	const options =
		typeof adminPathOrOptions === 'string'
			? { adminPath: adminPathOrOptions }
			: adminPathOrOptions;
	const { adminPath } = options;
	const publicIntern = publicInternPaths(adminPath);
	const extraPublicApi = options.publicApiPaths;

	return defineMiddleware(async (context, next) => {
		const pathname = new URL(context.request.url).pathname;

		if (pathname.startsWith(adminPath) && !publicIntern.has(pathname)) {
			if (!isAuthorizedRequest(context.request)) {
				const nextUrl = `${pathname}${new URL(context.request.url).search}`;
				return context.redirect(
					`${adminPath}/login?next=${encodeURIComponent(nextUrl)}`,
				);
			}
		}

		if (pathname.startsWith('/api/') && !isPublicApiPath(pathname, extraPublicApi)) {
			if (!isAuthorizedRequest(context.request)) {
				return unauthorizedJsonResponse();
			}
		}

		return next();
	});
}
