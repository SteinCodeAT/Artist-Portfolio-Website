import {
	findEventsCollection,
	findPostsCollection,
	hasFieldKind,
	iterateSingletons,
	type ContentSchemaRegistry,
} from '@steincms/cms/schema';

export type CmsSiteConfig = {
	name: string;
	baseUrl: string;
	lang?: string;
	admin: { path: string; title: string };
	features?: { events?: boolean; blog?: boolean };
	events?: {
		categories: Record<string, { label: string; tone: string }>;
		publicPath: string;
		mediaPath?: string;
		registrationEmail?: string;
	};
	blog?: {
		publicPath: string;
		mediaPath?: string;
	};
	media: {
		root: string;
		urlPrefix: string;
		draftPrefix: string;
	};
	cms: {
		expectedSteinCMSVersion: string;
	};
	registrations?: {
		dir?: string;
		ticketPrefix?: string;
		ticketPathPrefix?: string;
		excludeCategories?: string[];
		maxGuests?: number;
	};
};

export function listCmsApiRoutes(
	siteConfig: CmsSiteConfig,
	contentSchema: ContentSchemaRegistry,
): Array<{ pattern: string; fileName: string }> {
	const routes: Array<{ pattern: string; fileName: string }> = [
		{ pattern: '/api/logout', fileName: 'logout.ts' },
		{ pattern: '/api/upload-image', fileName: 'upload-image.ts' },
	];

	const events = findEventsCollection(contentSchema);
	const posts = findPostsCollection(contentSchema);
	const eventsEnabled = Boolean(events) && siteConfig.features?.events !== false;
	const postsEnabled = Boolean(posts) && siteConfig.features?.blog !== false;

	if (eventsEnabled) {
		routes.push({ pattern: '/api/update-events', fileName: 'update-events.ts' });
	}
	if (postsEnabled) {
		routes.push({ pattern: '/api/posts', fileName: 'posts.ts' });
	}
	if (iterateSingletons(contentSchema).length > 0) {
		routes.push({ pattern: '/api/content/[collection]', fileName: 'content-collection.ts' });
	}
	if (eventsEnabled && events && hasFieldKind(events.def.record, 'registrationForm')) {
		routes.push({ pattern: '/api/register-event', fileName: 'register-event.ts' });
		routes.push({ pattern: '/api/clear-registrations', fileName: 'clear-registrations.ts' });
	}

	return routes;
}
