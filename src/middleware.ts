import { createAuthMiddleware } from '@steincms/auth/create-middleware';
import { cms } from './cms';

export const onRequest = createAuthMiddleware({
	adminPath: cms.siteConfig.admin.path,
	publicApiPaths: cms.publicApiPaths,
});
