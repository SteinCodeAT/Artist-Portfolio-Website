/**
 * CMS factory (template). Wires stores, API handlers, and admin nav.
 * Project passes: siteConfig, contentSchema, database (from src/db/cms-database.ts).
 */
import path from 'node:path';
import type { APIRoute } from 'astro';
import { createEventsHandler } from '@steincms/api/handlers/events';
import { createPostsHandler } from '@steincms/api/handlers/posts';
import { createUploadImageHandler } from '@steincms/api/handlers/upload-image';
import { createLogoutHandler } from '@steincms/api/handlers/logout';
import { createCollectionContentHandler } from '@steincms/api/handlers/collection-content';
import { createRegisterEventHandler } from '@steincms/api/handlers/register-event';
import { createClearRegistrationsHandler } from '@steincms/api/handlers/clear-registrations';
import { buildAdminNav, buildAdminPaths, type AdminPaths } from '@steincms/admin/nav';
import type { AdminNavItem } from '@steincms/admin/types/admin-nav';
import { createMediaConfig, type MediaConfig } from '@steincms/cms/media/media-store';

import type { CmsDatabase } from '@steincms/cms/storage/db-contract';
import { createEventsStoreWithDatabase } from '@steincms/cms/events/events-store.database';
import { createPostsStoreWithDatabase } from '@steincms/cms/posts/posts-store.database';
import { createActivityLogStoreWithDatabase } from '@steincms/cms/activity-log.database';
import {
	createRegistrationsStoreWithDatabase,
	type RegistrationsStore,
} from '@steincms/cms/events/registrations-store.database';


import {
	findEventsCollection,
	findPostsCollection,
	hasFieldKind,
	iterateSingletons,
	type ContentSchemaRegistry,
} from '@steincms/cms/schema';
import { type CmsSiteConfig } from './cms-config';

export type { CmsSiteConfig } from './cms-config';
export { listCmsApiRoutes } from './cms-config';

export type CreateCmsOptions = {
	siteConfig: CmsSiteConfig;
	contentSchema: ContentSchemaRegistry;
	database: CmsDatabase;           // required — project passes cmsDatabase
	projectRoot?: string;
};

/** Stable per-collection path used only to serialize concurrent writes — see core/file-store.ts. Independent of any JSON import source. */
function collectionLockPath(projectRoot: string, collectionId: string): string {
	return path.join(projectRoot, 'data', 'locks', `${collectionId}.lock`);
}

function hasRegistrationField(contentSchema: ContentSchemaRegistry): boolean {
	const events = findEventsCollection(contentSchema);
	return Boolean(events && hasFieldKind(events.def.record, 'registrationForm'));
}

type ApiRouteHandlers<M extends string> = { [K in M]: APIRoute };

export type CmsHandlers = {
	events: ApiRouteHandlers<'GET' | 'POST' | 'PUT' | 'DELETE'> | null;
	posts: ApiRouteHandlers<'POST' | 'PUT' | 'DELETE'> | null;
	upload: APIRoute;
	logout: APIRoute;
	content: ApiRouteHandlers<'GET' | 'POST'> | null;
	registerEvent: ApiRouteHandlers<'POST'> | null;
	clearRegistrations: ApiRouteHandlers<'POST'> | null;
};

export type CmsInstance = {
	siteConfig: CmsSiteConfig;
	contentSchema: ContentSchemaRegistry;
	mediaConfig: MediaConfig;
	eventsStore: ReturnType<typeof createEventsStoreWithDatabase> | null;
	postsStore: ReturnType<typeof createPostsStoreWithDatabase> | null;
	registrations: RegistrationsStore | null;
	activityLog: ReturnType<typeof createActivityLogStoreWithDatabase>;
	adminPaths: AdminPaths;
	nav: AdminNavItem[];
	handlers: CmsHandlers;
	publicApiPaths: string[];
	eventsPublicPath: string;
	eventHref: (slug: string) => string;
};

