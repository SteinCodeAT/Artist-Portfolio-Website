/**
 * One-time content update from the artist's 2026 press kit: new tagline,
 * contact info, 3 new projects, richer copy + links for 3 existing projects,
 * and the full multi-section CV (exhibitions/awards/curatorial/activities/education).
 * Run once: DATABASE_URL=./data/admin_cms.sqlite npx tsx scripts/update-content-2026.ts
 */
import { eq } from 'drizzle-orm';
import { cmsDatabase } from '../src/db/cms-database';
import { posts } from '../src/db/schema/generated/posts';
import { readSingleton, writeSingleton } from '../steincms/db/singletons-store';
import { createUuidV7 } from '../steincms/cms/core/uuid';

const db = cmsDatabase.open();

// ---- About singleton: contact, tagline, full CV -----------------------------

const existingAbout = (readSingleton(cmsDatabase, 'about') as Record<string, unknown>) ?? {};

const links = (label: string, url: string) => `<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`;

writeSingleton(cmsDatabase, 'about', {
	...existingAbout, // keep bio + Instagram as already edited in the CMS
	email: 'cecencagdas@gmail.com',
	phone: '+43 660 5978206',
	tagline:
		'Light, sound and interaction as instruments for listening to hidden systems, microbial, electromagnetic, human.',
	exhibitions: [
		'2026 | Enlightening Stories : AFTERGLOW | Ars Electronica Festival 2026 | Linz - Austria',
		'2026 | Echo Chamber (Interactive Sculpture) | Solo Exhibition, Palais Rössl | Vienna - Austria',
		'2025 | Ghostbox — Klangkunst zum Angreifen | Collective Exhibition, feat. ExMachinisMusicae | Vienna - Austria',
		'2025 | Enlightening Stories (Demokratie, was geht?) | Austrian Parliament | Vienna - Austria',
		'2025 | Enlightening Stories (Demokratie, was geht?) | Kulturhaus Brotfabrik | Vienna - Austria',
		'2025 | Enlightening Stories ("Wir Sehen Euch") | WUK | Vienna - Austria',
		'2023 | Two Faces – Palimpsest | Collective Exhibition, Alte Ankerbrotfabrik | Vienna - Austria',
		'2023 | Byte the Purple | Solo Exhibition, Kunstpunkt Berlin | Berlin - Germany',
		'2023 | Two Faces | Artwalk Palimpsest, Transmedia Collective Performance | Vienna - Austria',
		'2022 | Distance Fog | Collective Exhibition, Wienstation | Vienna - Austria',
		'2022 | The Cellular Fidelity | Solo Exhibition, Alte Schieberkammer | Vienna - Austria',
		'2022 | Kempelenpark Open House | Collective Exhibition | Vienna - Austria',
		'2022 | Trauma Trauma | Collective Exhibition, Fabrikraum | Vienna - Austria',
		'2021 | Transform-Arte 2021 | Participating artist | Eisenstadt - Austria',
		'2021 | Angewandte Festival 2021 | Participating artist | Vienna - Austria',
		'2019 | 5.5 (Mixed Media Installation), KAIROS: Recall of Earth Part 2 | Collective Exhibition | Thessaloniki - Greece',
		'2019 | "Spannung!" Medienwerkstatt | Collective Exhibition | Vienna - Austria',
		'2019 | Fabrikraum #01 | Collective Exhibition | Vienna - Austria',
		'2019 | 5.5 (Mixed Media Installation), KAIROS: Recall of Earth Part 1 | La Biennale di Venezia, Biennale Sessions | Venice - Italy',
		'2019 | Offene Ateliers in Margareten | Künstlerhaus, Participating artist | Vienna - Austria',
		'2019 | Reflecting Records | Collective Exhibition | Vienna - Austria',
		'2018 | A Community of Individuals | SOHO Festival | Vienna - Austria',
		'2017 | Digital Workflow | Collective Exhibition | Vienna - Austria',
		'2017 | Untapped Surplus | Collective Exhibition, Künstlerhaus | Vienna - Austria',
		'2017 | Disintegrate (Stop-Motion PSA Film) | Ministerium für ein lebenswertes Österreich, Danube Projekt, Haus der Europäischen Union | Vienna - Austria',
		'2016 | Infected Structures | Collective Exhibition | Sokolowsko - Poland',
		'2016 | Smells Like Sh.t (Video Documentary "TV916") | Collective Exhibition | Trebinje - Bosnia and Herzegovina',
		'2016 | Sowohl als auch... | Performance | Vienna - Austria',
	],
	awards: [
		'2025 | BMKÖS Project Grant | Federal Ministry for Arts, Culture, Civil Service and Sport — for "Echo Chamber"',
		'2023 | Spatial Media Arts Student Award — WINNER | Media Architecture Biennale 2023 Awards, for "Ghostbox" (2021)',
		'2023 | Transmedial Media Architecture Award — FINALIST | Media Architecture Biennale 2023 Awards, for "The Cellular Fidelity" (2022)',
		'2022 | MA 7 Project Grant | Cultural Affairs Department of the City of Vienna — for "The Cellular Fidelity"',
	],
	curatorial: [
		'2025 | Artificial Territories | Das LOT, Vienna - Austria — Artistic Concept and Lead Curator',
		'2025 | Wir Sehen Euch | WUK, Vienna - Austria — Co-Curator',
		'2024 | Ludic Territories | Das LOT, Vienna - Austria — Artistic Concept and Lead Curator',
		'2023 | FAVOURITE FALL — Brotfabrik Herbstfest | Art and Culture Festival — Artistic Curator on behalf of ECHOLOT',
	],
	activities: [
		'2023 to 2025 | Artistic Director and Curator, ECHOLOT | Das LOT, Vienna',
		'2019 to 2021 | Deputy Chairperson of ÖH Angewandte (HUFAK) | Universität für angewandte Kunst Wien',
		'2019 to 2021 | University Senate Member | Universität für angewandte Kunst Wien',
		'2018 to 2023 | Founder and Board Member | Kultur und Kunstverein FABRIKRAUM',
		'2018 to 2023 | Founder and Board Member | Media Art Collective B.A.D. (Basisgruppe angemessener Dilettantismus)',
	],
	education: [
		'2015 to 2021 | Media Art: Digital Arts, Diploma Degree | Universität für angewandte Kunst Wien — Class of Univ.-Prof. Mag. art. Ruth Schnell',
		'2012 to 2015 | BA Physics | Universität Wien',
		'2007 to 2009 | Scriptwriting / Dramaturgy | Ekim Art Academy Bursa',
		'2004 to 2009 | BA Physics | Uludağ University Bursa',
	],
});
console.log('About singleton updated: contact info, tagline, and full 5-section CV.');

