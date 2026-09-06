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

export type AdminEditorDraftBadge = {
	label: string;
	title?: string;
	hidden?: boolean;
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
