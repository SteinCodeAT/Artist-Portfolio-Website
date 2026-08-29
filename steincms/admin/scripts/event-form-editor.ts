/**
 * Event form editor (bearbeiten.astro)
 *
 * Draft/publish flow via previewDraft nested on event records.
 *   - Entwurf speichern → previewDraft only
 *   - Speichern & Veröffentlichen → live fields + clear draft
 *   - Entwurf verwerfen → delete previewDraft
 *   - Entwurfsvorschau → public event page with ?show-preview=true (no save)
 */

import type { EventContentBlock } from '@steincms/cms/events/event-content-blocks';
import {
	MAX_FIELD_OPTIONS,
	MAX_REGISTRATION_FIELDS,
	parseRegistrationForm,
	type EventRegistrationForm,
	type RegistrationField,
	type RegistrationFieldType,
} from '@steincms/cms/events/registration-form';
import { isTableEmpty } from '@steincms/cms/blocks/table-block';
import type { BlockData } from '@steincms/cms/blocks/editor-block';
import {
	initContentSectionEditor,
	uploadImages,
} from './content-section-of-post-editor.ts';
import { initEventGallerySection } from './event-gallery-section.ts';

type SaveAction = 'save-draft' | 'publish' | 'discard-draft';

function newFieldId(): string {
	return crypto.randomUUID();
}

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;');
}

function readFormFromHidden(): EventRegistrationForm {
	const hidden = document.getElementById('event-registration-form') as HTMLInputElement | null;
	try {
		return parseRegistrationForm(JSON.parse(hidden?.value || '{}'));
	} catch {
		return parseRegistrationForm(undefined);
	}
}

function writeFormToHidden(form: EventRegistrationForm) {
	const hidden = document.getElementById('event-registration-form') as HTMLInputElement | null;
	if (hidden) {
		hidden.value = JSON.stringify(form);
	}
}

function collectRegistrationForm(strict = false): EventRegistrationForm {
	const root = document.querySelector('[data-reg-form-builder]');
	if (!root) {
		return readFormFromHidden();
	}

	const enabled = Boolean(
		(root.querySelector('[data-reg-enabled]') as HTMLInputElement | null)?.checked,
	);
	const fields: RegistrationField[] = [];

	root.querySelectorAll<HTMLElement>('[data-reg-field]').forEach((card) => {
		if (fields.length >= MAX_REGISTRATION_FIELDS) return;

		const id = card.dataset.regField ?? '';
		const type = ((card.querySelector('[data-reg-type]') as HTMLSelectElement | null)
			?.value ?? 'text') as RegistrationFieldType;
		const label = (card.querySelector('[data-reg-label]') as HTMLInputElement | null)?.value.trim() ?? '';
		const required = Boolean(
			(card.querySelector('[data-reg-required]') as HTMLInputElement | null)?.checked,
		);
		if (!id) return;
		if (strict && !label) return;

		const field: RegistrationField = {
			id,
			type,
			label: label.slice(0, 80),
			required,
		};

		if (type === 'single' || type === 'multi') {
			const options: NonNullable<RegistrationField['options']> = [];
			card.querySelectorAll<HTMLInputElement>('[data-reg-option]').forEach((input) => {
				if (options.length >= MAX_FIELD_OPTIONS) return;
				const optionLabel = input.value.trim();
				const optionId = input.dataset.optionId || newFieldId();
				if (strict && !optionLabel) return;
				options.push({ id: optionId, label: optionLabel });
			});
			if (options.length === 0) {
				if (strict) return;
				options.push({ id: newFieldId(), label: '' }, { id: newFieldId(), label: '' });
			}
			field.options = options;
		}

		if (strict && !label) return;

		fields.push(field);
	});

	const maxAttendeesRaw = (
		root.querySelector('[data-reg-max-attendees]') as HTMLInputElement | null
	)?.value;
	const maxGuestsRaw = (root.querySelector('[data-reg-max-guests]') as HTMLInputElement | null)
		?.value;

	const form = parseRegistrationForm({
		enabled,
		fields: strict ? fields : [],
		maxAttendees: maxAttendeesRaw,
		maxGuests: maxGuestsRaw,
	});
	if (!strict) {
		form.fields = fields;
	}
	writeFormToHidden(form);
	return form;
}

