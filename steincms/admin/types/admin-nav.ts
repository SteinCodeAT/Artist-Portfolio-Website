import type { AdminIconName } from '../icons/names';

export type AdminNavIcon = AdminIconName;

export type AdminNavItem = {
	id: string;
	label: string;
	href: string;
	title?: string;
	icon: AdminNavIcon;
	/** Small chip after the label — e.g. "PRO" for an unpurchased feature. */
	badge?: string;
};
