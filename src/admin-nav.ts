// English nav labels for the admin sidebar — steincms's buildAdminNav()
// defaults to German (see steincms/admin/nav.ts), so every admin page calls
// this instead of using `cms.nav` directly.
import { buildAdminNav, buildAdminPaths } from '@steincms/admin/nav';
import { cms } from './cms';
import { siteConfig } from './site.config';
import { contentSchema } from './content.schema';

export const adminPaths = buildAdminPaths(siteConfig.admin.path, contentSchema);

export const adminNav = buildAdminNav(cms.siteConfig, contentSchema, adminPaths, {
	home: { label: 'Home', title: 'Dashboard' },
	staticPages: { label: 'Pages', title: 'Site Pages' },
});

// Shared English text for AdminAreaLayout's other hardcoded-German props.
export const adminLayoutText = {
	lang: 'en',
	settingsLabel: 'Settings',
	logoutLabel: 'Log Out',
	loggedInAsLabel: 'Logged in as',
	navAriaLabel: 'Admin Navigation',
	mainAriaLabel: 'Admin Main Content',
};
