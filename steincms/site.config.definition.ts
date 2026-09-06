export type SiteConfig = {
	name: string;
	shortName: string;
	tagline: string;
	description: string;
	baseUrl: string;
	lang: string;

	organization: {
		name: string;
		description: string;
		logo: {
			url: string;
			width: number;
			height: number;
		};
	};
	mainContact: {
		email: string;
	};
	admin: {
		path: string;
		title: string;
		logo: string;
	};
	theme: {
		fonts: { serif: string; sans: string };
		colors: {
			bg: string;
			bgSecondary: string;
			footer: string;
			accent: string;
			accentDark: string;
			text: string;
		};
	};
	features: {
		events: boolean;
		blog: boolean;
	};
	events: {
		categories: Record<string, { label: string; tone: string }>;
		registrationEmail: string;
		publicPath: string;
		mediaPath: string;
	};
	blog: {
		publicPath: string;
		mediaPath: string;
	};
	media: {
		root: string;
		urlPrefix: string;
		draftPrefix: string;
		/** Default per-file upload limit in bytes. Used when a page has no override. */
		maxUploadBytes?: number;
		/**
		 * Per-page overrides. Keys match the editor page: `posts` (projects/blog),
		 * `events`, or a singleton/collection id such as `about`.
		 */
		maxUploadBytesByPage?: Record<string, number>;
	};
	nav: Array<{ label: string; href: string }>;
	cms: {
		expectedSteinCMSVersion: string;
	};
	registrations?: {
		dir?: string;
		ticketPrefix?: string;
		ticketPathPrefix?: string;
		excludeCategories?: string[];
		maxGuests?: number;
	};
	analytics?: {
		enabled: boolean;
		/** Pirsch site identification code — public, safe to ship client-side. */
		identificationCode?: string;
		/** Pirsch dashboard access-link URL, e.g. with &ui=hide&interval=30d&lang=de appended. */
		dashboardEmbedUrl?: string;
	};
};

/** Matches the nginx `/api/upload-image` body cap unless a site overrides it. */
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function maxUploadBytesFor(siteConfig: SiteConfig, page = 'default'): number {
	const byPage = siteConfig.media.maxUploadBytesByPage?.[page];
	if (typeof byPage === 'number' && byPage > 0) return byPage;
	const fallback = siteConfig.media.maxUploadBytes;
	if (typeof fallback === 'number' && fallback > 0) return fallback;
	return DEFAULT_MAX_UPLOAD_BYTES;
}
