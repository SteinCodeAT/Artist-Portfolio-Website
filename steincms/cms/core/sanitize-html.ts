import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
	'p',
	'br',
	'strong',
	'em',
	'b',
	'i',
	'u',
	'h2',
	'h3',
	'h4',
	'ul',
	'ol',
	'li',
	'a',
	'blockquote',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
	});
}
