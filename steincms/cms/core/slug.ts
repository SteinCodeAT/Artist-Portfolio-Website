export function slugify(title: string): string {
	const slug = title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return slug || 'beitrag';
}

export function ensureUniqueSlug(
	base: string,
	existingSlugs: string[],
	excludeSlug?: string,
): string {
	const taken = new Set(existingSlugs.filter((s) => s !== excludeSlug));
	if (!taken.has(base)) {
		return base;
	}

	let n = 2;
	while (taken.has(`${base}-${n}`)) {
		n += 1;
	}
	return `${base}-${n}`;
}
