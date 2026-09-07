export type AdminEditorAction = {
	action: string;
	label: string;
	hint?: string;
	danger?: boolean;
	hidden?: boolean;
};

export type AdminEditorPreview = {
	label: string;
	title?: string;
};

export type AdminEditorLiveLink = {
	href: string;
	label: string;
	title?: string;
	hidden?: boolean;
};

export type AdminEditorDraftBadge = {
	label: string;
	title?: string;
	hidden?: boolean;
};

export type AdminEditorDeleteButton = {
	label: string;
	title?: string;
};

export function defaultEditorSaveActions(hasPreviewDraft = false): AdminEditorAction[] {
	return [
		{
			action: 'save-draft',
			label: 'Entwurf speichern',
			hint: 'Nur Entwurf — Website bleibt unverändert',
		},
		{
			action: 'publish',
			label: 'Speichern & Veröffentlichen',
			hint: 'Entwurf übernehmen und live schalten',
		},
		{
			action: 'discard-draft',
			label: 'Entwurf verwerfen',
			hint: 'Zurück zum veröffentlichten Stand',
			danger: true,
			hidden: !hasPreviewDraft,
		},
	];
}

/**
 * A "delete this <item>" entry for the save dropdown — spread it onto
 * whatever `actions` array a content type's editor page already builds
 * (typically appended to `defaultEditorSaveActions(...)`, only once the
 * item actually exists to delete). Renders via the same danger styling as
 * "Entwurf verwerfen"; the page's own script wires the actual delete call —
 * see deleteEditorRecord() in steincms/admin/scripts/confirm-dialog.ts.
 *
 * itemLabel names the content type in the label/confirmation text (e.g.
 * "Projekt", "Veranstaltung", "Eintrag" for anything more generic) — the
 * one thing that changes per content type using this action.
 */
export function deleteEditorAction(options: {
	itemLabel?: string;
	label?: string;
	hint?: string;
} = {}): AdminEditorAction {
	const itemLabel = options.itemLabel ?? 'Eintrag';
	return {
		action: 'delete',
		label: options.label ?? `${itemLabel} löschen`,
		hint: options.hint ?? 'Kann nicht rückgängig gemacht werden',
		danger: true,
	};
}
