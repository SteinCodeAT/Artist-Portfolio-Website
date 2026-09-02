export const ADMIN_ICON_NAMES = [
	'home',
	'calendar',
	'posts',
	'pages',
	'file',
	'settings',
	'logout',
	'chevronDown',
	'search',
	'edit',
	'trash',
	'users',
	'download',
	'chart-line',
] as const;

export type AdminIconName = (typeof ADMIN_ICON_NAMES)[number];

export type AdminIconFileName = Exclude<AdminIconName, 'file'>;

export function resolveAdminIconName(name: AdminIconName): AdminIconFileName {
	if (name === 'file') return 'pages';
	return name;
}
