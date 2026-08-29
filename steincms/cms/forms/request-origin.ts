/** True when the request Origin/Referer matches the request URL host (browser same-origin POSTs). */
export function isSameOrigin(request: Request): boolean {
	const url = new URL(request.url);
	const origin = request.headers.get('origin');
	if (origin) {
		try {
			return new URL(origin).origin === url.origin;
		} catch {
			return false;
		}
	}

	const referer = request.headers.get('referer');
	if (referer) {
		try {
			return new URL(referer).origin === url.origin;
		} catch {
			return false;
		}
	}

	// Non-browser clients omit both — not a browser cross-origin POST.
	return true;
}
