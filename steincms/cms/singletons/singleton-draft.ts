import {
	buildPreviewDraft,
	overlayFieldNames,
	stripPreviewDraft,
	type RecordDef,
} from '@steincms/cms/schema';

export type SingletonSaveAction = 'save-draft' | 'publish' | 'discard-draft';

export function isSingletonSaveAction(action: string): action is SingletonSaveAction {
	return action === 'save-draft' || action === 'publish' || action === 'discard-draft';
}

function liveOverlay(
	source: Record<string, unknown>,
	record: RecordDef,
): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const name of overlayFieldNames(record)) {
		if (name in source) {
			next[name] = source[name];
		}
	}
	return next;
}

export function applySingletonSaveAction(
	current: Record<string, unknown> | null,
	form: Record<string, unknown>,
	action: SingletonSaveAction,
	record: RecordDef,
): Record<string, unknown> {
	const live = current ? stripPreviewDraft(current) : {};

	if (action === 'discard-draft') {
		return { ...live, previewDraft: null };
	}

	if (action === 'save-draft') {
		const draft = buildPreviewDraft(form, record);
		const base = Object.keys(live).length > 0 ? live : liveOverlay(form, record);
		return { ...base, previewDraft: draft };
	}

	return { ...live, ...liveOverlay(form, record), previewDraft: null };
}