function readCategoryValue(): string {
	const select = document.getElementById('event-category-select') as HTMLSelectElement | null;
	const custom = document.getElementById('event-category-custom') as HTMLInputElement | null;
	if (select?.value === '__new__') {
		return custom?.value.trim() ?? '';
	}
	return select?.value ?? 'fest';
}

function initCategoryField() {
	const select = document.getElementById('event-category-select') as HTMLSelectElement | null;
	const custom = document.getElementById('event-category-custom') as HTMLInputElement | null;
	if (!select || !custom) return;

	const categorySelect = select;
	const categoryCustom = custom;

	function syncCustomVisibility() {
		const isNew = categorySelect.value === '__new__';
		categoryCustom.hidden = !isNew;
		if (isNew) {
			categoryCustom.focus();
		}
	}

	categorySelect.addEventListener('change', syncCustomVisibility);
	syncCustomVisibility();
}

function renderFieldCard(field: RegistrationField, index: number): string {
	const needsOptions = field.type === 'single' || field.type === 'multi';
	const options = field.options ?? [{ id: newFieldId(), label: '' }];
	const typeLabels: Record<string, string> = {
		single: 'Auswahl (eine Antwort)',
		multi: 'Mehrfachauswahl',
		yesno: 'Ja / Nein',
		number: 'Zahleneingabe',
		text: 'Freitext',
	};
	const optionRows = options
		.map(
			(option, i) => `
			<div class="reg-option-row">
				<span class="reg-option-bullet">${field.type === 'multi' ? '☐' : '○'}</span>
				<input type="text" data-reg-option data-option-id="${escapeAttr(option.id)}" value="${escapeAttr(option.label)}" placeholder="Antwort ${i + 1} eingeben…" maxlength="60" />
				<button type="button" class="reg-icon-btn reg-icon-btn-remove" data-reg-remove-option aria-label="Option entfernen" title="Option entfernen">×</button>
			</div>`,
		)
		.join('');

	return `
		<div class="reg-field-card" data-reg-field="${escapeAttr(field.id)}">
			<div class="reg-field-header">
				<span class="reg-field-number">${index + 1}</span>
				<input type="text" class="reg-field-label-input" data-reg-label value="${escapeAttr(field.label)}" placeholder="Frage eingeben — z.B. „Bist du Vegetarier/Veganer?"" maxlength="80" />
				<button type="button" class="reg-icon-btn reg-icon-btn-delete" data-reg-remove-field aria-label="Frage entfernen" title="Frage löschen">🗑</button>
			</div>
			<div class="reg-field-settings">
				<div class="reg-field-type-group">
					<label class="reg-field-type-label">Typ:</label>
					<select data-reg-type class="reg-field-type-select">
						<option value="yesno"${field.type === 'yesno' ? ' selected' : ''}>Ja / Nein</option>
						<option value="single"${field.type === 'single' ? ' selected' : ''}>Auswahl (eine Antwort)</option>
						<option value="multi"${field.type === 'multi' ? ' selected' : ''}>Mehrfachauswahl</option>
						<option value="number"${field.type === 'number' ? ' selected' : ''}>Zahleneingabe</option>
						<option value="text"${field.type === 'text' ? ' selected' : ''}>Freitext</option>
					</select>
				</div>
				<label class="reg-required-toggle">
					<input type="checkbox" data-reg-required ${field.required ? 'checked' : ''} />
					<span>Pflichtfeld</span>
				</label>
			</div>
			${
				needsOptions
					? `<div class="reg-options-section">
						<p class="reg-options-label">Antwortmöglichkeiten:</p>
						<div class="reg-field-options" data-reg-options>${optionRows}</div>
						<button type="button" class="reg-add-option-btn" data-reg-add-option>
							<span aria-hidden="true">+</span> Option hinzufügen
						</button>
					</div>`
					: field.type === 'yesno'
						? `<div class="reg-type-preview reg-yesno-preview">
							<span class="reg-yesno-chip">Ja</span>
							<span class="reg-yesno-chip">Nein</span>
							<span class="reg-yesno-hint">Feste Antwortmöglichkeiten</span>
						</div>`
						: `<div class="reg-type-preview">${typeLabels[field.type] ?? ''} — Teilnehmer ${field.type === 'number' ? 'gibt eine Zahl ein' : 'schreibt frei'}</div>`
			}
		</div>
	`;
}

