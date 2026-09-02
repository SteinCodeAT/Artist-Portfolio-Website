/**
 * Project content model — defines fields, collections, singletons.
 * After changes: npm run db:sync-schema && npm run db:generate && npm run db:migrate
 */
import { z } from 'zod';
import {
	contentBlockList,
	defineListCollection,
	defineRecord,
	defineSingleton,
	enumField,
	idField,
	isoTimestampField,
	mediaUrlField,
	slugField,
	stringListField,
	textField,
	type ContentSchemaRegistry,
} from '@steincms/cms/schema';

// ---- projects (reuses the posts collection type — see site.config.ts note) --
//
// Field set here is intentionally exactly what steincms/cms/posts/posts-store.ts
// and posts-store.database.ts already read/write (id, slug, title, description,
// mainImage, blocks, status, publishedAt, createdAt, updatedAt) — zero adapter
// code needed for this to work end to end. Extra project-specific fields (year,
// medium, hue, a video embed URL, display order) are a deliberate follow-up:
// each one needs a matching line added in both of those hand-written files
// (see steincms/DATABASE.md, "Day-to-day … If the new field must appear in
// admin read/write").
const projectRecord = defineRecord({
	fields: {
		id: idField(),
		slug: slugField(),
		title: textField({ required: true, label: 'Title' }),
		// Short blurb — used as the Signal TV channel description, the
		// subpage intro, and the SEO description meta tag.
		description: textField({ required: true, rows: 3, label: 'Description' }),
		mainImage: mediaUrlField({ nullable: true, label: 'Cover Image' }),
		blocks: contentBlockList({
			types: ['text', 'image', 'gallery'],
			label: 'Body',
			group: 'content',
		}),
		year: textField({ optional: true, label: 'Year' }),
		status: enumField(['draft', 'published'], { label: 'Status' }),
		publishedAt: isoTimestampField({ nullable: true, label: 'Published At' }),
		createdAt: isoTimestampField({ label: 'Created At' }),
		updatedAt: isoTimestampField({ label: 'Updated At' }),
	},
});

export type ProjectRecord = z.infer<typeof projectRecord.schema>;

// ---- about (singleton) -------------------------------------------------------

const aboutRecord = defineRecord({
	fields: {
		bio: textField({ required: true, rows: 10, label: 'Bio' }),
		//photo: mediaUrlField({ nullable: true, label: 'Portrait Photo' }),
		instagramUrl: textField({ optional: true, label: 'Instagram URL' }),
		instagramHandle: textField({ optional: true, label: 'Instagram Handle' }),
		email: textField({ optional: true, label: 'Contact Email' }),
		// One exhibition per line: "Year | Title | Organization | Location | URL"
		// (URL optional, trailing). Parsed in ArtistCV.astro. A plain textarea
		// beats a real repeater field here — no new schema plumbing needed for v1.
		exhibitions: stringListField({ label: 'Exhibitions (Year | Title | Organization | Location | URL)' }),
	},
});

export type AboutContent = z.infer<typeof aboutRecord.schema>;

export const contentSchema = {
	// Registry key MUST stay "posts" — steincms/cms/posts/posts-store.database.ts
	// hard-codes requireTable(database, 'posts') to find its SQLite table, so
	// db:sync-schema has to generate a table literally named "posts". The
	// admin.label below is what the artist actually sees ("Projects").
	posts: defineListCollection({
		record: projectRecord,
		media: 'projects',
		admin: {
			editor: 'post-blocks',
			label: 'Projects',
			route: 'projects-manager',
		},
	}),
	about: defineSingleton({
		record: aboutRecord,
		admin: { editor: 'custom', label: 'About', route: 'statische-seiten/about' },
	}),
} satisfies ContentSchemaRegistry;
