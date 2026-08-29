import { TURNSTILE_SECRET_KEY } from 'astro:env/server';

export async function verifyTurnstileToken(
	token: unknown,
	remoteIp: string,
): Promise<boolean> {
	if (!TURNSTILE_SECRET_KEY) {
		return true;
	}
	if (typeof token !== 'string' || !token.trim()) {
		return false;
	}

	const body = new URLSearchParams({
		secret: TURNSTILE_SECRET_KEY,
		response: token,
		remoteip: remoteIp,
	});

	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});

	if (!response.ok) {
		return false;
	}

	const json = (await response.json()) as { success?: boolean };
	return Boolean(json.success);
}
