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
};
