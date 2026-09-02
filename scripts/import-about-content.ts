/**
 * One-time import: the artist bio + exhibition history that used to be
 * hardcoded in ArtistCV.astro -> the `about` singleton.
 * Run once: DATABASE_URL=./data/admin_cms.sqlite npx tsx scripts/import-about-content.ts
 */
import { cmsDatabase } from '../src/db/cms-database';
import { writeSingleton } from '../steincms/db/singletons-store';

// One line per exhibition: "Year | Title | Organization | Location | URL"
// (URL optional, trailing) — same convention the artist uses to add new ones.
const exhibitions = [
	'2022 | TRAUMATRAUMA | feat. B.A.D. | Vienna - Austria | https://www.bad-art.org/',
	'2022 | Distance Fog | feat. B.A.D. Wienstation | Vienna - Austria',
	'2022 | The Cellular Fidelity | Alte Schieberkammer | Vienna - Austria',
	'2021 | Transform-Arte 2021 | Participating artist | Eisenstadt - Austria',
	'2021 | Angewandte Festival 2021 | Participating artist | Vienna - Austria',
	'2019 | "KAIROS" Recall of Earth Part 2 | Collective exhibition | Thessalonikki - Greece',
	'2019 | "Spannung!"-Medienwerkstatt | Collective exhibition | Vienna - Austria',
	'2019 | Fabrikraum #01 | Collective exhibition | Vienna - Austria',
	'2019 | "5.5" Mixed media installation | La Biennale di Venezia, Biennale Sessions | Venice - Italy',
	'2019 | Offene Ateliers in Margareten | Künstlerhaus, Participating artist | Vienna - Austria',
	'2019 | Reflecting Records | Collective exhibition | Vienna - Austria',
	'2018 | A community of individuals | SOHO Festival, Collective exhibition | Vienna - Austria',
	'2017 | DIGITAL WORKFLOW | Collective exhibition | Vienna - Austria',
	'2017 | UNTAPPED SUR-PLUS | Künstlerhaus, Collective exhibition | Vienna - Austria',
	'2017 | Disintegrate | Stop-Motion PSA movie for "Ministerium für ein lebenswertes Österreich", "Danube Projekt"- Der Haus der Europäischen Union | Vienna - Austria',
	'2016 | Infected Structures | Collective exhibition | Sokolowsko - Poland',
	'2016 | Smells Like Sh.t | Video Documenary "TV916" | Trebinje - Bosnia and Herzegovina',
	'2016 | ....Sowohl als auch..... | Performance | Vienna - Austria',
];

const bio =
	'Çağdaş Çeçen is a Vienna based media artist. He studied Media Art: Digital Art at University of Applied Arts Vienna and Physics at University of Vienna. Currently, his artistic practice focuses on the relationship between human movement, space and uncertainty. Since 2018 he has been developing new ways of interaction between human and space by using the synesthetic nature of Quantum Physics — not just in a symbolic or inspirational way, but as an active element in his artworks. He strongly believes that the democratization of Quantum Physics will open new artistic ways to reexplore our surroundings and improve our synesthetic sensation. His projects have already been presented in several countries: Austria, Italy, Poland, Greece, Bosnia and Herzegovina.';

writeSingleton(cmsDatabase, 'about', {
	bio,
	photo: null,
	instagramUrl: 'https://www.instagram.com/nihilprophet/',
	instagramHandle: '@nihilprophet',
	email: 'nihilprophet@gmail.com',
	exhibitions,
});

console.log(`Imported About content: bio (${bio.length} chars), ${exhibitions.length} exhibitions.`);
