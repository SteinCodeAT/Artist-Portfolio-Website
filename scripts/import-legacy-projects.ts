/**
 * One-time import: the 10 hardcoded project pages (src/pages/projects/*.astro)
 * → real rows in the `posts` table.
 *
 * Inserts directly via Drizzle rather than through postsStore.appendPostRecord()
 * because that always auto-slugifies from the title (slugify("5.5") -> "5-5",
 * slugify("The Cellular Fidelity") -> "the-cellular-fidelity") — this import
 * needs the EXACT existing slugs so /projects/{slug} URLs keep working.
 *
 * Images are copied as-is from src/img/{folder}/ into public/media/posts/{id}/
 * (no resize/webp conversion — that's what the real upload pipeline does for
 * anything added through the admin UI from here on).
 *
 * Run once: npx tsx scripts/import-legacy-projects.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { cmsDatabase } from '../src/db/cms-database';
import { posts } from '../src/db/schema/generated/posts';
import { createMediaConfig, ensureEntryDir, mediaUrl } from '../steincms/cms/media/media-store';
import { createUuidV7 } from '../steincms/cms/core/uuid';

const mediaConfig = createMediaConfig({ root: 'public/media', urlPrefix: '/media' });

type LegacyProject = {
	slug: string;
	title: string;
	medium: string;
	year: string;
	description: string;
	paragraphs: string[];
	imgFolder: string;
	images: string[];
};

const PROJECTS: LegacyProject[] = [
	{
		slug: 'ghostbox',
		title: 'Ghostbox',
		medium: 'Interactive Sound Installation',
		year: '2020 – 2021',
		description:
			'A dark space filled with ten constantly-powered, audio-modulated laser modules — physically identical, but each carrying different audio. Visitors wearing light-sensitive devices on both wrists make the lasers audible through their own movement, investigating the Observer Effect until the synthesized nature of the space reveals itself.',
		paragraphs: [
			'Ghostbox is an audio-visual experience set within a specially constructed environment, designed to explore the "Observer Effect" in the tangible world. The installation unfolds in a darkened space, where ten continuously powered, audio-modulated red laser modules fill the area. Despite these lasers being physically identical, the audio content they convey is distinct, creating a complex, intertwined audiovisual landscape that presents a patterned structure. This structure, while seemingly uniform, discloses its synthesized essence when interacted with.',
			'Visitors, equipped with light-sensitive devices on their wrists, navigate this soundscape by moving through the space, engaging with the linear patterns of laser beams. These wrist-mounted devices capture the modulated laser light, converting it into sound that is then played through speakers, allowing the laser beams to be heard within the environment.',
		],
		imgFolder: 'ghostbox',
		images: ['ghostbox1.png', 'ghostbox2.png', 'ghostbox3.png', 'ghostbox4.jpg', 'ghostbox5.png', 'ghostbox6.jpg', 'ghostbox7.jpg', 'ghostbox8.JPG', 'ghostbox9.jpeg', 'ghostbox10.jpg', 'ghostbox11.png'],
	},
	{
		slug: 'cellular-fidelity',
		title: 'The Cellular Fidelity',
		medium: 'Interactive Sound Installation',
		year: '2022',
		description:
			'A three-dimensional aquarium that breaks its own boundaries with light and sound. Audio is encoded into lasers projected through microscopic aquatic environments — field recordings from 30 groups of marine microbes bending, humming, and distorting with a visitor’s movement.',
		paragraphs: [
			'The Cellular Fidelity creates a three-dimensional aquarium that breaks its boundaries using light and sound. Audio is encoded into lasers that project through microscopic aquatic environments into the gallery space. On the floor is a cast, colorful view of what, in reality, is floating tiny and suspended above the visitors\' heads. The laser reveals its sound when a visitor steps into the shared aquatic space holding a sensor. Field recordings from the collection sites of 30 groups of marine microbes fill the space—bending, humming, and distorting with the visitor\'s movement.',
			'But the audio changes without a visitor, as well. Because the audio-encoded laser first travels through the microbes\' environment, they are the first beings to make contact with it. When a cellular shape \'runs\' across the floor, the audio reshapes in response to the actual microbe\'s interaction with the laser up above, picking up movement from above and making it visible and audible from below.',
			'Nobody is obligated to communicate in Cellular Fidelity. We can\'t talk, but we can hear each other. While one group sees, another senses. The microbes\' movements create a sound for the visitors. The visitors\' movements create a sound for the microbes. Communication goes two ways.',
			'We can stay and spend time here. A traditional aquarium is a meeting point that is also a boundary. In The Cellular Fidelity, everyone is invited to step—or propel themselves—into a relationship of mutual observation.',
		],
		imgFolder: 'cellular-fidelity',
		images: Array.from({ length: 19 }, (_, i) => `cellular${i + 1}.${i + 1 === 1 ? 'png' : 'jpg'}`),
	},
	{
		slug: 'quantum-synesthesia',
		title: 'Quantum Synesthesia',
		medium: 'Interactive Installation',
		year: 'Upcoming',
		description:
			'Explores the hypothetical concept of quantum synesthesia, where individuals experience a merging of senses tied to quantum phenomena. Beyond scientific exploration, it stands as a metaphor: the unseen forces shaping the universe, expressed as a symphony through an interactive experience.',
		paragraphs: [
			'The project explores the hypothetical concept of "quantum synesthesia," where individuals experience a merging of senses specifically related to quantum phenomena. However, I go beyond mere scientific exploration and posit quantum synesthesia as a powerful metaphor. This metaphor envisions the unseen forces shaping the universe as a symphony, expressed through an interactive experience.',
		],
		imgFolder: 'quantum-synesthesisia',
		images: ['quantum-synesthesisia-1.jpeg', 'quantum-synesthesisia-2.jpeg', 'quantum-synesthesisia-3.jpeg', 'quantum-synesthesisia-4.jpeg'],
	},
	{
		slug: 'virtual-isolation',
		title: 'Virtual Isolation',
		medium: 'Wearable Device, Interactive Installation',
		year: '2020',
		description:
			'A wearable interactive object with a display demonstrating real-time vital readings and memories. As society tries to renegotiate survival and social interaction, it asks: is surviving alone enough to stay human, when human memory depends so heavily on others?',
		paragraphs: [
			'Virtual Isolation is a wearable interactive object equipped with a display that shows real-time vital readings and memories. Our lives have been dominated by numbers and graphs for quite some time. Society is attempting to navigate a new relationship between our survival and our social interactions during periods of isolation, yet the future remains uncertain. Despite human memory being deeply dependent on our social interactions, we find ourselves caught between fear and the loss of social abilities. "Is surviving alone enough to stay human, and what remains without shared memories?" - this question inspired the development of this project.',
		],
		imgFolder: 'virtual-isolation',
		images: ['virtual1.png', 'virtual2.png', 'virtual3.png', 'virtual4.png'],
	},
	{
		slug: 'moneyment',
		title: 'Moneyment',
		medium: 'Mixed-Media Installation (Video and Object)',
		year: '2018',
		description:
			'Money needs people, and people need money — an almost perfect circle. Every human action finds its place in the value chain, and every move is profitable. Dedicated to all those who do not play this game.',
		paragraphs: [
			'Money needs people, and people need money - an almost perfect circle. If you like, every human action finds its place in the value chain, and every move is profitable. Moneyment is dedicated to all those who do not play this game.',
		],
		imgFolder: 'moneyment',
		images: ['moneyment.png', 'moneyment1.png', 'moneyment2.png', 'moneyment3.png', 'moneyment4.png'],
	},
	{
		slug: 'limbo',
		title: 'Limbo',
		medium: 'Reactive Video Installation',
		year: '2016 – 2018',
		description:
			'Replaces a space close to the stairs between two floors with a reactive interface. When the observer watches the screen, it triggers a private story — decided by their own appearance — trapped in time and space.',
		paragraphs: [
			'Replacing a specific space close to the stairs between two floors with a reactive interface will allow the participants to reach a story which will be decided by their appearance. When the observer watches the screen, it triggers a private story, which is trapped in time and space.',
		],
		imgFolder: 'limbo',
		images: ['limbo1.png', 'limbo2.jpg', 'limbo3.JPG', 'limbo4.JPG', 'limbo5.JPG', 'limbo6.JPG', 'limbo7.JPG', 'limbo8.JPG', 'limbo9.JPG', 'limbo10.JPG', 'limbo11.JPG', 'limbo12.JPG'],
	},
	{
		slug: '5.5',
		title: '5.5',
		medium: 'Interactive Sound Installation',
		year: '2019',
		description:
			'Transforms artificial light into sound. Wearing headset and headphones, visitors hear a mixture of electromagnetic disturbances caused by the artificial light sources in the room — follow the white noise, let your ears guide you.',
		paragraphs: [
			'5.5 transforms artificial light into sound. When viewers put on the headset and headphones, they hear a mixture of electromagnetic disturbances caused by the artificial light sources in the room. 5.5 invites you to an ambient synaesthetic experience. The apparatus becomes an artificial sensory organ: follow the white noise, let your ears guide you, and experience the space anews.',
		],
		// The old page's image glob pointed at src/img/ghostbox/* by mistake — no
		// dedicated photos exist for "5.5". Importing with none rather than
		// carrying that bug forward; add real photos through the admin UI.
		imgFolder: '',
		images: [],
	},
	{
		slug: 'behind-the-box',
		title: 'Behind the Box',
		medium: 'Interactive Mixed-Media Installation',
		year: '2020',
		description:
			'A cubic object with a translucent LCD panel and multichannel mapped audio, transmitting sound through audio-mapped LED arrays. Moving the apparatus changes what you hear — recordings from a war zone, a suicide vlogger, a makeup tutorial — an amplifier that alters nothing.',
		paragraphs: [
			'Cubic object with translucent lcd panel and multi channel mapped audio transmitting led arrays as backlight. Observers can also interact with the installation "Behind the Box" by moving the apparatus from the project "5.5". In this way, they listen to different sounds which come from the box — audio recordings from a war zone, a suicide youtuber, a makeup video, and many others. Without any interaction the installation stays silent.',
			'Visuals and movements on screen run on the Unity Engine. The translucent lcd creates an augmented reality feeling depending on the angle the observer looks into the box from. The apparatus functions just as a receiver and amplifier — it does not alter anything. What observers hear is the audio-mapped led arrays, and when they move around with the apparatus, they hear mixtures of mapped sounds.',
		],
		imgFolder: 'behind-the-box',
		images: ['behind1.png', 'behind2.png', 'behind3.png', 'behind4.png', 'behind_the_box.png'],
	},
	{
		slug: 'two-faces',
		title: 'Two Faces',
		medium: 'Video Installation',
		year: '2023',
		description:
			'Once the largest bakery in Europe, now leaving Vienna after 130 years. A daughter tries to decipher her secretive mother; a son struggles with the ghost of his father. What remains behind, and what has been completely forgotten?',
		paragraphs: [
			'"Palimpsest" is an artistic audio walk through "Ankerbrotfabrik" and its history. Once the largest bakery in Europe, it is now leaving Vienna after 130 years. What remains behind? What can a place tell? Who remembers what, and what seems to have been completely forgotten?',
			'We make our research walkable and invite you to come along: a daughter who tries to decipher her secretive mother; a son who struggles with the ghost of his father. Together, we follow their verses and accompany them every step of the way in their search for traces through time. Along the way, we listen to people remembering.',
			'"Two Faces" is one of the eight artistic stations; we experience how layer after layer is removed to see what is hidden behind it.',
		],
		imgFolder: 'two-faces',
		images: Array.from({ length: 13 }, (_, i) => `two-faces${i + 1}.jpg`),
	},
	{
		slug: 'lumiscape',
		title: 'Lumiscape',
		medium: 'Interactive Installation',
		year: 'Upcoming',
		description:
			'Builds on prior work with Li-Fi technology and a fascination with quantum physics to investigate the complex, often veiled relationship between humans and nature.',
		paragraphs: [
			'"Lumiscape" builds upon my established artistic exploration of veiled aspects of the human experience through interactive new media installations. This project utilizes my prior work with Li-Fi technology and my fascination with quantum physics to investigate the complex relationship between humans and nature.',
		],
		imgFolder: 'lumiscape',
		images: ['lumiscape-1.jpeg', 'lumiscape-2.jpg', 'lumiscape-3.jpg', 'lumiscape-4.jpg', 'lumiscape-5.jpeg'],
	},
];

function importProject(p: LegacyProject) {
	const id = createUuidV7();
	const dir = ensureEntryDir(mediaConfig, 'posts', id);

	const galleryImages = p.images.map((filename, i) => {
		const src = path.resolve('src/img', p.imgFolder, filename);
		const destName = filename.toLowerCase();
		fs.copyFileSync(src, path.join(dir, destName));
		const url = mediaUrl(mediaConfig, 'posts', id, destName);
		return { id: `img-${i}`, url, thumbUrl: url, alt: p.title };
	});

	const now = new Date().toISOString();
	const blocks = [
		{ id: 'meta', type: 'text', html: `<p><em>${p.medium} · ${p.year}</em></p>` },
		...p.paragraphs.map((html, i) => ({ id: `text-${i}`, type: 'text', html: `<p>${html}</p>` })),
		...(galleryImages.length > 0 ? [{ id: 'gallery-0', type: 'gallery', images: galleryImages }] : []),
	];

	cmsDatabase.open().insert(posts).values({
		id,
		slug: p.slug,
		title: p.title,
		description: p.description,
		mainImage: galleryImages[0]?.url ?? null,
		blocks,
		status: 'published',
		publishedAt: now,
		createdAt: now,
		updatedAt: now,
	}).run();

	console.log(`Imported "${p.title}" -> /projects/${p.slug} (${galleryImages.length} images)`);
}

for (const p of PROJECTS) {
	importProject(p);
}

console.log(`\nDone — ${PROJECTS.length} projects imported.`);