// ---- New projects -------------------------------------------------------------

type NewProject = {
	slug: string;
	title: string;
	description: string;
	year: string;
	metaLine: string;
	paragraphs: string[];
	linksHtml?: string;
};

const NEW_PROJECTS: NewProject[] = [
	{
		slug: 'enlightening-stories-afterglow',
		title: 'Enlightening Stories : Afterglow',
		description:
			'An interactive public space light and sound installation making the voices of marginalised young people audible and visible through illuminated lithophane spheres.',
		year: '2026',
		metaLine:
			'Interactive public space light and sound installation (lithophane spheres) · Ars Electronica Festival 2026, Linz. Part of "Demokratie, was geht?", Vienna (Parliament, Kulturhaus Brotfabrik, WUK)',
		paragraphs: [
			'Created as part of "Demokratie, was geht?" (Democracy, what\'s up?), an initiative creating spaces for self-empowerment since 2022, the installation makes the voices of marginalised young people audible and visible. Lithophane spheres illuminate 3D-printed reliefs featuring the faces of project participants. Audio tracks encoded into the light are transmitted to headphones, so the stories of the youth sound closer or more distant depending on your path through the space.',
			'It is an acoustic wander through a forest of experiences and courageous voices. Just as in society, it is often necessary to consciously search for the stories of those who have been marginalised, but here we bring them back to the centre. Their voices shine. Their stories shine. And we celebrate them, just as every story should be celebrated. The installation will be featured at Ars Electronica Festival 2026.',
		],
		linksHtml: `<ul>${links('Ars Electronica project page', 'https://ars.electronica.art/negotiatinghumanity/de/view/enlightening-stories-38a38ddb450c813a93e0cf639ecebc97/')}</ul>`,
	},
	{
		slug: 'echo-chamber',
		title: 'Echo Chamber',
		description:
			'An interactive media installation confronting the moral landscape of the post-truth era — a motorised satellite dish generating AI narratives that fracture as visitors draw near.',
		year: '2026',
		metaLine:
			'Interactive media installation, motorised satellite dish with local AI · Solo Exhibition, Palais Rössl, Vienna · Supported by BMKÖS and Bildrecht',
		paragraphs: [
			'Echo Chamber is an interactive media installation that quietly confronts the moral landscape of the post-truth era, where lies are layered upon lies until they eclipse reality itself. At its centre stands a motorised satellite dish, once the emblem of unfiltered truth, now transformed into a vessel for collective delusion. Upon its surface, a locally running, uncensored AI generates narratives that drift from subtle distortions of fact into surreal, self-reinforcing myths.',
			'As living bodies draw near, their very heartbeats detected by microwave radar, the projected text begins to fracture: colours bleed, typography collapses, and the words overlap into illegible chaos, revealing how the echo chamber depends entirely on human presence to sustain its escalating frenzy. Echo Chamber does not accuse, but gently yet insistently invites a deeper moral reckoning: in a world where collective attention itself fuels delusion, what remains of truth, and what quiet complicity do we each bring to its undoing?',
		],
		linksHtml: `<ul>${links('Documentation', 'https://drive.google.com/file/d/17uIbs8622d5ND9WV2fkQiIbTvRoXaboU/view?usp=sharing')}</ul>`,
	},
	{
		slug: 'enlightening-stories',
		title: 'Enlightening Stories',
		description:
			'An interactive public space installation making the voices of marginalised young people audible and visible, shown at the Austrian Parliament, Kulturhaus Brotfabrik and WUK Vienna.',
		year: '2025',
		metaLine:
			'Interactive public space installation · Demokratie, was geht? Festival — Austrian Parliament, Kulturhaus Brotfabrik, WUK, Vienna',
		paragraphs: [
			'Enlightening Stories is an interactive public space installation created for the "Demokratie, was geht?" festival, shown at the Austrian Parliament, Kulturhaus Brotfabrik and WUK Vienna. It makes the voices of marginalised young people audible and visible in public space: illuminated portraits and recorded stories respond to passers-by, bringing experiences that usually stay at the margins of the city back to its centre.',
		],
		linksHtml: `<ul>${links('Documentation', 'https://drive.google.com/file/d/1cZdHkiGmgKWGb82ubsr9ID_1rnK8jakw/view?usp=sharing')}</ul>`,
	},
];

