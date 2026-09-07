/**
 * Generic confirm / notice dialog — drives the single <ConfirmDeleteModal />
 * instance every admin editor page mounts (dialog id "delete-event-modal", a
 * naming leftover from when this modal only handled event deletion). It's a
 * general-purpose confirm/notice primitive now: any content type — events,
 * posts/projects, or whatever collection a future project adds — reuses the
 * same dialog instead of rolling its own. showNotice() (admin-notice.ts) and
 * confirmDeleteEvent() (event-form-modal.ts) are both thin wrappers around
 * confirmDialog() below; add a delete/destructive action for a new content
 * type by calling confirmDialog() the same way, no new markup required.
 */

function getDialogElements() {
	return {
		dialog: document.getElementById('delete-event-modal') as HTMLDialogElement | null,
		titleEl: document.getElementById('delete-event-title'),
		messageEl: document.getElementById('delete-event-message'),
		confirmBtn: document.getElementById('delete-event-confirm') as HTMLButtonElement | null,
		cancelBtn: document.getElementById('delete-event-cancel') as HTMLButtonElement | null,
		closeBtn: document.getElementById('delete-event-close') as HTMLButtonElement | null,
	};
}

export type ConfirmDialogOptions = {
	title?: string;
	confirmLabel?: string;
	/** Hides the Cancel button — a plain acknowledge-only notice instead of a yes/no confirm. */
	notice?: boolean;
};

/**
 * Shows the shared modal with the given message. Resolves `true` when the
 * user clicks Confirm, `false` on Cancel/close/backdrop click (always
 * `true` for a `notice: true` dialog, once acknowledged).
 */
export function confirmDialog(message: string, options: ConfirmDialogOptions = {}): Promise<boolean> {
	const { dialog, titleEl, messageEl, confirmBtn, cancelBtn, closeBtn } = getDialogElements();

	if (!dialog || !confirmBtn) {
		// No modal in the DOM (page doesn't mount <ConfirmDeleteModal />) — fall
		// back to a native dialog rather than silently doing nothing.
		if (options.notice) {
			window.alert(message);
			return Promise.resolve(true);
		}
		return Promise.resolve(window.confirm(message));
	}

	const prevTitle = titleEl?.textContent ?? '';
	const prevMessage = messageEl?.textContent ?? '';
	const prevConfirm = confirmBtn.textContent ?? '';
	const prevCancelHidden = cancelBtn?.hidden ?? false;

	if (titleEl) titleEl.textContent = options.title ?? '';
	if (messageEl) messageEl.textContent = message;
	confirmBtn.textContent = options.confirmLabel ?? (options.notice ? 'OK' : 'Confirm');
	if (cancelBtn) cancelBtn.hidden = Boolean(options.notice);

	return new Promise((resolve) => {
		let settled = false;

		const restore = () => {
			if (titleEl) titleEl.textContent = prevTitle;
			if (messageEl) messageEl.textContent = prevMessage;
			confirmBtn.textContent = prevConfirm;
			if (cancelBtn) cancelBtn.hidden = prevCancelHidden;
		};

		const finish = (result: boolean) => {
			if (settled) return;
			settled = true;
			confirmBtn.removeEventListener('click', onConfirm);
			cancelBtn?.removeEventListener('click', onCancel);
			closeBtn?.removeEventListener('click', onCancel);
			dialog.removeEventListener('click', onBackdrop);
			dialog.removeEventListener('close', onCancel);
			restore();
			if (dialog.open) dialog.close();
			resolve(result);
		};

		const onConfirm = () => finish(true);
		const onCancel = () => finish(false);
		// Clicking the ::backdrop itself (not the modal card) dismisses like Cancel.
		const onBackdrop = (event: MouseEvent) => {
			if (event.target === dialog) onCancel();
		};

		confirmBtn.addEventListener('click', onConfirm);
		cancelBtn?.addEventListener('click', onCancel);
		closeBtn?.addEventListener('click', onCancel);
		dialog.addEventListener('click', onBackdrop);
		dialog.addEventListener('close', onCancel);
		dialog.showModal();
	});
}

/** Notice/alert use — no Cancel button, resolves once acknowledged. */
export function showNotice(message: string, title = 'Notice'): Promise<void> {
	return confirmDialog(message, { title, confirmLabel: 'OK', notice: true }).then(() => undefined);
}

export type DeleteEditorRecordOptions = {
	/** The record's REST endpoint, e.g. '/api/posts' — must support DELETE with { id } in the body. */
	endpoint: string;
	id: string;
	/** Names the content type in the confirm dialog and any error notice, e.g. "Projekt", "Veranstaltung". */
	itemLabel?: string;
	/** The record's own title, if known — makes the confirm message specific ("„Foo" wirklich löschen?"). */
	itemTitle?: string;
	/** Where to send the browser after a successful delete (typically the content type's list page). */
	redirectTo: string;
	/** Called right before the DELETE request fires — e.g. setSaveStatus('saving'). */
	onSaving?: () => void;
	/** Called if the delete fails, after the error notice is shown — e.g. reset save-status back to dirty. */
	onError?: (message: string) => void;
};

/**
 * Confirm → DELETE `${endpoint}` with `{ id }` → redirect on success. The
 * one shared shape behind every content type's "Delete this <item>" editor
 * action (see deleteEditorAction() in editor-actions.ts for the dropdown
 * entry that should call this on click) — a new content type wires delete
 * support by calling this with its own endpoint/id/redirect, nothing else
 * to build.
 */
export async function deleteEditorRecord(options: DeleteEditorRecordOptions): Promise<boolean> {
	const itemLabel = options.itemLabel ?? 'Eintrag';
	const message = options.itemTitle
		? `„${options.itemTitle}" wirklich löschen? Kann nicht rückgängig gemacht werden.`
		: `${itemLabel} wirklich löschen? Kann nicht rückgängig gemacht werden.`;

	const confirmed = await confirmDialog(message, { title: `${itemLabel} löschen`, confirmLabel: 'Löschen' });
	if (!confirmed) return false;

	options.onSaving?.();
	const response = await fetch(options.endpoint, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify({ id: options.id }),
	});

	const data = (await response.json().catch(() => ({}))) as { error?: string };
	if (!response.ok) {
		const errorMessage = data.error ?? `${itemLabel} konnte nicht gelöscht werden.`;
		await showNotice(errorMessage, 'Fehler');
		options.onError?.(errorMessage);
		return false;
	}

	window.location.href = options.redirectTo;
	return true;
}
