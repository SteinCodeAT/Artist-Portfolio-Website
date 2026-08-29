/** Parse JSON or form-urlencoded registration POST bodies into a flat record. */
export async function parseRegistrationBody(request: Request): Promise<Record<string, unknown>> {
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('application/json')) {
		return (await request.json()) as Record<string, unknown>;
	}

	if (
		contentType.includes('application/x-www-form-urlencoded') ||
		contentType.includes('multipart/form-data')
	) {
		const data = await request.formData();
		const body: Record<string, unknown> = {};
		const answers: Record<string, unknown> = {};

		for (const [key, value] of data.entries()) {
			if (typeof value !== 'string') continue;
			if (key.startsWith('answer-')) {
				const fieldId = key.slice('answer-'.length);
				const existing = answers[fieldId];
				if (existing === undefined) {
					answers[fieldId] = value;
				} else if (Array.isArray(existing)) {
					existing.push(value);
				} else {
					answers[fieldId] = [existing, value];
				}
				continue;
			}
			body[key] = value;
		}

		if (Object.keys(answers).length > 0) {
			body.answers = answers;
		}
		if (body.guests !== undefined) {
			body.guests = Number.parseInt(String(body.guests), 10);
		}
		return body;
	}

	return {};
}