export function createCms(options: CreateCmsOptions): CmsInstance {
	const { siteConfig, contentSchema, database } = options;
	const projectRoot = options.projectRoot ?? process.cwd();
	const mediaConfig = createMediaConfig({
		...siteConfig.media,
		root: process.env.MEDIA_ROOT ?? siteConfig.media.root,
	});

	const eventsCollection = findEventsCollection(contentSchema);
	const postsCollection = findPostsCollection(contentSchema);
	const eventsEnabled = Boolean(eventsCollection) && siteConfig.features?.events !== false;
	const postsEnabled = Boolean(postsCollection) && siteConfig.features?.blog !== false;

	if (eventsEnabled && !siteConfig.events) {
		throw new Error('siteConfig.events is required when an events collection is registered');
	}

	const eventsStore =
		eventsEnabled && eventsCollection && siteConfig.events
			? createEventsStoreWithDatabase({
					lockFilePath: collectionLockPath(projectRoot, eventsCollection.id),
					baseUrl: siteConfig.baseUrl,
					publicPath: siteConfig.events.publicPath,

					categories: siteConfig.events.categories,
					mediaConfig,
				},
				database)
			: null;

	const postsStore =
		postsEnabled && postsCollection
			? createPostsStoreWithDatabase(
				{
					lockFilePath: collectionLockPath(projectRoot, postsCollection.id),
					mediaConfig,
				},
				database)
			: null;

	const registrationsEnabled = eventsStore && hasRegistrationField(contentSchema);
	const registrations = registrationsEnabled
		? createRegistrationsStoreWithDatabase({
				ticketPrefix: siteConfig.registrations?.ticketPrefix ?? 'TK',
				ticketPathPrefix: siteConfig.registrations?.ticketPathPrefix,
			}, 
			database)
		: null;


	const adminPaths = buildAdminPaths(siteConfig.admin.path, contentSchema);
	const nav = buildAdminNav(siteConfig, contentSchema, adminPaths);
	const eventsPublicPath = siteConfig.events?.publicPath ?? '/events';
	const activityLog = createActivityLogStoreWithDatabase(database);
	const eventEditorHref = (id: string) =>
		`${adminPaths.editor}?id=${encodeURIComponent(id)}`;

	const eventsHandlerConfig = eventsCollection
		? {
				adminPath: siteConfig.admin.path,
				calendarPath: adminPaths.calendar,
				listPath: adminPaths.posts,
			}
		: null;
	
	// handlers: events, posts, upload, logout, content, registerEvent, clearRegistrations
	const handlers: CmsHandlers = {
		events:
			eventsStore && eventsHandlerConfig
				? createEventsHandler(eventsStore, eventsHandlerConfig, { activityLog })
				: null,
		posts: postsStore
			? createPostsHandler(postsStore, { activityLog })
			: null,
		upload: createUploadImageHandler(mediaConfig),
		logout: createLogoutHandler(siteConfig.admin.path),
		content:
			iterateSingletons(contentSchema).length > 0
				? createCollectionContentHandler(contentSchema, {
					database,
					activityLog,
					pageHref: (collectionId) => adminPaths.singletons[collectionId],
					})
				: null,
		registerEvent:
			eventsStore && registrations
				? createRegisterEventHandler({
						findEventById: (id) => eventsStore.findEventById(id),
						registrations,
						excludeCategories: siteConfig.registrations?.excludeCategories,
					})
				: null,
		clearRegistrations:
			eventsStore && registrations
				? createClearRegistrationsHandler({
						findEventById: (id) => eventsStore.findEventById(id),
						registrations,
						activityLog,
						eventHref: eventEditorHref,
					})
				: null,
	};

	const publicApiPaths = ['/api/logout'];
	if (handlers.registerEvent) {
		publicApiPaths.push('/api/register-event');
	}

	return {
		siteConfig,
		contentSchema,
		mediaConfig,
		eventsStore,
		postsStore,
		registrations,
		activityLog,
		adminPaths,
		nav,
		handlers,
		publicApiPaths,
		eventsPublicPath,
		eventHref(slug: string) {
			return `${eventsPublicPath}/${slug}`;
		},
	};
}
