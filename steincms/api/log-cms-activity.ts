import { AUTH_FILE } from 'astro:env/server';
import { getAuthenticatedUsername } from '@steincms/auth/admin-auth';
import { getAuthUser } from '@steincms/auth/load-users';
import type { ActivityLogEntry, ActivityLogStore } from '@steincms/cms/activity-log';

export type ActivityActor = {
	username: string;
	displayName: string;
};

export function actorFromRequest(request: Request): ActivityActor | null {
	const username = getAuthenticatedUsername(request);
	if (!username) return null;

	const user = getAuthUser(username, AUTH_FILE ?? 'auth.yaml');
	const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : username;
	return { username, displayName: displayName || username };
}

export async function logCmsActivity(
	activityLog: ActivityLogStore | null | undefined,
	request: Request,
	entry: Pick<ActivityLogEntry, 'kind' | 'action' | 'title'> & { href?: string },
): Promise<void> {
	if (!activityLog) return;
	const actor = actorFromRequest(request);
	if (!actor) return;

	try {
		await activityLog.append({
			...actor,
			kind: entry.kind,
			action: entry.action,
			title: entry.title,
			href: entry.href,
		});
	} catch (error) {
		console.error('Failed to write activity log:', error);
	}
}