function renderRegistrationFields(form: EventRegistrationForm) {
	const list = document.querySelector('[data-reg-fields]');
	if (!list) return;
	list.innerHTML = form.fields.length
		? form.fields.map((f, i) => renderFieldCard(f, i)).join('')
		: '<p class="reg-empty-state">Noch keine Extra-Fragen. Klicken Sie unten auf „Frage hinzufügen".</p>';
}

function syncRegistrationEnabledUi() {
	const root = document.querySelector('[data-reg-form-builder]');
	const toggle = root?.querySelector('[data-reg-enabled]') as HTMLInputElement | null;
	const body = root?.querySelector('[data-reg-builder-body]') as HTMLElement | null;
	if (!root || !body || !toggle) return;
	body.hidden = !toggle.checked;
	root.classList.toggle('is-reg-off', !toggle.checked);
}

function initRegistrationFormBuilder() {
	const root = document.querySelector('[data-reg-form-builder]');
	if (!root) return;

	const initial = readFormFromHidden();
	renderRegistrationFields(initial);
	syncRegistrationEnabledUi();

	root.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;

		if (target.closest('[data-reg-add-field]')) {
			const form = collectRegistrationForm();
			if (form.fields.length >= MAX_REGISTRATION_FIELDS) {
				alert(`Höchstens ${MAX_REGISTRATION_FIELDS} Extra-Fragen.`);
				return;
			}
			form.fields.push({
				id: newFieldId(),
				type: 'yesno',
				label: '',
				required: false,
			});
			writeFormToHidden(form);
			renderRegistrationFields(form);
			return;
		}

		const fieldCard = target.closest('[data-reg-field]') as HTMLElement | null;

		if (target.closest('[data-reg-remove-field]') && fieldCard) {
			fieldCard.remove();
			collectRegistrationForm();
			return;
		}

		if (target.closest('[data-reg-add-option]') && fieldCard) {
			const options = fieldCard.querySelector('[data-reg-options]');
			const count = options?.querySelectorAll('[data-reg-option]').length ?? 0;
			if (count >= MAX_FIELD_OPTIONS) return;
			const typeSelect = fieldCard.querySelector('[data-reg-type]') as HTMLSelectElement | null;
			const bullet = typeSelect?.value === 'multi' ? '☐' : '○';
			options?.insertAdjacentHTML(
				'beforeend',
				`<div class="reg-option-row">
					<span class="reg-option-bullet">${bullet}</span>
					<input type="text" data-reg-option data-option-id="${newFieldId()}" placeholder="Antwort ${count + 1} eingeben…" maxlength="60" />
					<button type="button" class="reg-icon-btn reg-icon-btn-remove" data-reg-remove-option aria-label="Option entfernen">×</button>
				</div>`,
			);
			return;
		}

		if (target.closest('[data-reg-remove-option]')) {
			target.closest('.reg-option-row')?.remove();
			collectRegistrationForm();
		}
	});

	root.addEventListener('change', (event) => {
		const target = event.target as HTMLElement;
		if (target.closest('[data-reg-enabled]')) {
			collectRegistrationForm();
			syncRegistrationEnabledUi();
			return;
		}
		const select = target.closest('[data-reg-type]') as HTMLSelectElement | null;
		if (select) {
			const form = collectRegistrationForm();
			renderRegistrationFields(form);
			return;
		}
		collectRegistrationForm();
	});

	root.addEventListener('input', () => {
		collectRegistrationForm();
	});
}

