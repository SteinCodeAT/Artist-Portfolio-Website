export const ADMIN_EDITOR_ACTION_EVENT = 'admin-editor-action';

export type AdminEditorActionEventDetail = {
	action: string;
};

export function initEditorSaveDropdowns() {
	document.querySelectorAll<HTMLElement>('[data-save-dropdown]').forEach((dropdown) => {
		if (dropdown.dataset.saveDropdownReady === 'true') return;
		dropdown.dataset.saveDropdownReady = 'true';

		const trigger = dropdown.querySelector<HTMLButtonElement>('[data-save-dropdown-trigger]');
		const menu = dropdown.querySelector<HTMLElement>('[data-save-dropdown-menu]');
		if (!trigger || !menu) return;

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
				const action = button.getAttribute('data-save-action');
				if (!action) return;

				dropdown.dispatchEvent(
					new CustomEvent<AdminEditorActionEventDetail>(ADMIN_EDITOR_ACTION_EVENT, {
						bubbles: true,
						detail: { action },
					}),
				);
			});
		});
	});
}

export function onAdminEditorAction(handler: (action: string) => void) {
	document.querySelector('[data-editor-actions]')?.addEventListener(ADMIN_EDITOR_ACTION_EVENT, (event) => {
		const action = (event as CustomEvent<AdminEditorActionEventDetail>).detail?.action;
		if (action) handler(action);
	});
}
