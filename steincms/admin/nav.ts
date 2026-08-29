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
};

export type AdminPaths = {
	base: string;
	dashboard: string;
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

export function buildAdminNav(
	siteConfig: AdminNavSiteConfig,
	contentSchema: ContentSchemaRegistry,
	paths: AdminPaths = buildAdminPaths(siteConfig.admin.path, contentSchema),
): AdminNavItem[] {
	const items: AdminNavItem[] = [
		{
			id: 'home',
			label: 'Start',
			href: paths.dashboard,
			title: 'Dashboard',
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
			label: 'Seiten',
			href: paths.staticPages,
			title: 'Statische Seiten',
			icon: 'pages',
		});
	}

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
		return 'statische-seiten';
	}

	const match = nav
		.filter(
			(item) => normalized === item.href || normalized.startsWith(`${item.href}/`),
		)
		.sort((a, b) => b.href.length - a.href.length)[0];

	return match?.id ?? 'home';
}
