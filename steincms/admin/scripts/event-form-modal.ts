/**
 * Lightweight event create/edit modal — for sites that don't need the full block editor.
 * Saves via POST/PUT /api/update-events.
 */

export type EventModalCategory = {
	value: string;
	label: string;
};

export type EventModalBlock = {
	id: string;
	type: 'text';
	html: string;
};

export type EventModalRecord = {
	id: string;
	title: string;
	date: string | null;
	category: string;
	excerpt: string;
	blocks?: EventModalBlock[];
};

function getModalElements() {
	return {
		dialog: document.getElementById('event-modal') as HTMLDialogElement | null,
		form: document.getElementById('event-form') as HTMLFormElement | null,
		titleEl: document.getElementById('modal-title'),
		errorEl: document.getElementById('form-error') as HTMLParagraphElement | null,
		fieldId: document.getElementById('field-id') as HTMLInputElement | null,
		fieldTitle: document.getElementById('field-title') as HTMLInputElement | null,
		fieldDate: document.getElementById('field-date') as HTMLInputElement | null,
		fieldCategory: document.getElementById('field-category') as HTMLSelectElement | null,
		fieldExcerpt: document.getElementById('field-excerpt') as HTMLTextAreaElement | null,
		fieldBody: document.getElementById('field-body') as HTMLTextAreaElement | null,
	};
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function blocksToTextarea(blocks?: EventModalBlock[]): string {
	if (!blocks?.length) return '';
	return blocks
		.filter((block) => block.type === 'text')
		.map((block) =>
			block.html
				.replace(/<br\s*\/?>/gi, '\n')
				.replace(/<\/p>\s*<p>/gi, '\n\n')
				.replace(/<\/?[^>]+>/g, '')
				.trim(),
		)
		.filter(Boolean)
		.join('\n\n');
}

function textareaToBlocks(text: string): EventModalBlock[] {
	return text
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph, index) => ({
			id: `b${index}`,
			type: 'text' as const,
			html: `<p>${escapeHtml(paragraph)}</p>`,
		}));
}

function showError(message: string) {
	const { errorEl } = getModalElements();
	if (!errorEl) return;
	errorEl.textContent = message;
	errorEl.hidden = false;
}

function clearError() {
	const { errorEl } = getModalElements();
	if (!errorEl) return;
	errorEl.hidden = true;
	errorEl.textContent = '';
}

export function openEventFormModal(event?: EventModalRecord, prefillDate?: string | null) {
	const { dialog, form, titleEl, fieldId, fieldTitle, fieldDate, fieldCategory, fieldExcerpt, fieldBody } =
		getModalElements();

	if (!dialog || !form) return;

	clearError();
	form.reset();

	if (event) {
		if (titleEl) titleEl.textContent = 'Veranstaltung bearbeiten';
		if (fieldId) fieldId.value = event.id;
		if (fieldTitle) fieldTitle.value = event.title;
		if (fieldDate) fieldDate.value = event.date ?? '';
		if (fieldCategory) fieldCategory.value = event.category;
		if (fieldExcerpt) fieldExcerpt.value = event.excerpt;
		if (fieldBody) fieldBody.value = blocksToTextarea(event.blocks);
	} else {
		if (titleEl) titleEl.textContent = 'Neue Veranstaltung';
		if (fieldId) fieldId.value = '';
		if (fieldDate && prefillDate) fieldDate.value = prefillDate;
	}

	dialog.showModal();
}

export function closeEventFormModal() {
	const { dialog } = getModalElements();
	dialog?.close();
}

export function initEventFormModal(options: { onSaved?: () => void } = {}) {
	const { dialog, form } = getModalElements();
	if (!dialog || !form) return;

	document.getElementById('modal-close')?.addEventListener('click', closeEventFormModal);
	document.getElementById('modal-cancel')?.addEventListener('click', closeEventFormModal);

	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) {
			closeEventFormModal();
		}
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearError();

		const { fieldId, fieldTitle, fieldDate, fieldCategory, fieldExcerpt, fieldBody } = getModalElements();

		const id = fieldId?.value.trim() || undefined;
		const title = fieldTitle?.value.trim() ?? '';
		const date = fieldDate?.value || null;
		const category = fieldCategory?.value ?? '';
		const excerpt = fieldExcerpt?.value.trim() ?? '';
		const blocks = textareaToBlocks(fieldBody?.value ?? '');

		if (!title) {
			showError('Bitte geben Sie einen Titel ein.');
			return;
		}

		const payload = { title, date, category, excerpt, blocks, gallery: [] };
		const isEdit = Boolean(id);

		const response = await fetch('/api/update-events', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(
				isEdit ? { id, action: 'publish', ...payload } : { action: 'publish', ...payload },
			),
		});

		const data = (await response.json().catch(() => ({}))) as { error?: string };

		if (!response.ok) {
			showError(data.error ?? 'Speichern fehlgeschlagen.');
			return;
		}

		closeEventFormModal();
		options.onSaved?.();
	});
}

export function confirmDeleteEvent(options?: { title?: string }): Promise<boolean> {
	const dialog = document.getElementById('delete-event-modal') as HTMLDialogElement | null;
	const messageEl = document.getElementById('delete-event-message');
	const errorEl = document.getElementById('delete-event-error');
	const confirmBtn = document.getElementById('delete-event-confirm');
	const cancelBtn = document.getElementById('delete-event-cancel');
	const closeBtn = document.getElementById('delete-event-close');
  
	if (!dialog || !confirmBtn || !cancelBtn) {
	  return Promise.resolve(window.confirm('Diesen Termin wirklich löschen?'));
	}
  
	if (messageEl) {
	  messageEl.textContent = options?.title
		? `„${options.title}" wirklich löschen?`
		: 'Diesen Termin wirklich löschen?';
	}
	errorEl?.setAttribute('hidden', '');
  
	return new Promise((resolve) => {
	  const cleanup = () => {
		confirmBtn.removeEventListener('click', onConfirm);
		cancelBtn.removeEventListener('click', onCancel);
		closeBtn?.removeEventListener('click', onCancel);
		dialog.removeEventListener('click', onBackdrop);
		dialog.removeEventListener('close', onCancel);
	  };
  
	  const onConfirm = () => {
		cleanup();
		dialog.close();
		resolve(true);
	  };
  
	  const onCancel = () => {
		cleanup();
		if (dialog.open) dialog.close();
		resolve(false);
	  };
  
	  const onBackdrop = (event: MouseEvent) => {
		if (event.target === dialog) onCancel();
	  };
  
	  confirmBtn.addEventListener('click', onConfirm);
	  cancelBtn.addEventListener('click', onCancel);
	  closeBtn?.addEventListener('click', onCancel);
	  dialog.addEventListener('click', onBackdrop);
	  dialog.addEventListener('close', onCancel);
  
	  dialog.showModal();
	});
  }

export {};
