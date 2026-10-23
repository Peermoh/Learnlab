// Basic-level Hindi content: vowels, consonants and matras.
// Each item: id, ch (what you see), roman, sound (English anchor), tip (mouth position), word.

const w = (hi, roman, en) => ({ hi, roman, en });

const vowel = (id, ch, roman, sound, tip, word, group) => ({ id, ch, roman, sound, tip, word, group });

export const VOWELS = [
  vowel('v-a', 'अ', 'a', '“a” in about', 'Relax your mouth and keep it short and soft, like a lazy “uh”.', w('अनार', 'anaar', 'pomegranate'), 'Short & long vowels'),
  vowel('v-aa', 'आ', 'aa', '“a” in father', 'Open wide and hold the sound for twice as long as अ.', w('आम', 'aam', 'mango'), 'Short & long vowels'),
  vowel('v-i', 'इ', 'i', '“i” in sit', 'Short and relaxed, with your lips slightly spread.', w('इमली', 'imli', 'tamarind'), 'Short & long vowels'),
  vowel('v-ee', 'ई', 'ee', '“ee” in feet', 'Smile and hold it longer than इ.', w('ईख', 'eekh', 'sugarcane'), 'Short & long vowels'),
  vowel('v-u', 'उ', 'u', '“u” in put', 'Round your lips a little and keep it short.', w('उल्लू', 'ullu', 'owl'), 'Short & long vowels'),
  vowel('v-oo', 'ऊ', 'oo', '“oo” in food', 'Round your lips tightly and hold it long.', w('ऊँट', 'oont', 'camel'), 'Short & long vowels'),
  vowel('v-ri', 'ऋ', 'ri', '“ri” in rip', 'Say a quick “ri”. In Hindi it is mostly found in Sanskrit words.', w('ऋषि', 'rishi', 'sage'), 'Short & long vowels'),
  vowel('v-e', 'ए', 'e', '“ay” in play (but pure)', 'Keep the sound steady. Do not glide into “ee” like in English.', w('एक', 'ek', 'one'), 'Gliding vowels & nasals'),
  vowel('v-ai', 'ऐ', 'ai', '“a” in cat, stretched', 'Open your mouth a bit more than for ए and keep it flat.', w('ऐनक', 'aynak', 'glasses'), 'Gliding vowels & nasals'),
  vowel('v-o', 'ओ', 'o', '“o” in go (but pure)', 'Round your lips and hold steady without gliding to “oo”.', w('ओखली', 'okhli', 'mortar'), 'Gliding vowels & nasals'),
  vowel('v-au', 'औ', 'au', '“aw” in law', 'Open and round your mouth, deeper than ओ.', w('औरत', 'aurat', 'woman'), 'Gliding vowels & nasals'),
  vowel('v-am', 'अं', 'an / am', 'a nasal “ng” hum after अ', 'Say अ, then let the sound hum through your nose.', w('अंगूर', 'angoor', 'grapes'), 'Gliding vowels & nasals'),
  vowel('v-ah', 'अः', 'ah', 'a soft breath “h” after अ', 'Say अ, then add a gentle puff of air at the end.', w('दुःख', 'dukh', 'sorrow'), 'Gliding vowels & nasals'),
];

const c = (id, ch, roman, sound, tip, word, group) => ({ id, ch, roman, sound, tip, word, group });

const G1 = 'Throat sounds · क वर्ग';
const G2 = 'Palate sounds · च वर्ग';
const G3 = 'Curled-tongue sounds · ट वर्ग';
const G4 = 'Teeth sounds · त वर्ग';
const G5 = 'Lip sounds · प वर्ग';
const G6 = 'Flowing sounds';
const G7 = 'Hissing sounds';

