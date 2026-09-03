import type { SiteConfig } from '../steincms/site.config.definition';

export const siteConfig: SiteConfig = {
	name: 'Çağdaş Çeçen',
	shortName: 'Çağdaş Çeçen',
	tagline: 'Media Artist — Vienna',
	description:
		'Media Art focusing on the relationship between human movement, space and uncertainty and developing new ways of interaction between humans and spaces.',
	baseUrl: 'https://www.cagdascecen.com',
	lang: 'en',

	organization: {
		name: 'Çağdaş Çeçen',
		description: 'Media artist based in Vienna.',
		logo: { url: '/favicon.svg', width: 512, height: 512 },
	},

	mainContact: { email: 'nihilprophet@gmail.com' },

	admin: {
		path: '/ghostadmin',
		title: 'Çağdaş Çeçen — Content Manager',
		logo: '/favicon.svg',
	},

	// Not used by the public site (which has its own dark Signal-TV theme) —
	// only read by the admin login screen's accent colors.
	theme: {
		fonts: { serif: 'Rajdhani', sans: 'JetBrains Mono' },
		colors: {
			bg: '#030406',
			bgSecondary: '#0b0d12',
			footer: '#030406',
			accent: '#00c896',
			accentDark: '#00947a',
			text: '#e4e4e4',
		},
	},

	features: {
		events: false,
		// Must stay true — "projects" is registered as a posts-shaped
		// collection in content.schema.ts, and this flag is what create-cms.ts
		// checks to wire it up (see the note there).
		blog: true,
	},

	// Required by the SiteConfig type even though events are disabled — never
	// read at runtime while features.events is false.
	events: {
		categories: {},
		registrationEmail: 'nihilprophet@gmail.com',
		publicPath: '/events',
		mediaPath: '/media/events',
	},

	blog: {
		publicPath: '/projects',
		mediaPath: '/media/projects',
	},

	media: {
		root: 'public/media',
		urlPrefix: '/media',
		draftPrefix: '_drafts',
	},

	nav: [
		{ label: 'About', href: '/#about-me-section' },
	],

	cms: {
		expectedSteinCMSVersion: '1.2.0', // must match steincms/manifest.json
	},
	analytics: {
		enabled: false, // PRO upsell shown in the admin until this flips on
		identificationCode: 'wLqWocE46EFuz1ikEPrKiRmjvVeCUsZC',
		dashboardEmbedUrl: 'https://cagdascecencom.pirsch.io/?domain=cagdascecen.com&interval=today&access=b6n5PPGtH5c7nV3nBdvA&mode=light&ui=hide',
	},
};
