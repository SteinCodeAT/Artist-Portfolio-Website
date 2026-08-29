/**
 * Project content model — defines fields, collections, singletons.
 * After changes: npm run db:sync-schema && npm run db:generate && npm run db:migrate
 */
import { z } from 'zod';
import type { EventRecordBase } from '@steincms/cms/events/events-store';
import {
	contentBlockList,
	dateField,
	defineListCollection,
	defineRecord,
	defineSingleton,
	enumField,
	fieldGroup,
	idField,
	isoTimestampField,
	mediaUrlField,
	mediaUrlList,
	numberField,
	positiveNumberField,
	previewDraftField,
	registrationFormField,
	slugField,
	stringListField,
	textField,
	type ContentSchemaRegistry,
} from '@steincms/cms/schema';

const guanxiEventRecord = defineRecord({
	fields: {
		id: idField(),
		slug: slugField(),
		title: textField({ required: true, label: 'Titel' }),
		date: dateField({ nullable: true, label: 'Datum' }),
		location: textField({ nullable: true, optional: true, label: 'Ort' }),
		url: textField({ label: 'URL' }),
		year: numberField({ nullable: true, label: 'Jahr' }),
		category: textField({ label: 'Kategorie' }),
		excerpt: textField({ label: 'Auszug', rows: 3 }),
		cover: mediaUrlField({ nullable: true, label: 'Titelbild' }),
		photoCount: numberField({ label: 'Fotos' }),
		previewDraft: previewDraftField(),
		blocks: contentBlockList({
			types: ['text', 'image', 'table'],
			label: 'Artikelinhalt',
			group: 'content',
			optional: true,
		}),
		gallery: mediaUrlList({
			label: 'Veranstaltungsbilder',
			group: 'media',
		}),
		registrationForm: registrationFormField({
			label: 'Anmeldung',
			group: 'registration',
		}),
	},
});

const postRecord = defineRecord({
	fields: {
		id: idField(),
		slug: slugField(),
		title: textField({ required: true, label: 'Titel' }),
		description: textField({ label: 'Beschreibung', rows: 3 }),
		blocks: contentBlockList({
			types: ['text', 'image', 'gallery', 'table'],
			label: 'Artikelinhalt',
			group: 'content',
		}),
		status: enumField(['draft', 'published'], { label: 'Status' }),
		publishedAt: isoTimestampField({ nullable: true, label: 'Veröffentlicht am' }),
		createdAt: isoTimestampField({ label: 'Erstellt am' }),
		updatedAt: isoTimestampField({ label: 'Aktualisiert am' }),
	},
});

const membershipRecord = defineRecord({
	fields: {
		year: positiveNumberField({ int: true, label: 'Jahr' }),
		fee: fieldGroup({
			label: 'Beitrag',
			fields: {
				amount: positiveNumberField({ int: true, label: 'Betrag' }),
				currency: textField({ label: 'Währung' }),
			},
		}),
		iban: textField({ required: true, label: 'IBAN' }),
		recipient: textField({ required: true, label: 'Empfänger' }),
		benefits: stringListField({ minItems: 1, itemMin: 1, label: 'Vorteile' }),
		hero: fieldGroup({
			label: 'Hero',
			fields: {
				lead: textField({ required: true, label: 'Einleitung', rows: 3 }),
			},
		}),
		invite: fieldGroup({
			label: 'Einladung',
			fields: {
				text: textField({ required: true, label: 'Text', rows: 3 }),
				aside: textField({ required: true, label: 'Hinweis', rows: 3 }),
			},
		}),
		transfer: fieldGroup({
			label: 'Überweisung',
			fields: {
				note: textField({ required: true, label: 'Hinweis', rows: 3 }),
			},
		}),
		thanks: textField({ required: true, label: 'Danksagung', rows: 3 }),
	},
});

// Generate the types based on the content schema
export type GuanxiEvent = EventRecordBase;
export type PostRecord = z.infer<typeof postRecord.schema>;
export type MembershipContent = z.infer<typeof membershipRecord.schema>;

export const membershipSchema = membershipRecord.schema;

export const contentSchema = {
	events: defineListCollection({
		// One-time JSON→DB import source only (npm run db:import-json / cms:migrate / cms:status).
		// The live app reads/writes SQLite, never this file.
		jsonImportPath: 'src/content/events/event-data.local.json',
		record: guanxiEventRecord,
		media: 'events',
		admin: {
			editor: 'event',
			routes: { list: 'beitraege-manager', calendar: 'veranstaltungen-manager' },
		},
	}),
	posts: defineListCollection({
		jsonImportPath: 'src/content/posts/post-data.local.json',
		record: postRecord,
		media: 'posts',
		admin: { editor: 'post-blocks' },
	}),
	membership: defineSingleton({
		jsonImportPath: 'src/content/pages/membership.local.json',
		record: membershipRecord,
		admin: {
			editor: 'custom',
			label: 'Mitgliedschaft',
			route: 'statische-seiten/mitgliedschaft',
		},
	}),

	/* Optional (TypeScript only, not required): when you add HomepageContent to content.schema.ts, you can widen the type: 
	example:
	homepage: defineSingleton({
		jsonImportPath: 'src/content/pages/homepage.local.json',
		record: homepageRecord,
		admin: {
			editor: 'custom',
			label: 'Startseite',
			route: 'statische-seiten/startseite',
		},
	}),
	*/
} satisfies ContentSchemaRegistry;

export const membershipCollection = contentSchema.membership;