export const CONSONANTS = [
  c('c-ka', 'क', 'ka', '“k” in skate', 'No puff of air. Hold a tissue in front of your mouth, it should not move.', w('कमल', 'kamal', 'lotus'), G1),
  c('c-kha', 'ख', 'kha', '“k” in kite, with a strong puff', 'Add a clear burst of air after the k. The tissue should flutter.', w('खरगोश', 'khargosh', 'rabbit'), G1),
  c('c-ga', 'ग', 'ga', '“g” in garden', 'Voiced and soft, with no puff of air.', w('गाय', 'gaay', 'cow'), G1),
  c('c-gha', 'घ', 'gha', '“g” with a breathy puff', 'Say ग, but release a breath of air with it.', w('घर', 'ghar', 'home'), G1),
  c('c-nga', 'ङ', 'nga', '“ng” in sing', 'A nasal sound from the back of the throat. It never starts a word.', w('गंगा', 'ganga', 'the Ganges'), G1),

  c('c-cha', 'च', 'cha', '“ch” in cheese, but softer', 'Touch the middle of your tongue to the palate. No puff of air.', w('चाय', 'chaay', 'tea'), G2),
  c('c-chha', 'छ', 'chha', '“ch” with a strong puff', 'Same as च but with a clear burst of air.', w('छाता', 'chhaata', 'umbrella'), G2),
  c('c-ja', 'ज', 'ja', '“j” in jar', 'Voiced and soft, with no puff of air.', w('जल', 'jal', 'water'), G2),
  c('c-jha', 'झ', 'jha', '“j” with a breathy puff', 'Say ज and release a breath of air with it.', w('झंडा', 'jhanda', 'flag'), G2),
  c('c-nya', 'ञ', 'nya', '“ny” in canyon', 'A nasal sound from the palate. It is found inside words.', w('पंछी', 'panchhi', 'bird'), G2),

  c('c-tta', 'ट', 'ṭa', 'a hard “t”, tongue curled back', 'Curl the tip of your tongue back to touch the roof of your mouth. No puff of air.', w('टमाटर', 'tamaatar', 'tomato'), G3),
  c('c-ttha', 'ठ', 'ṭha', 'hard “t” with a puff', 'Curl your tongue back and add a burst of air.', w('ठंडा', 'thanda', 'cold'), G3),
  c('c-dda', 'ड', 'ḍa', 'a hard “d”, tongue curled back', 'Tongue curled back, voiced, with no puff of air.', w('डमरू', 'damru', 'small drum'), G3),
  c('c-ddha', 'ढ', 'ḍha', 'hard “d” with a puff', 'Tongue curled back, voiced, with a breath of air.', w('ढोल', 'dhol', 'drum'), G3),
  c('c-nna', 'ण', 'ṇa', 'a hard “n”, tongue curled back', 'Tongue curled back and nasal. It almost never starts a word.', w('बाण', 'baan', 'arrow'), G3),

  c('c-ta', 'त', 'ta', 'a soft “t”, tongue on teeth', 'Put the tip of your tongue against your upper teeth. It is not like the English t.', w('तारा', 'taara', 'star'), G4),
  c('c-tha', 'थ', 'tha', 'soft “t” with a puff', 'Tongue on teeth with a burst of air. It is not the English “th”.', w('थाली', 'thaali', 'plate'), G4),
  c('c-da', 'द', 'da', 'a soft “d”, tongue on teeth', 'Tongue against your upper teeth, voiced, with no puff of air.', w('दूध', 'doodh', 'milk'), G4),
  c('c-dha', 'ध', 'dha', 'soft “d” with a puff', 'Tongue on teeth, voiced, with a breath of air.', w('धनुष', 'dhanush', 'bow'), G4),
  c('c-na', 'न', 'na', '“n” in name', 'Tongue on the back of your upper teeth.', w('नाक', 'naak', 'nose'), G4),

  c('c-pa', 'प', 'pa', '“p” in spin', 'Lips pop with no puff of air.', w('पानी', 'paani', 'water'), G5),
  c('c-pha', 'फ', 'pha', '“p” in pot, with a puff', 'A strong burst of air. It is not the English f.', w('फल', 'phal', 'fruit'), G5),
  c('c-ba', 'ब', 'ba', '“b” in bat', 'Voiced and soft, with no puff of air.', w('बकरी', 'bakri', 'goat'), G5),
  c('c-bha', 'भ', 'bha', '“b” with a breathy puff', 'Say ब and release a breath of air with it.', w('भालू', 'bhaalu', 'bear'), G5),
  c('c-ma', 'म', 'ma', '“m” in moon', 'Lips together and hum.', w('मछली', 'machhli', 'fish'), G5),

  c('c-ya', 'य', 'ya', '“y” in yes', 'A gentle glide.', w('यात्रा', 'yaatra', 'journey'), G6),
  c('c-ra', 'र', 'ra', 'a tapped “r”', 'Tap the tip of your tongue once on the ridge behind your teeth, like the “tt” in butter.', w('राजा', 'raaja', 'king'), G6),
  c('c-la', 'ल', 'la', '“l” in light', 'Tongue tip touches behind your upper teeth.', w('लड्डू', 'laddoo', 'sweet ball'), G6),
  c('c-va', 'व', 'va', 'between “v” and “w”', 'Lips barely touch your teeth. It is softer than the English v.', w('वन', 'van', 'forest'), G6),

  c('c-sha', 'श', 'sha', '“sh” in ship', 'Tongue flat and wide.', w('शेर', 'sher', 'lion'), G7),
  c('c-ssa', 'ष', 'ṣha', '“sh” with the tongue curled back', 'Curl your tongue slightly back. It is used mostly in Sanskrit words.', w('षट्कोण', 'shatkon', 'hexagon'), G7),
  c('c-sa', 'स', 'sa', '“s” in sun', 'Clean and sharp.', w('सेब', 'seb', 'apple'), G7),
  c('c-ha', 'ह', 'ha', '“h” in home', 'A light breath from the throat.', w('हाथी', 'haathi', 'elephant'), G7),
];

