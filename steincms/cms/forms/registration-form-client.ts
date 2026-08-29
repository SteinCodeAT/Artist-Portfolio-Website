import { ADMIN_BAIT_FIELD, parseFormTokenPayload } from './form-token-parse.ts';

export function injectBaitField(form: HTMLFormElement, baitName: string): void {
	if (form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(baitName)}"]`)) {
		return;
	}

	const input = document.createElement('input');
	input.type = 'text';
	input.name = baitName;
	input.value = '';
	input.tabIndex = -1;
	input.setAttribute('aria-hidden', 'true');
	input.autocomplete = 'off';
	input.style.display = 'none';
	form.append(input);
}

export function baitNameFromForm(form: HTMLFormElement): string | null {
	const tokenInput = form.querySelector<HTMLInputElement>('input[name="_sibop"]');
	if (!tokenInput?.value) return null;
	return parseFormTokenPayload(tokenInput.value)?.baitName ?? null;
}

export function collectRegistrationAnswers(
	form: HTMLFormElement,
): Record<string, string | string[] | number> {
	const answers: Record<string, string | string[] | number> = {};
	form.querySelectorAll<HTMLElement>('[data-reg-field]').forEach((block) => {
		const id = block.dataset.regField;
		const type = block.dataset.regType;
		if (!id || !type) return;

		if (type === 'multi') {
			const selected = Array.from(
				block.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'),
			).map((input) => input.value);
			if (selected.length > 0) answers[id] = selected;
			return;
		}

		if (type === 'single' || type === 'yesno') {
			const chosen = block.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value;
			if (chosen) answers[id] = chosen;
			return;
		}

		if (type === 'number') {
			const raw = (block.querySelector<HTMLInputElement>('input[type="number"]')?.value ?? '').trim();
			if (raw !== '') answers[id] = Number.parseInt(raw, 10);
			return;
		}

		const text = (block.querySelector<HTMLInputElement>('input[type="text"]')?.value ?? '').trim();
		if (text) answers[id] = text;
	});
	return answers;
}

function readTurnstileToken(form: HTMLFormElement): string {
	const fromInput = form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value;
	return fromInput?.trim() ?? '';
}

function buildJsonPayload(form: HTMLFormElement): Record<string, unknown> {
	const data = new FormData(form);
	const baitName = baitNameFromForm(form);
	const payload: Record<string, unknown> = {
		eventId: data.get('eventId'),
		name: data.get('name'),
		email: data.get('email'),
		guests: data.get('guests'),
		answers: collectRegistrationAnswers(form),
		_sibop: data.get('_sibop'),
	};

	const turnstile = readTurnstileToken(form);
	if (turnstile) {
		payload['cf-turnstile-response'] = turnstile;
	}

	if (baitName) {
		const baitValue = form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(baitName)}"]`)?.value;
		if (baitValue) {
			payload[baitName] = baitValue;
		}
	}

	return payload;
}

export function initRegistrationForms(root: ParentNode = document): void {
	root.querySelectorAll<HTMLFormElement>('[data-registration-form]').forEach((form) => {
		const baitName = baitNameFromForm(form);
		if (baitName) {
			injectBaitField(form, baitName);
		}

		const status = form.querySelector<HTMLElement>('[data-registration-status]');
		const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			if (!status) return;

			submitButton?.setAttribute('disabled', 'true');
			status.textContent = 'Wird gesendet…';

			try {
				const res = await fetch('/api/register-event', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(buildJsonPayload(form)),
				});

				let json: { ok?: boolean; error?: string; message?: string; ticketUrl?: string } = {};
				try {
					json = (await res.json()) as typeof json;
				} catch {
					json = { error: 'Anmeldung fehlgeschlagen.' };
				}

				if (res.status === 409 && json.error === 'RELOAD') {
					status.textContent = json.message ?? 'Das Formular ist abgelaufen. Bitte laden Sie die Seite neu.';
					return;
				}

				if (!res.ok) {
					status.textContent = json.error ?? json.message ?? 'Anmeldung fehlgeschlagen.';
					return;
				}

				if (json.ticketUrl) {
					window.location.assign(json.ticketUrl);
					return;
				}

				form.reset();
				status.textContent = 'Danke, Ihre Anmeldung ist eingegangen.';
			} finally {
				submitButton?.removeAttribute('disabled');
			}
		});
	});
}

export function initAdminLoginBait(root: ParentNode = document): void {
	root.querySelectorAll<HTMLFormElement>('form[data-admin-login-form]').forEach((form) => {
		injectBaitField(form, ADMIN_BAIT_FIELD);
	});
}