function readEditorConfig(root: HTMLElement) {
	const eventId = root.dataset.eventId || null;
	const adminPath = root.dataset.adminPath || '';
	const eventsPublicPath = root.dataset.eventsPublicPath || '';
	const eventsListPath = root.dataset.eventsListPath || `${adminPath}/beitraege-manager`;
	const eventsCalendarPath = root.dataset.eventsCalendarPath || `${adminPath}/veranstaltungen-manager`;
	let initialBlocks: BlockData[] = [];

	try {
		initialBlocks = JSON.parse(root.dataset.initialBlocks ?? '[]') as BlockData[];
	} catch {
		initialBlocks = [];
	}

	return {
		eventId,
		initialBlocks,
		adminPath,
		eventsPublicPath,
		eventsListPath,
		eventsCalendarPath,
		returnTo: root.dataset.returnTo === 'calendar' ? 'calendar' : 'list',
	};
}

function readInitialGallery(): string[] {
	const galleryRoot = document.getElementById('event-gallery-root');
	if (!galleryRoot) return [];

	try {
		return JSON.parse(galleryRoot.dataset.initialGallery ?? '[]') as string[];
	} catch {
		return [];
	}
}

function blocksToContentBlocks(blocks: BlockData[]): EventContentBlock[] {
	const result: EventContentBlock[] = [];

	for (const block of blocks) {
		if (block.type === 'text') {
			result.push({ id: block.id, type: 'text', html: block.html });
		}
		if (block.type === 'image' && block.url) {
			result.push({
				id: block.id,
				type: 'image',
				url: block.url,
				alt: block.alt,
				...(block.caption ? { caption: block.caption } : {}),
			});
		}
		if (block.type === 'table' && !isTableEmpty(block.rows)) {
			result.push({
				id: block.id,
				type: 'table',
				hasHeaderRow: block.hasHeaderRow,
				rows: block.rows.map((row) => row.map((cell) => cell.trim())),
			});
		}
	}

	return result;
}

function initCoverPreview() {
	const hiddenInput = document.getElementById('event-cover') as HTMLInputElement | null;
	const preview = document.getElementById('main-image-preview');
	const filenameInput = document.getElementById('event-cover-filename') as HTMLInputElement | null;
	const fileInput = document.getElementById('event-cover-file') as HTMLInputElement | null;
	const uploadBtn = document.getElementById('btn-cover-upload');
	const fallbackCover = document.querySelector('.main-image-field')?.getAttribute('data-fallback-cover') ?? '';

	if (!hiddenInput || !preview) {
		return;
	}

	function renderPreview() {
		const filename = hiddenInput!.value.trim();
		if (filenameInput) {
			filenameInput.value = filename;
		}

		if (filename) {
			const src =
				filename.startsWith('/uploads/') ||
				filename.startsWith('/media/') ||
				filename.startsWith('http') ||
				filename.startsWith('/')
					? filename
					: `/media/events/${document.getElementById('content-sections-root')?.dataset.eventId}/${filename}`;
			preview!.innerHTML = `<img src="${src}" alt="" class="main-image-preview-img" />`;
			return;
		}

		if (fallbackCover) {
			preview!.innerHTML = `<img src="${fallbackCover}" alt="" class="main-image-preview-img main-image-preview-img--fallback" />`;
		} else {
			preview!.innerHTML = '<p class="main-image-preview-empty">Kein Cover gesetzt</p>';
		}
	}

	filenameInput?.addEventListener('input', () => {
		hiddenInput.value = filenameInput.value.trim();
		renderPreview();
	});

	uploadBtn?.addEventListener('click', () => fileInput?.click());

	fileInput?.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file || !uploadBtn) return;

		uploadBtn.textContent = 'Wird hochgeladen…';
		uploadBtn.setAttribute('disabled', 'true');

		try {
			const entryId =
				document.getElementById('content-sections-root')?.dataset.eventId ?? '';
			const [result] = await uploadImages([file], {
				contentType: 'events',
				entryId,
				slot: 'cover.webp',
			});
			hiddenInput!.value = result.url;
			if (filenameInput) {
				filenameInput.value = result.url;
			}
			renderPreview();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
		} finally {
			uploadBtn.textContent = 'Cover hochladen';
			uploadBtn.removeAttribute('disabled');
		}
	});

	renderPreview();
}

