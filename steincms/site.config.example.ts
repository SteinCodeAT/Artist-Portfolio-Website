import type { SiteConfig } from './site.config.definition';

/** Example site configuration — copy to site.config.ts and customize per client. */
export const siteConfigExample: SiteConfig = {
	name: 'Your Organization',
	shortName: 'Your Organization',
	
	tagline: 'Your tagline here',
	description: 'The main site description here (is used for the SEO description meta tag if no other description is provided)',
	baseUrl: 'https://www.example.com',
	lang: 'de',
	
	organization: {
		name: 'Your Organization / legal Company Name',
		description: 'The organization description here',
		logo: {
			url: '/src/assets/images/logo.png',
			width: 512,
			height: 512,
		},
	},
	
	mainContact: {
		email: 'info@example.com',  // this is the email address that will be used for the main contact in the HTML head and other places
	},

	admin: {
		path: '/admin',  // this path needs to also exist as page/ subfolder with .astro pages
		title: 'Content Manager',
		logo: '/src/assets/images/logo.png',
	},

	theme: {
		fonts: { serif: 'Cormorant Garamond', sans: 'Montserrat' },
		colors: {
			bg: '#f7f3ea',
			bgSecondary: '#F5EEE3',
			footer: '#959e88',
			accent: '#b02e2e',
			accentDark: '#8f2424',
			text: '#2d2d2d',
		},
	},

	features: {
		events: true,
		blog: true,
	},

	events: {
		categories: {
			general: { label: 'Allgemein', tone: '#5b6470' },
		},
		registrationEmail: 'info@example.com',
		publicPath: '/events',
		mediaPath: '/media/events',
	},

	blog: {
		publicPath: '/blog',
		mediaPath: '/media/posts',
	},

	media: {
		root: 'public/media',
		urlPrefix: '/media',
		draftPrefix: '_drafts',
	},

	nav: [
		{ label: 'Home', href: '/' },
		{ label: 'Events', href: '/events' },
		{ label: 'Blog', href: '/blog' },
		{ label: 'Contact', href: '/contact' },
	],

	cms: {
		expectedSteinCMSVersion: '1.2.0',
	},

	registrations: {
		ticketPrefix: 'EVT',
	},
};
