/** Reuses ConfirmDeleteModal.astro (#delete-event-modal) as a simple notice. */
export function showNotice(message: string, title = 'Notice'): Promise<void> {
	const dialog = document.getElementById('delete-event-modal') as HTMLDialogElement | null;
	const titleEl = document.getElementById('delete-event-title');
	const messageEl = document.getElementById('delete-event-message');
	const confirmBtn = document.getElementById('delete-event-confirm') as HTMLButtonElement | null;
	const cancelBtn = document.getElementById('delete-event-cancel') as HTMLButtonElement | null;
	const closeBtn = document.getElementById('delete-event-close') as HTMLButtonElement | null;

	if (!dialog || !confirmBtn) {
		window.alert(message);
		return Promise.resolve();
	}

	const prevTitle = titleEl?.textContent ?? '';
	const prevMessage = messageEl?.textContent ?? '';
	const prevConfirm = confirmBtn.textContent ?? '';
	const prevCancelHidden = cancelBtn?.hidden ?? false;

	if (titleEl) titleEl.textContent = title;
	if (messageEl) messageEl.textContent = message;
	confirmBtn.textContent = 'OK';
	if (cancelBtn) cancelBtn.hidden = true;

	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled) return;
			settled = true;
			confirmBtn.removeEventListener('click', done);
			closeBtn?.removeEventListener('click', done);
			dialog.removeEventListener('close', done);
			if (titleEl) titleEl.textContent = prevTitle;
			if (messageEl) messageEl.textContent = prevMessage;
			confirmBtn.textContent = prevConfirm;
			if (cancelBtn) cancelBtn.hidden = prevCancelHidden;
			if (dialog.open) dialog.close();
			resolve();
		};

		confirmBtn.addEventListener('click', done);
		closeBtn?.addEventListener('click', done);
		dialog.addEventListener('close', done);
		dialog.showModal();
	});
}