type SavedEvent = {
	id: string;
	slug: string;
	title: string;
	date: string | null;
	category: string;
	previewDraft?: unknown | null;
};

function syncEventIdToGalleryRoot(eventId: string) {
	const galleryRoot = document.getElementById('event-gallery-root');
	if (galleryRoot) {
		galleryRoot.dataset.eventId = eventId;
	}
}

function initSaveDropdown(onAction: (action: SaveAction) => void) {
	const dropdown = document.querySelector('[data-save-dropdown]');
	const trigger = dropdown?.querySelector('[data-save-dropdown-trigger]') as HTMLButtonElement | null;
	const menu = dropdown?.querySelector('[data-save-dropdown-menu]') as HTMLElement | null;

	if (!dropdown || !trigger || !menu) return;

	trigger.addEventListener('click', () => {
		menu.hidden = !menu.hidden;
	});

	document.addEventListener('click', (event) => {
		if (!dropdown.contains(event.target as Node)) {
			menu.hidden = true;
		}
	});

	menu.querySelectorAll('[data-save-action]').forEach((button) => {
		button.addEventListener('click', () => {
			menu.hidden = true;
			const action = button.getAttribute('data-save-action') as SaveAction;
			onAction(action);
		});
	});
}

function setHasPreviewDraftFlag(hasDraft: boolean) {
	const root = document.getElementById('content-sections-root');
	if (root) {
		root.dataset.hasPreviewDraft = hasDraft ? 'true' : 'false';
	}

	const discardBtn = document.querySelector(
		'[data-save-action="discard-draft"]',
	) as HTMLButtonElement | null;
	if (discardBtn) {
		discardBtn.hidden = !hasDraft;
	}
}