const now = new Date().toISOString();
const publishDates: Record<string, string> = {
	'enlightening-stories-afterglow': '2026-09-01T00:00:00.000Z',
	'echo-chamber': '2026-06-01T00:00:00.000Z',
	'enlightening-stories': '2025-06-01T00:00:00.000Z',
};

for (const p of NEW_PROJECTS) {
	const id = createUuidV7();
	const blocks = [
		{ id: 'meta', type: 'text', html: `<p><em>${p.metaLine}</em></p>` },
		...p.paragraphs.map((html, i) => ({ id: `text-${i}`, type: 'text', html: `<p>${html}</p>` })),
		...(p.linksHtml ? [{ id: 'links', type: 'text', html: `<h3>Links</h3>${p.linksHtml}` }] : []),
	];
	db.insert(posts)
		.values({
			id,
			slug: p.slug,
			title: p.title,
			description: p.description,
			mainImage: null,
			blocks,
			status: 'published',
			year: p.year,
			publishedAt: publishDates[p.slug] ?? now,
			createdAt: now,
			updatedAt: now,
		})
		.run();
	console.log(`Inserted "${p.title}" -> /projects/${p.slug}`);
}

// ---- Updated projects (existing rows, richer copy + links) --------------------

type ProjectUpdate = {
	slug: string;
	description?: string;
	year?: string;
	metaLine: string;
	paragraphs: string[];
	linksHtml: string;
};

