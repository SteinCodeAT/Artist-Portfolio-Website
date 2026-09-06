/**
 * Generic previewDraft overlay — derived from a record's sibling fields.
 * Collection-specific draft Zod files must not live in steincms.
 */
import { z } from 'zod';
import type { FieldDef, FieldKind } from './fields/types';
import type { RecordDef, RecordFields } from './schema-builders';

export type PreviewDraftOverlay = {
	updatedAt: string;
} & Record<string, unknown>;

const OVERLAY_EXCLUDED_KINDS = new Set<FieldKind>(['id', 'slug', 'previewDraft']);
const OVERLAY_EXCLUDED_NAMES = new Set(['status', 'createdAt', 'updatedAt', 'publishedAt']);

export function isOverlayField(field: FieldDef): boolean {
	return !OVERLAY_EXCLUDED_KINDS.has(field.kind) && !OVERLAY_EXCLUDED_NAMES.has(field.name);
}

export function overlayFields(record: RecordDef): FieldDef[] {
	return Object.values(record.fields).filter(isOverlayField);
}

export function overlayFieldNames(record: RecordDef): string[] {
	return overlayFields(record).map((field) => field.name);
}

export function derivePreviewDraftZod(fields: RecordFields): z.ZodType {
	const shape: Record<string, z.ZodType> = {};
	for (const field of Object.values(fields)) {
		if (!isOverlayField(field)) continue;
		shape[field.name] = field.zod;
	}
	shape.updatedAt = z.string();
	return z.object(shape).nullable().optional();
}

function draftKeys(input: Record<string, unknown>, record?: RecordDef): string[] {
	if (record) {
		return overlayFieldNames(record);
	}
	return Object.keys(input).filter((name) => name !== 'updatedAt' && name !== 'previewDraft');
}

export function buildPreviewDraft(
	input: Record<string, unknown>,
	record?: RecordDef,
): PreviewDraftOverlay {
	const draft: Record<string, unknown> = {};
	for (const name of draftKeys(input, record)) {
		if (name in input) {
			draft[name] = input[name];
		}
	}
	draft.updatedAt = new Date().toISOString();
	return draft as PreviewDraftOverlay;
}

export function applyPreviewDraft<T extends Record<string, unknown>>(
	live: T,
	draft: PreviewDraftOverlay | null | undefined,
	record?: RecordDef,
): T {
	if (!draft) {
		return live;
	}

	const next: Record<string, unknown> = { ...live };
	for (const name of draftKeys(draft, record)) {
		if (name === 'updatedAt') continue;
		if (name in draft) {
			next[name] = draft[name];
		}
	}
	return next as T;
}

export function stripPreviewDraft<T extends { previewDraft?: unknown }>(record: T): T {
	const { previewDraft: _unused, ...rest } = record;
	return rest as T;
}

export type RecordDisplayResult<T> = {
	record: T;
	isPreview: boolean;
	hasDraft: boolean;
};

export function recordForDisplay<T extends { previewDraft?: PreviewDraftOverlay | null }>(
	record: T,
	options: { preview: boolean; authorized: boolean },
	recordDef?: RecordDef,
): RecordDisplayResult<T> {
	const wantsPreview = options.preview && options.authorized;

	if (!wantsPreview) {
		return {
			record: stripPreviewDraft(record),
			isPreview: false,
			hasDraft: false,
		};
	}

	const draft = record.previewDraft;
	if (!draft) {
		return {
			record: stripPreviewDraft(record),
			isPreview: true,
			hasDraft: false,
		};
	}

	const merged = applyPreviewDraft(
		record as T & Record<string, unknown>,
		draft,
		recordDef,
	);

	return {
		record: { ...merged, previewDraft: undefined } as T,
		isPreview: true,
		hasDraft: true,
	};
}