const m = (id, ch, roman, sound, tip, word, mark) => ({ id, ch, roman, sound, tip, word, mark, group: 'Vowel signs on क' });

export const MATRAS = [
  m('m-aa', 'का', 'kaa', '“car”', 'The vertical line ा after the letter adds the long आ sound.', w('काम', 'kaam', 'work'), 'ा'),
  m('m-i', 'कि', 'ki', '“kit”', 'ि goes before the letter but is said after it: k + i.', w('किताब', 'kitaab', 'book'), 'ि'),
  m('m-ee', 'की', 'kee', '“key”', 'ी goes after the letter and makes a long ee.', w('कीमत', 'keemat', 'price'), 'ी'),
  m('m-u', 'कु', 'ku', '“cook”', 'ु sits under the letter for a short u.', w('कुत्ता', 'kutta', 'dog'), 'ु'),
  m('m-oo', 'कू', 'koo', '“cool”', 'ू sits under the letter for a long oo.', w('कूद', 'kood', 'jump'), 'ू'),
  m('m-e', 'के', 'ke', '“kay” (pure)', 'े sits above the letter and makes a pure e.', w('केला', 'kela', 'banana'), 'े'),
  m('m-ai', 'कै', 'kai', '“cat”, stretched', 'ै sits above the letter and makes the open ai.', w('कैसा', 'kaisa', 'how'), 'ै'),
  m('m-o', 'को', 'ko', '“coat” (pure)', 'ो is ा with a mark above it, and gives a pure o.', w('कोयल', 'koyal', 'koel bird'), 'ो'),
  m('m-au', 'कौ', 'kau', '“caw”', 'ौ is ा with two marks above it, and gives au.', w('कौआ', 'kauaa', 'crow'), 'ौ'),
  m('m-an', 'कं', 'kan', 'k + nasal hum', 'The dot ं above adds a nasal hum at the end.', w('कंधा', 'kandha', 'shoulder'), 'ं'),
];

export const TRACKS = [
  { id: 'vowels', title: 'Vowels', hi: 'स्वर', blurb: 'The 13 sounds everything else is built on.', items: VOWELS, glyph: 'अ' },
  { id: 'consonants', title: 'Consonants', hi: 'व्यंजन', blurb: 'Every consonant, grouped by where it is made.', items: CONSONANTS, glyph: 'क' },
  { id: 'matras', title: 'Vowel signs', hi: 'मात्रा', blurb: 'See how vowels attach to letters to build syllables.', items: MATRAS, glyph: 'ा' },
];

export const ALL_ITEMS = TRACKS.flatMap((t) => t.items.map((it) => ({ ...it, trackId: t.id })));

// Sounds that are easy to mix up. We play a syllable and you pick which one you heard.
const byId = Object.fromEntries(CONSONANTS.map((x) => [x.id, x]));
const pair = (a, b, hint) => ({ a: byId[a], b: byId[b], hint });

export const TRICKY_PAIRS = [
  pair('c-ka', 'c-kha', 'Does the sound end with a puff of air? ख does.'),
  pair('c-ga', 'c-gha', 'घ has a breathy release. ग is clean.'),
  pair('c-cha', 'c-chha', 'छ has the stronger burst of air.'),
  pair('c-ja', 'c-jha', 'झ is breathy. ज is clean.'),
  pair('c-tta', 'c-ttha', 'ठ has the puff of air.'),
  pair('c-dda', 'c-ddha', 'ढ has the breathy release.'),
  pair('c-ta', 'c-tta', 'त is soft, with the tongue on your teeth. ट is hard, with the tongue curled back.'),
  pair('c-da', 'c-dda', 'द is soft and on the teeth. ड is hard and curled back.'),
  pair('c-ta', 'c-tha', 'थ has the extra puff of air.'),
  pair('c-da', 'c-dha', 'ध is breathy.'),
  pair('c-pa', 'c-pha', 'फ has the puff of air. It is not an f.'),
  pair('c-ba', 'c-bha', 'भ has the breathy release.'),
];