const UPDATES: ProjectUpdate[] = [
	{
		slug: 'cellular-fidelity',
		year: '2022',
		metaLine:
			'Laser-encoded sound installation bridging microbial ecosystems and human interaction · Solo Exhibition, Alte Schieberkammer, Vienna · Finalist, Media Architecture Biennale 2023, Transmedial Media Architecture Award',
		paragraphs: [
			'The Cellular Fidelity creates a three-dimensional aquarium that breaks its boundaries using light and sound. Audio is encoded into lasers that project through microscopic aquatic environments into the gallery space. On the floor is a cast, colourful view of what, in reality, is floating tiny and suspended above the visitors\' heads. The laser reveals its sound when a visitor steps into the shared aquatic space holding a sensor. Field recordings from the collection sites of 30 groups of marine microbes fill the space, bending, humming, and distorting with the visitor\'s movement.',
			'But the audio changes without a visitor as well: because the audio-encoded laser first travels through the microbes\' environment, they are the first beings to make contact with it. When a cellular shape runs across the floor, the audio reshapes in response to an actual microbe\'s interaction with the laser up above, movement from above made visible and audible from below.',
			'The microbes\' movements create a sound for the visitors. The visitors\' movements create a sound for the microbes. The light is shaped from both directions. Communication goes two ways. In The Cellular Fidelity, everyone is invited to step, or propel themselves, into a relationship of mutual observation.',
		],
		linksHtml: `<ul>${[
			links('Media Architecture Biennale Awards page', 'https://awards.mediaarchitecture.org/mab/project/392'),
			links('Documentation', 'https://vimeo.com/715293038'),
			links('Video: Interaction', 'https://drive.google.com/file/d/15Pfzv3fH9HgH6yX-bBVfAqjvRqhIJGI_/view?usp=sharing'),
			links('Video: The Space is Alive', 'https://drive.google.com/file/d/18SOUISTB0R1sQ5MOiJMBQFTYaxpBhxiA/view?usp=sharing'),
			links('Video: Layers of Universe', 'https://drive.google.com/file/d/18cj__aNd9fDrjniTJE1efupPr9S-plI2/view?usp=sharing'),
			links('Video: Apparatus', 'https://drive.google.com/file/d/11oQLvEPw5UjuqfbDbsko79iu8rcvCIwr/view?usp=sharing'),
		].join('')}</ul>`,
	},
	{
		slug: 'ghostbox',
		year: '2021',
		metaLine:
			'Interactive sound installation exploring the quantum Observer Effect · Winner, MAB Spatial Media Art Student Award · Exhibited Vienna 2025 with ExMachinisMusicae',
		paragraphs: [
			'Ghostbox is a work in the medium of audio-visual experience within a constructed environment, an attempt to investigate the "Observer Effect" in the real world. The action takes place in a dark space filled with ten constantly powered, audio-modulated, red laser modules.',
			'While the lasers are physically identical, the audio information they carry differs. This creates an entangled, amorphous audiovisual scape lending the space a patterned structure.',
			'Although the structure appears uniform, it reveals its synthesised nature upon interaction: visitors wearing light-sensitive devices on both fists explore the layers of the soundscape through their body movements, interacting with the linear patterned space of laser beams. The devices receive the modulated laser rays, transmitting the information to speakers and making the rays audible inside the space.',
		],
		linksHtml: `<ul>${[
			links('MAB Spatial Media Art Student Award page', 'https://studentawards.mediaarchitecture.org/mab/project/197'),
			links('Documentation', 'https://vimeo.com/708169950'),
			links("Video: Let's Play", 'https://vimeo.com/708170162'),
		].join('')}</ul>`,
	},
	{
		slug: '5.5',
		year: '2019',
		metaLine:
			'Wearable audio installation transforming artificial light into sound · La Biennale di Venezia, Biennale Sessions (KAIROS: Recall of Earth) and KAIROS Part 2, Thessaloniki',
		paragraphs: [
			'5.5 transforms artificial light into sound. When viewers put on the headset and headphones, they hear a mixture of electromagnetic disturbances caused by the artificial light sources in the room, a synaesthetic reflection on quantum wave-particle duality.',
			'5.5 invites you to an ambient synaesthetic experience. The apparatus becomes an artificial sensory organ: follow the white noise, let your ears guide you, and experience the space anew.',
		],
		linksHtml: `<ul>${links('Showcase video', 'https://vimeo.com/504789015')}</ul>`,
	},
];

for (const u of UPDATES) {
	const existing = db.select().from(posts).all().find((row: any) => row.slug === u.slug) as
		| { id: string; mainImage: string | null; blocks: unknown[] }
		| undefined;
	if (!existing) {
		console.log(`SKIPPED "${u.slug}" — not found in DB.`);
		continue;
	}
	// Keep the existing gallery block (photos) if there is one; replace only
	// the text content with the richer copy + links.
	const galleryBlocks = (existing.blocks as Array<{ type: string }>).filter((b) => b.type === 'gallery');
	const blocks = [
		{ id: 'meta', type: 'text', html: `<p><em>${u.metaLine}</em></p>` },
		...u.paragraphs.map((html, i) => ({ id: `text-${i}`, type: 'text', html: `<p>${html}</p>` })),
		{ id: 'links', type: 'text', html: `<h3>Links</h3>${u.linksHtml}` },
		...galleryBlocks,
	];
	// DatabaseConnection's contract (steincms/cms/storage/db-contract.ts) only
	// declares select/insert/delete/transaction — none of the app's own store
	// adapters need UPDATE (they delete+reinsert), so it's not in the shared
	// type. The real drizzle client has it at runtime; cast locally for this
	// one-off script rather than widening the shared contract for one use.
	(db as unknown as { update: (table: typeof posts) => { set: (v: object) => { where: (w: unknown) => { run: () => void } } } })
		.update(posts)
		.set({
			blocks,
			...(u.year ? { year: u.year } : {}),
			updatedAt: now,
		})
		.where(eq(posts.id, existing.id))
		.run();
	console.log(`Updated "${u.slug}" with richer copy + links.`);
}

console.log('\nDone.');
