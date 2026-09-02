// puporse: build the admin navigation menu based on the site config and the content schema
import type { AdminNavItem } from './types/admin-nav';
import type { ContentSchemaRegistry } from '@steincms/cms/schema';
import {
	findEventsCollection,
	findPostsCollection,
	iterateSingletons,
} from '@steincms/cms/schema';

export type AdminNavSiteConfig = {
	admin: { path: string };
	features?: { events?: boolean; blog?: boolean };
	analytics?: {
		enabled: boolean;
		identificationCode?: string;
		dashboardEmbedUrl?: string;
	};
};

export type AdminPaths = {
	base: string;
	dashboard: string;
	analytics: string;
	login: string;
	calendar: string;
	posts: string;
	editor: string;
	staticPages: string;
	singletons: Record<string, string>;
};

export type StaticPageEntry = {
	id: string;
	label: string;
	href: string;
};

const DEFAULT_EVENTS_LIST = 'beitraege-manager';
const DEFAULT_EVENTS_CALENDAR = 'veranstaltungen-manager';
const STATIC_PAGES_SEGMENT = 'statische-seiten';

export function buildAdminPaths(
	adminPath: string,
	contentSchema: ContentSchemaRegistry,
): AdminPaths {
	const events = findEventsCollection(contentSchema);
	const eventsRoutes = events?.def.admin.routes ?? {};
	const listSegment = eventsRoutes.list ?? DEFAULT_EVENTS_LIST;
	const calendarSegment = eventsRoutes.calendar ?? DEFAULT_EVENTS_CALENDAR;

	const singletons: Record<string, string> = {};
	for (const { id, def } of iterateSingletons(contentSchema)) {
		if (def.admin.route) {
			singletons[id] = `${adminPath}/${def.admin.route}`;
		}
	}

	return {
		base: adminPath,
		dashboard: adminPath,
		analytics: `${adminPath}/statistiken`,
		login: `${adminPath}/login`,
		calendar: `${adminPath}/${calendarSegment}`,
		posts: `${adminPath}/${listSegment}`,
		editor: `${adminPath}/${listSegment}/bearbeiten`,
		staticPages: `${adminPath}/${STATIC_PAGES_SEGMENT}`,
		singletons,
	};
}

export function listStaticPageEntries(
	contentSchema: ContentSchemaRegistry,
	paths: AdminPaths,
): StaticPageEntry[] {
	return iterateSingletons(contentSchema)
		.filter(({ def }) => def.admin.route)
		.map(({ id, def }) => ({
			id,
			label: def.admin.label ?? id,
			href: paths.singletons[id] ?? `${paths.base}/${def.admin.route}`,
		}))
		.sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

export type AdminNavLabels = {
	home?: { label: string; title: string };
	staticPages?: { label: string; title: string };
	analytics?: { label: string; title: string };
};

const DEFAULT_NAV_LABELS: Required<AdminNavLabels> = {
	home: { label: 'Start', title: 'Dashboard' },
	staticPages: { label: 'Seiten', title: 'Statische Seiten' },
	analytics: { label: 'Visitor Stats', title: 'Visitor Stats' },
};

export function buildAdminNav(
	siteConfig: AdminNavSiteConfig,
	contentSchema: ContentSchemaRegistry,
	paths: AdminPaths = buildAdminPaths(siteConfig.admin.path, contentSchema),
	labels: AdminNavLabels = {},
): AdminNavItem[] {
	const home = labels.home ?? DEFAULT_NAV_LABELS.home;
	const staticPages = labels.staticPages ?? DEFAULT_NAV_LABELS.staticPages;
	const analytics = labels.analytics ?? DEFAULT_NAV_LABELS.analytics;
	const items: AdminNavItem[] = [
		{
			id: 'home',
			label: home.label,
			href: paths.dashboard,
			title: home.title,
			icon: 'home',
		},
	];

	const events = findEventsCollection(contentSchema);
	if (events && siteConfig.features?.events !== false) {
		items.push(
			{
				id: 'calendar',
				label: 'Kalender',
				href: paths.calendar,
				title: 'Kalender',
				icon: 'calendar',
			},
			{
				id: 'posts',
				label: 'Beiträge',
				href: paths.posts,
				title: 'Beiträge',
				icon: 'posts',
			},
		);
	}

	const posts = findPostsCollection(contentSchema);
	const postsRoute = posts?.def.admin.route;
	if (posts && postsRoute && siteConfig.features?.blog) {
		items.push({
			id: 'blog',
			label: posts.def.admin.label ?? 'Blog',
			href: `${paths.base}/${postsRoute}`,
			title: posts.def.admin.label ?? 'Blog',
			icon: 'file',
		});
	}

	if (listStaticPageEntries(contentSchema, paths).length > 0) {
		items.push({
			id: 'static-pages',
			label: staticPages.label,
			href: paths.staticPages,
			title: staticPages.title,
			icon: 'pages',
		});
	}

	// Always shown, even when not purchased/enabled — the page itself renders
	// an upsell instead of the real dashboard in that case.
	items.push({
		id: 'analytics',
		label: analytics.label,
		href: paths.analytics,
		title: analytics.title,
		icon: 'chart-line',
		...(siteConfig.analytics?.enabled ? {} : { badge: 'PRO' }),
	});
	return items;
}

function isStaticPagesPath(pathname: string, adminPaths?: AdminPaths): boolean {
	if (!adminPaths) return false;

	const normalized = pathname.replace(/\/$/, '') || '/';
	if (
		normalized === adminPaths.staticPages ||
		normalized.startsWith(`${adminPaths.staticPages}/`)
	) {
		return true;
	}

	return Object.values(adminPaths.singletons).some(
		(href) => normalized === href || normalized.startsWith(`${href}/`),
	);
}

/** Resolve sidebar highlight from explicit override or current admin URL. */
export function resolveActiveSection(
	pathname: string,
	nav: AdminNavItem[],
	explicit?: string,
	adminPaths?: AdminPaths,
): string {
	if (explicit) return explicit;

	const normalized = pathname.replace(/\/$/, '') || '/';
	if (isStaticPagesPath(normalized, adminPaths)) {
		// Must match the nav item's own id (buildAdminNav pushes id: 'static-pages')
		// for sidebar highlighting to actually apply.
		return 'static-pages';
	}

	const match = nav
		.filter(
			(item) => normalized === item.href || normalized.startsWith(`${item.href}/`),
		)
		.sort((a, b) => b.href.length - a.href.length)[0];

	return match?.id ?? 'home';
}