function initEventFormEditor() {
	const root = document.getElementById('content-sections-root');
	const galleryRoot = document.getElementById('event-gallery-root');
	if (!root) {
		return;
	}

	initCoverPreview();
	initCategoryField();
	if (document.querySelector('[data-reg-form-builder]')) {
		initRegistrationFormBuilder();
	}

	const {
		eventId: initialEventId,
		initialBlocks,
		adminPath,
		eventsPublicPath,
		eventsListPath,
		eventsCalendarPath,
		returnTo,
	} = readEditorConfig(root);
	let eventId = initialEventId;
	const sectionEditor = initContentSectionEditor(root, initialBlocks, {
		allowedTypes: ['text', 'image', 'table'],
	});
	const galleryEditor = galleryRoot ? initEventGallerySection(galleryRoot, readInitialGallery()) : null;
	let lastSavedSnapshot: string | null = null;

	function captureSnapshot() {
		const title = (document.getElementById('event-title') as HTMLInputElement | null)?.value?.trim() ?? '';
		const excerpt =
			(document.getElementById('event-excerpt') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
		const cover = (document.getElementById('event-cover') as HTMLInputElement | null)?.value?.trim() ?? '';
		const date = (document.getElementById('event-date') as HTMLInputElement | null)?.value ?? '';
		const category = readCategoryValue();
		const location = (document.getElementById('event-location') as HTMLInputElement | null)?.value?.trim() ?? '';
		const blocks = sectionEditor.getBlocks();
		const gallery = galleryEditor?.getGalleryUrls() ?? [];
		const registrationForm = collectRegistrationForm();
		return JSON.stringify({ title, excerpt, cover, date, category, location, blocks, gallery, registrationForm });
	}

	function markDirtyIfChanged() {
		if (lastSavedSnapshot && captureSnapshot() !== lastSavedSnapshot) {
			setSaveStatus('dirty');
		}
	}

	function buildPayload() {
		const title = (document.getElementById('event-title') as HTMLInputElement | null)?.value?.trim();
		const excerpt =
			(document.getElementById('event-excerpt') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
		const coverInput = document.getElementById('event-cover') as HTMLInputElement | null;
		const cover = coverInput?.value?.trim() ?? '';
		const dateValue = (document.getElementById('event-date') as HTMLInputElement | null)?.value ?? '';
		const category = readCategoryValue();
		const location = (document.getElementById('event-location') as HTMLInputElement | null)?.value?.trim() ?? '';

		const blocks = sectionEditor.getBlocks().filter((block: BlockData) => {
			if (block.type === 'image') return Boolean(block.url);
			if (block.type === 'table') return !isTableEmpty(block.rows);
			if (block.type === 'gallery') return false;
			return true;
		});

		if (!title) {
			alert('Bitte geben Sie einen Titel ein.');
			return null;
		}

		const categorySelect = document.getElementById('event-category-select') as HTMLSelectElement | null;
		if (categorySelect?.value === '__new__' && !category) {
			alert('Bitte geben Sie eine Kategorie ein.');
			return null;
		}

		return {
			id: eventId,
			title,
			excerpt,
			cover: cover || null,
			date: dateValue || null,
			category,
			location: location || null,
			blocks: blocksToContentBlocks(blocks),
			gallery: galleryEditor?.getGalleryUrls() ?? [],
			registrationForm: collectRegistrationForm(true),
		};
	}

	async function saveEvent(action: SaveAction): Promise<SavedEvent | null> {
		if (action === 'discard-draft') {
			if (
				!confirm(
					'Entwurf verwerfen? Ungespeicherte Entwurfs-Änderungen gehen verloren und der veröffentlichte Stand wird wieder geladen.',
				)
			) {
				return null;
			}

			if (root!.dataset.eventPersisted !== 'true') {
				window.location.href = returnTo === 'calendar' ? eventsCalendarPath : eventsListPath;
				return null;
			}

			setSaveStatus('saving');
			const response = await fetch('/api/update-events', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ id: eventId, action: 'discard-draft' }),
			});

			const data = (await response.json().catch(() => ({}))) as {
				error?: string;
			};

			if (!response.ok) {
				alert(data.error ?? 'Entwurf konnte nicht verworfen werden');
				setSaveStatus('dirty');
				return null;
			}

			window.location.href = `${window.location.pathname}?id=${eventId}`;
			return null;
		}

		const payload = buildPayload();
		if (!payload) return null;

		const isEdit = root!.dataset.eventPersisted === 'true';
		setSaveStatus('saving');

		const response = await fetch('/api/update-events', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify({ ...payload, action }),
		});

		const data = (await response.json().catch(() => ({}))) as {
			error?: string;
			event?: SavedEvent;
		};

		if (!response.ok || !data.event) {
			alert(data.error ?? 'Speichern fehlgeschlagen');
			setSaveStatus('dirty');
			return null;
		}

		lastSavedSnapshot = captureSnapshot();
		const savedAt = new Date();

		if (action === 'save-draft') {
			setSaveStatus('draft-saved', savedAt);
			setHasPreviewDraftFlag(true);
		} else {
			setSaveStatus('published', savedAt);
			setHasPreviewDraftFlag(false);
		}

		eventId = data.event.id;
		root!.dataset.eventId = data.event.id;
		root!.dataset.eventPersisted = 'true';
		if (data.event.slug) {
			root!.dataset.eventSlug = data.event.slug;
		}
		syncEventIdToGalleryRoot(data.event.id);

		const url = new URL(window.location.href);
		url.searchParams.set('id', data.event.id);
		history.replaceState(null, '', url.pathname + url.search);

		return data.event;
	}

	function openPreviewUrl() {
		const title = (document.getElementById('event-title') as HTMLInputElement | null)?.value?.trim();
		if (!title) {
			alert('Bitte geben Sie einen Titel ein.');
			return;
		}

		const slug = root!.dataset.eventSlug?.trim();
		if (!slug) {
			alert('Vorschau konnte nicht geöffnet werden — kein Slug vorhanden.');
			return;
		}

		const publicBase = eventsPublicPath || '/veranstaltungen';
		const url = `${publicBase}/${encodeURIComponent(slug)}?show-preview=true`;
		window.open(url, '_blank', 'noopener');
	}

	document.getElementById('btn-preview')?.addEventListener('click', async () => {
		const btn = document.getElementById('btn-preview') as HTMLButtonElement | null;
		const needsFirstSave = root!.dataset.eventPersisted !== 'true';
		const isDirty = Boolean(lastSavedSnapshot && captureSnapshot() !== lastSavedSnapshot);

		if (needsFirstSave || isDirty) {
			if (btn) btn.disabled = true;
			const saved = await saveEvent('save-draft');
			if (btn) btn.disabled = false;
			if (saved) openPreviewUrl();
			return;
		}

		openPreviewUrl();
	});

	initSaveDropdown((action) => {
		void saveEvent(action);
	});

	document.getElementById('event-title')?.addEventListener('input', markDirtyIfChanged);
	document.getElementById('event-excerpt')?.addEventListener('input', markDirtyIfChanged);
	document.getElementById('event-cover')?.addEventListener('change', markDirtyIfChanged);
	document.getElementById('event-date')?.addEventListener('input', markDirtyIfChanged);
	document.getElementById('event-category-select')?.addEventListener('change', markDirtyIfChanged);
	document.getElementById('event-category-custom')?.addEventListener('input', markDirtyIfChanged);
	document.getElementById('event-location')?.addEventListener('input', markDirtyIfChanged);
	root.addEventListener('input', markDirtyIfChanged);
	galleryRoot?.addEventListener('input', markDirtyIfChanged);
	root.addEventListener('click', () => {
		setTimeout(markDirtyIfChanged, 0);
	});
	galleryRoot?.addEventListener('click', () => {
		setTimeout(markDirtyIfChanged, 0);
	});
	document.querySelector('[data-reg-form-builder]')?.addEventListener('input', markDirtyIfChanged);
	document.querySelector('[data-reg-form-builder]')?.addEventListener('change', markDirtyIfChanged);
	document.querySelector('[data-reg-form-builder]')?.addEventListener('click', () => {
		setTimeout(markDirtyIfChanged, 0);
	});

	if (lastSavedSnapshot === null) {
		lastSavedSnapshot = captureSnapshot();
	}
}

function setSaveStatus(
	status: 'idle' | 'saving' | 'saved' | 'dirty' | 'draft-saved' | 'published',
	savedAt?: Date,
) {
	const statusEl = document.getElementById('save-status');
	if (!statusEl) return;

	statusEl.classList.remove('is-saving', 'is-dirty', 'is-saved');

	if (status === 'saving') {
		statusEl.textContent = 'Speichert…';
		statusEl.classList.add('is-saving');
		return;
	}
	if (status === 'draft-saved' && savedAt) {
		statusEl.textContent = `Entwurf gespeichert um ${savedAt.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
		statusEl.classList.add('is-saved');
		return;
	}
	if (status === 'published' && savedAt) {
		statusEl.textContent = `Veröffentlicht um ${savedAt.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
		statusEl.classList.add('is-saved');
		return;
	}
	if (status === 'saved' && savedAt) {
		statusEl.textContent = `Gespeichert um ${savedAt.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
		statusEl.classList.add('is-saved');
		return;
	}
	// with current timestamp	
	if (status === 'dirty') {
		statusEl.textContent = `Ungespeicherte Änderungen um ${new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
		statusEl.classList.add('is-dirty');
		return;
	}
	statusEl.textContent = '';
}

initEventFormEditor();

export {};
