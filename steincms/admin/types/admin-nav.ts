import type { AdminIconName } from '../icons/names';

export type AdminNavIcon = AdminIconName;

export type AdminNavItem = {
	id: string;
	label: string;
	href: string;
	title?: string;
	icon: AdminNavIcon;
};
