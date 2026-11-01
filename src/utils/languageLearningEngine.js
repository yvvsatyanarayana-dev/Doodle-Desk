/**
 * Language Learning Engine
 * Core data dictionary and canvas generators for human language learning:
 * - German (Deutsch): Grammatical gender color-coding (der/die/das), case declensions, verb conjugations
 * - English (Word Power Made Easy style): Latin/Greek etymology roots, derivative trees, advanced vocabulary
 * - Spanish & French: Gender, articles, core verb matrices
 * - Offline SpeechSynthesis TTS for pronunciation
 * - Canvas generators for Study Cards, Declension Tables, and Etymology Mind Maps
 */

export const GERMAN_GENDER_COLORS = {
  masculine: {
    article: 'der',
    color: '#3b82f6', // Royal Blue
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
    label: 'Maskulin (der)',
  },
  feminine: {
    article: 'die',
    color: '#f43f5e', // Rose / Red
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
    label: 'Feminin (die)',
  },
  neuter: {
    article: 'das',
    color: '#10b981', // Emerald Green
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    label: 'Neutrum (das)',
  },
  plural: {
    article: 'die (pl)',
    color: '#8b5cf6', // Violet / Purple
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
    label: 'Plural (die)',
  },
};

// ── German Core Vocabulary (A1-B1) ──
export const GERMAN_VOCABULARY = [
  {
    id: 'de_apfel',
    word: 'Apfel',
    article: 'der',
    gender: 'masculine',
    plural: 'die Äpfel',
    english: 'apple',
    ipa: '/ˈapfl̩/',
    level: 'A1',
    exampleDe: 'Der rote Apfel schmeckt sehr süß.',
    exampleEn: 'The red apple tastes very sweet.',
    notes: 'Akkusativ: den Apfel | Dativ: dem Apfel',
  },
  {
    id: 'de_haus',
    word: 'Haus',
    article: 'das',
    gender: 'neuter',
    plural: 'die Häuser',
    english: 'house',
    ipa: '/haʊ̯s/',
    level: 'A1',
    exampleDe: 'Wir wohnen in einem kleinen Haus.',
    exampleEn: 'We live in a small house.',
    notes: 'Dativ: dem Haus | Genitiv: des Hauses',
  },
  {
    id: 'de_zeit',
    word: 'Zeit',
    article: 'die',
    gender: 'feminine',
    plural: 'die Zeiten',
    english: 'time',
    ipa: '/tsaɪ̯t/',
    level: 'A1',
    exampleDe: 'Ich habe heute leider keine Zeit.',
    exampleEn: 'Unfortunately I have no time today.',
    notes: 'Dativ: der Zeit | Akkusativ: die Zeit',
  },
  {
    id: 'de_buch',
    word: 'Buch',
    article: 'das',
    gender: 'neuter',
    plural: 'die Bücher',
    english: 'book',
    ipa: '/buːx/',
    level: 'A1',
    exampleDe: 'Dieses Buch ist sehr interessant.',
    exampleEn: 'This book is very interesting.',
    notes: 'Dativ: dem Buch | Akkusativ: das Buch',
  },
  {
    id: 'de_hund',
    word: 'Hund',
    article: 'der',
    gender: 'masculine',
    plural: 'die Hunde',
    english: 'dog',
    ipa: '/hʊnt/',
    level: 'A1',
    exampleDe: 'Der Hund spielt gerne im Garten.',
    exampleEn: 'The dog likes playing in the garden.',
    notes: 'Akkusativ: den Hund | Dativ: dem Hund',
  },
  {
    id: 'de_katze',
    word: 'Katze',
    article: 'die',
    gender: 'feminine',
    plural: 'die Katzen',
    english: 'cat',
    ipa: '/ˈkatsə/',
    level: 'A1',
    exampleDe: 'Die Katze schläft auf dem Sofa.',
    exampleEn: 'The cat is sleeping on the sofa.',
    notes: 'Dativ: der Katze | Akkusativ: die Katze',
  },
  {
    id: 'de_wasser',
    word: 'Wasser',
    article: 'das',
    gender: 'neuter',
    plural: 'die Wässer',
    english: 'water',
    ipa: '/ˈvasɐ/',
    level: 'A1',
    exampleDe: 'Ein Glas kaltes Wasser, bitte.',
    exampleEn: 'A glass of cold water, please.',
    notes: 'Uncountable in most everyday contexts.',
  },
  {
    id: 'de_tisch',
    word: 'Tisch',
    article: 'der',
    gender: 'masculine',
    plural: 'die Tische',
    english: 'table',
    ipa: '/tɪʃ/',
    level: 'A1',
    exampleDe: 'Das Buch liegt auf dem Tisch.',
    exampleEn: 'The book is lying on the table.',
    notes: 'Two-way preposition "auf" takes Dative for location.',
  },
  {
    id: 'de_stadt',
    word: 'Stadt',
    article: 'die',
    gender: 'feminine',
    plural: 'die Städte',
    english: 'city / town',
    ipa: '/ʃtat/',
    level: 'A1',
    exampleDe: 'Berlin ist eine große, lebendige Stadt.',
    exampleEn: 'Berlin is a large, vibrant city.',
    notes: 'Plural adds Umlaut: Städte.',
  },
  {
    id: 'de_sprache',
    word: 'Sprache',
    article: 'die',
    gender: 'feminine',
    plural: 'die Sprachen',
    english: 'language / speech',
    ipa: '/ˈʃpʁaːxə/',
    level: 'A1',
    exampleDe: 'Deutsch ist eine faszinierende Sprache.',
    exampleEn: 'German is a fascinating language.',
    notes: 'Related to the verb sprechen (to speak).',
  },
  {
    id: 'de_freund',
    word: 'Freund',
    article: 'der',
    gender: 'masculine',
    plural: 'die Freunde',
    english: 'friend (male)',
    ipa: '/fʁɔɪ̯nt/',
    level: 'A1',
    exampleDe: 'Mein bester Freund lernt auch Deutsch.',
    exampleEn: 'My best friend is also learning German.',
    notes: 'Feminine counterpart: die Freundin (pl: die Freundinnen).',
  },
  {
    id: 'de_leben',
    word: 'Leben',
    article: 'das',
    gender: 'neuter',
    plural: 'die Leben',
    english: 'life',
    ipa: '/ˈleːbn̩/',
    level: 'A2',
    exampleDe: 'Das Leben ist voller Überraschungen.',
    exampleEn: 'Life is full of surprises.',
    notes: 'Nominalized infinitive of leben (to live). All infinitive nouns are das!',
  },
];

// ── German Case Declensions Matrix ──
export const GERMAN_CASE_DECLENSIONS = {
  title: 'German Definite Articles Declension (Der / Die / Das / Die)',
  columns: [
    { id: 'col_case', title: 'Case (Kasus)', width: 140 },
    { id: 'col_masc', title: 'Masculine (der)', width: 160 },
    { id: 'col_fem', title: 'Feminine (die)', width: 160 },
    { id: 'col_neut', title: 'Neuter (das)', width: 160 },
    { id: 'col_plur', title: 'Plural (die)', width: 160 },
  ],
  rows: [
    {
      id: 'row_nom',
      cells: {
        col_case: 'Nominativ (Subject)',
        col_masc: 'der',
        col_fem: 'die',
        col_neut: 'das',
        col_plur: 'die',
      },
    },
    {
      id: 'row_akk',
      cells: {
        col_case: 'Akkusativ (Direct Obj)',
        col_masc: 'den',
        col_fem: 'die',
        col_neut: 'das',
        col_plur: 'die',
      },
    },
    {
      id: 'row_dat',
      cells: {
        col_case: 'Dativ (Indirect Obj)',
        col_masc: 'dem',
        col_fem: 'der',
        col_neut: 'dem',
        col_plur: 'den (+n)',
      },
    },
    {
      id: 'row_gen',
      cells: {
        col_case: 'Genitiv (Possession)',
        col_masc: 'des (+s/es)',
        col_fem: 'der',
        col_neut: 'des (+s/es)',
        col_plur: 'der',
      },
    },
  ],
};

// ── German Verb Conjugations ──
export const GERMAN_VERB_CONJUGATIONS = [
  {
    verb: 'sein',
    english: 'to be (irregular)',
    conjugations: {
      ich: 'bin',
      du: 'bist',
      er_sie_es: 'ist',
      wir: 'sind',
      ihr: 'seid',
      sie_Sie: 'sind',
    },
    example: 'Ich bin Student in Kakinada.',
  },
  {
    verb: 'haben',
    english: 'to have',
    conjugations: {
      ich: 'habe',
      du: 'hast',
      er_sie_es: 'hat',
      wir: 'haben',
      ihr: 'habt',
      sie_Sie: 'haben',
    },
    example: 'Wir haben ein neues Whiteboard.',
  },
  {
    verb: 'werden',
    english: 'to become / will',
    conjugations: {
      ich: 'werde',
      du: 'wirst',
      er_sie_es: 'wird',
      wir: 'werden',
      ihr: 'werdet',
      sie_Sie: 'werden',
    },
    example: 'Es wird jeden Tag besser.',
  },
  {
    verb: 'können',
    english: 'can / to be able to (modal)',
    conjugations: {
      ich: 'kann',
      du: 'kannst',
      er_sie_es: 'kann',
      wir: 'können',
      ihr: 'könnt',
      sie_Sie: 'können',
    },
    example: 'Ich kann Deutsch und Englisch sprechen.',
  },
  {
    verb: 'sprechen',
    english: 'to speak (vowel change e->i)',
    conjugations: {
      ich: 'spreche',
      du: 'sprichst',
      er_sie_es: 'spricht',
      wir: 'sprechen',
      ihr: 'sprecht',
      sie_Sie: 'sprechen',
    },
    example: 'Sprichst du Deutsch?',
  },
];

// ── English Word Power Made Easy Root Trees ──
export const WORD_POWER_ROOTS = [
  {
    id: 'root_phil',
    root: 'PHIL',
    origin: 'Greek (philos)',
    meaning: 'Love, Affinity, Fondness',
    badgeColor: '#8b5cf6',
    derivatives: [
      {
        word: 'Philosopher',
        partOfSpeech: 'noun',
        breakdown: 'phil (love) + sophia (wisdom)',
        definition: 'A lover of wisdom; one who seeks enlightenment and truth.',
        example: 'Socrates was an ancient Greek philosopher.',
      },
      {
        word: 'Philanthropist',
        partOfSpeech: 'noun',
        breakdown: 'phil (love) + anthropos (humanity)',
        definition: 'One who donates money, time, and effort to benefit humanity.',
        example: 'The philanthropist built free clinics across the region.',
      },
      {
        word: 'Bibliophile',
        partOfSpeech: 'noun',
        breakdown: 'biblion (book) + phile (lover)',
        definition: 'A lover and collector of books.',
        example: 'As a bibliophile, his shelves held thousands of rare editions.',
      },
      {
        word: 'Philharmonic',
        partOfSpeech: 'adjective',
        breakdown: 'phil (love) + harmonia (music/harmony)',
        definition: 'Devoted to music; symphony orchestra organization.',
        example: 'They attended a concert by the Berlin Philharmonic.',
      },
      {
        word: 'Philology',
        partOfSpeech: 'noun',
        breakdown: 'phil (love) + logos (word/speech)',
        definition: 'The study of language history and literary texts.',
        example: 'Comparative philology reveals how German and English are related.',
      },
    ],
  },
  {
    id: 'root_chron',
    root: 'CHRON',
    origin: 'Greek (chronos)',
    meaning: 'Time',
    badgeColor: '#06b6d4',
    derivatives: [
      {
        word: 'Chronology',
        partOfSpeech: 'noun',
        breakdown: 'chron (time) + logos (study)',
        definition: 'The arrangement of events in the exact order of occurrence.',
        example: 'The museum displayed artifacts in chronological sequence.',
      },
      {
        word: 'Synchronize',
        partOfSpeech: 'verb',
        breakdown: 'syn (together) + chron (time)',
        definition: 'To cause to occur or operate at the exact same time.',
        example: 'We synchronized our watches before starting the experiment.',
      },
      {
        word: 'Chronic',
        partOfSpeech: 'adjective',
        breakdown: 'chron (time) + ic (characterized by)',
        definition: 'Persisting for a long period of time or recurring constantly.',
        example: 'He suffered from chronic back pain.',
      },
      {
        word: 'Anachronism',
        partOfSpeech: 'noun',
        breakdown: 'ana (against/back) + chron (time)',
        definition: 'A thing belonging to a period other than that in which it exists.',
        example: 'A smartphone in a medieval drama is a glaring anachronism.',
      },
    ],
  },
  {
    id: 'root_bene',
    root: 'BENE / BON',
    origin: 'Latin (bene)',
    meaning: 'Good, Well, Advantageous',
    badgeColor: '#10b981',
    derivatives: [
      {
        word: 'Benefactor',
        partOfSpeech: 'noun',
        breakdown: 'bene (well) + factor (maker/doer)',
        definition: 'A person who gives money or other help to a person or cause.',
        example: 'The academy was founded by a generous benefactor.',
      },
      {
        word: 'Benevolent',
        partOfSpeech: 'adjective',
        breakdown: 'bene (well) + volens (wishing)',
        definition: 'Well-meaning, kindly, and charitable.',
        example: 'A benevolent leader prioritizes the welfare of the community.',
      },
      {
        word: 'Beneficial',
        partOfSpeech: 'adjective',
        breakdown: 'bene (well) + facere (to make)',
        definition: 'Favorable, resulting in good or producing positive effects.',
        example: 'Daily exercise is immensely beneficial for mental clarity.',
      },
      {
        word: 'Benediction',
        partOfSpeech: 'noun',
        breakdown: 'bene (well) + dictio (speaking)',
        definition: 'The utterance of a good blessing or expression of good wishes.',
        example: 'The gathering ended with a heartfelt benediction.',
      },
    ],
  },
  {
    id: 'root_mal',
    root: 'MAL',
    origin: 'Latin (malus)',
    meaning: 'Bad, Evil, Ill, Wrong',
    badgeColor: '#ef4444',
    derivatives: [
      {
        word: 'Malevolent',
        partOfSpeech: 'adjective',
        breakdown: 'mal (evil) + volens (wishing)',
        definition: 'Having or showing a wish to do evil to others.',
        example: 'The villain cast a malevolent glare across the room.',
      },
      {
        word: 'Malicious',
        partOfSpeech: 'adjective',
        breakdown: 'mal (bad) + ic (pertaining to)',
        definition: 'Characterized by malice; intending to do harm.',
        example: 'The firewall blocked a malicious cyber attack.',
      },
      {
        word: 'Malady',
        partOfSpeech: 'noun',
        breakdown: 'mal (ill) + habitus (condition)',
        definition: 'A disease or ailment; a deeply rooted disorder.',
        example: 'Poverty was a persistent social malady of the era.',
      },
      {
        word: 'Malapropism',
        partOfSpeech: 'noun',
        breakdown: 'mal (badly) + a propos (to the purpose)',
        definition: 'Humorous misuse of a word in mistake for one that sounds similar.',
        example: 'Saying "dance a flamingo" instead of "flamenco" is a classic malapropism.',
      },
    ],
  },
  {
    id: 'root_dict',
    root: 'DICT',
    origin: 'Latin (dicere)',
    meaning: 'To Say, Speak, Proclaim',
    badgeColor: '#f59e0b',
    derivatives: [
      {
        word: 'Predict',
        partOfSpeech: 'verb',
        breakdown: 'pre (before) + dict (say)',
        definition: 'To say or estimate that an event will happen in the future.',
        example: 'Economists predict steady growth over the next quarter.',
      },
      {
        word: 'Contradict',
        partOfSpeech: 'verb',
        breakdown: 'contra (against) + dict (say)',
        definition: 'To assert the opposite of a statement made by someone.',
        example: 'Her recent actions contradict her stated principles.',
      },
      {
        word: 'Verdict',
        partOfSpeech: 'noun',
        breakdown: 'verus (true) + dict (saying)',
        definition: 'A decision or formal proclamation of truth by a jury or judge.',
        example: 'The jury deliberated for hours before announcing their verdict.',
      },
      {
        word: 'Dictate',
        partOfSpeech: 'verb',
        breakdown: 'dict (speak) + ate (cause)',
        definition: 'To lay down authoritatively; prescribe with power.',
        example: 'Logic dictates that we evaluate every option thoroughly.',
      },
    ],
  },
  {
    id: 'root_anthrop',
    root: 'ANTHROP',
    origin: 'Greek (anthropos)',
    meaning: 'Human Being, Mankind',
    badgeColor: '#ec4899',
    derivatives: [
      {
        word: 'Anthropology',
        partOfSpeech: 'noun',
        breakdown: 'anthropos (human) + logos (study)',
        definition: 'The comprehensive scientific study of humans and societies.',
        example: 'Cultural anthropology examines customs across civilizations.',
      },
      {
        word: 'Misanthrope',
        partOfSpeech: 'noun',
        breakdown: 'misein (to hate) + anthropos (human)',
        definition: 'A person who dislikes or distrusts humankind and avoids society.',
        example: 'The hermit lived as a misanthrope high in the mountains.',
      },
      {
        word: 'Anthropomorphic',
        partOfSpeech: 'adjective',
        breakdown: 'anthropos (human) + morphe (form)',
        definition: 'Having human characteristics, feelings, or behavior.',
        example: 'Animated films often star anthropomorphic animals.',
      },
    ],
  },
  {
    id: 'root_psyche',
    root: 'PSYCHE',
    origin: 'Greek (psukhe)',
    meaning: 'Mind, Soul, Spirit',
    badgeColor: '#6366f1',
    derivatives: [
      {
        word: 'Psychology',
        partOfSpeech: 'noun',
        breakdown: 'psyche (mind) + logos (study)',
        definition: 'The scientific study of the human mind and its behavioral patterns.',
        example: 'Cognitive psychology explores memory, attention, and reasoning.',
      },
      {
        word: 'Psychosomatic',
        partOfSpeech: 'adjective',
        breakdown: 'psyche (mind) + soma (body)',
        definition: 'Caused or aggravated by a mental factor such as internal stress.',
        example: 'His recurring stomach ache proved to be psychosomatic.',
      },
      {
        word: 'Psychiatrist',
        partOfSpeech: 'noun',
        breakdown: 'psyche (mind) + iatros (physician)',
        definition: 'A medical doctor specializing in the diagnosis of mental disorders.',
        example: 'The psychiatrist recommended therapeutic counseling.',
      },
    ],
  },
  {
    id: 'root_vert',
    root: 'VERT / VERS',
    origin: 'Latin (vertere)',
    meaning: 'To Turn',
    badgeColor: '#14b8a6',
    derivatives: [
      {
        word: 'Introvert',
        partOfSpeech: 'noun / adj',
        breakdown: 'intro (inward) + vert (turn)',
        definition: 'A person whose interest is generally directed inward toward their own thoughts.',
        example: 'As an introvert, he recharges best during quiet solo study sessions.',
      },
      {
        word: 'Extrovert',
        partOfSpeech: 'noun / adj',
        breakdown: 'extro (outward) + vert (turn)',
        definition: 'An outgoing, socially expressive person energized by crowds.',
        example: 'The extrovert thrived in collaborative hackathons.',
      },
      {
        word: 'Ambivert',
        partOfSpeech: 'noun',
        breakdown: 'ambi (both) + vert (turn)',
        definition: 'A person with a balanced blend of both introverted and extroverted traits.',
        example: 'Most engineers are ambiverts who balance deep focus with teamwork.',
      },
      {
        word: 'Subvert',
        partOfSpeech: 'verb',
        breakdown: 'sub (under) + vertere (turn)',
        definition: 'To undermine the power, authority, or conventional expectation.',
        example: 'The novel subverted classic storytelling clichés.',
      },
    ],
  },
];

// ── English Advanced Vocabulary ──
export const ENGLISH_ADVANCED_VOCABULARY = [
  {
    id: 'en_perspicacious',
    word: 'Perspicacious',
    partOfSpeech: 'adjective',
    ipa: '/ˌpɜː.spɪˈkeɪ.ʃəs/',
    root: 'perspicere (Latin: to look through)',
    definition: 'Having keen mental perception and understanding; discerning.',
    synonyms: ['Insightful', 'Astute', 'Shrewd', 'Perceptive'],
    antonyms: ['Dense', 'Oblivious', 'Myopic'],
    example: 'Her perspicacious architectural design solved the scaling bottleneck instantly.',
  },
  {
    id: 'en_equanimity',
    word: 'Equanimity',
    partOfSpeech: 'noun',
    ipa: '/ˌek.wəˈnɪm.ə.ti/',
    root: 'aequus (equal) + animus (mind)',
    definition: 'Mental calmness, composure, and evenness of temper, especially in a difficult situation.',
    synonyms: ['Serenity', 'Composure', 'Placidity', 'Equilibrium'],
    antonyms: ['Agitation', 'Panic', 'Turbulence'],
    example: 'He handled the server outage with remarkable equanimity.',
  },
  {
    id: 'en_loquacious',
    word: 'Loquacious',
    partOfSpeech: 'adjective',
    ipa: '/ləʊˈkweɪ.ʃəs/',
    root: 'loqui (Latin: to speak)',
    definition: 'Tending to talk a great deal; talkative.',
    synonyms: ['Garrulous', 'Voluble', 'Chatty'],
    antonyms: ['Taciturn', 'Reticent', 'Laconic'],
    example: 'The loquacious host kept the dinner guests entertained all evening.',
  },
  {
    id: 'en_ephemeral',
    word: 'Ephemeral',
    partOfSpeech: 'adjective',
    ipa: '/ɪˈfem.ər.əl/',
    root: 'epi (upon) + hemera (day)',
    definition: 'Lasting for a very short time; transitory; fleeting.',
    synonyms: ['Fleeting', 'Transient', 'Evanescent', 'Momentary'],
    antonyms: ['Enduring', 'Permanent', 'Perennial'],
    example: 'The beauty of the cherry blossoms is ephemeral.',
  },
  {
    id: 'en_ubiquitous',
    word: 'Ubiquitous',
    partOfSpeech: 'adjective',
    ipa: '/juːˈbɪk.wɪ.təs/',
    root: 'ubique (Latin: everywhere)',
    definition: 'Present, appearing, or found everywhere at once.',
    synonyms: ['Omnipresent', 'Pervasive', 'Prevalent'],
    antonyms: ['Rare', 'Scarce', 'Localized'],
    example: 'Smartphones have become ubiquitous in modern society.',
  },
  {
    id: 'en_pragmatic',
    word: 'Pragmatic',
    partOfSpeech: 'adjective',
    ipa: '/præɡˈmæt.ɪk/',
    root: 'pragma (Greek: deed, act)',
    definition: 'Dealing with things sensibly and realistically in a way based on practical considerations.',
    synonyms: ['Practical', 'Realistic', 'Sensible', 'Hard-headed'],
    antonyms: ['Idealistic', 'Impractical', 'Utopian'],
    example: 'Taking a pragmatic approach saved the team months of unnecessary refactoring.',
  },
];

// ── Spanish & French Starter Modules ──
export const SPANISH_VOCABULARY = [
  {
    id: 'es_tiempo',
    word: 'tiempo',
    article: 'el',
    gender: 'masculine',
    plural: 'los tiempos',
    english: 'time / weather',
    example: 'El tiempo vuela cuando disfrutas lo que haces.',
  },
  {
    id: 'es_vida',
    word: 'vida',
    article: 'la',
    gender: 'feminine',
    plural: 'las vidas',
    english: 'life',
    example: 'La vida es un hermoso viaje de aprendizaje.',
  },
  {
    id: 'es_palabra',
    word: 'palabra',
    article: 'la',
    gender: 'feminine',
    plural: 'las palabras',
    english: 'word',
    example: 'Una imagen vale más que mil palabras.',
  },
];

export const FRENCH_VOCABULARY = [
  {
    id: 'fr_temps',
    word: 'temps',
    article: 'le',
    gender: 'masculine',
    english: 'time / weather',
    example: 'Le temps passe tellement vite.',
  },
  {
    id: 'fr_vie',
    word: 'vie',
    article: 'la',
    gender: 'feminine',
    english: 'life',
    example: 'C\'est la vie, pleine de surprises.',
  },
  {
    id: 'fr_livre',
    word: 'livre',
    article: 'le',
    gender: 'masculine',
    english: 'book',
    example: 'Ce livre est passionnant.',
  },
];

// ── 100% Offline Audio Pronunciation using SpeechSynthesis ──
export function speakLanguageText(text, lang = 'de-DE') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  try {
    window.speechSynthesis.cancel(); // Stop any pending utterances
    const clean = text.replace(/^[a-z]{3}\s+/i, '').trim(); // Remove articles if present
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 0.92; // Slightly measured pace for language learning
    utterance.pitch = 1.0;

    // Pick best native voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetPrefix = lang.split('-')[0].toLowerCase();
    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase() === lang.toLowerCase() || v.lang.toLowerCase().startsWith(targetPrefix)
    );
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
    return false;
  }
}

// ── Canvas Element Generators ──

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generates an authentic canvas Study Card (Frame with contained text and badge)
 */
export function generateLanguageCardElements(item, options = {}) {
  const { startX = 200, startY = 200, theme = 'dark' } = options;
  const isDark = theme === 'dark';
  const isGerman = !!item.article && ['der', 'die', 'das'].includes(item.article.toLowerCase());
  const genderKey = item.gender || (item.article === 'der' ? 'masculine' : (item.article === 'die' ? 'feminine' : 'neuter'));
  const genderStyle = GERMAN_GENDER_COLORS[genderKey] || {
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    label: item.article || 'Vocab',
  };

  const frameId = 'lang_frame_' + generateId();
  const cardWidth = 360;
  const cardHeight = 240;

  // Outer frame
  const frameEl = {
    id: frameId,
    type: 'frame',
    name: `${item.article ? item.article.toUpperCase() + ' ' : ''}${item.word} [${item.english || ''}]`,
    x: startX,
    y: startY,
    width: cardWidth,
    height: cardHeight,
    strokeColor: isGerman ? genderStyle.color : (isDark ? '#38bdf8' : '#0284c7'),
    backgroundColor: isDark ? '#141418' : '#ffffff',
    fillStyle: 'solid',
    strokeWidth: 2,
    roundness: { type: 2 },
    isDeleted: false,
  };

  // Header word text
  const titleText = isGerman ? `${item.article} ${item.word}` : item.word;
  const wordEl = {
    id: 'text_' + generateId(),
    type: 'text',
    frameId,
    x: startX + 24,
    y: startY + 24,
    text: titleText,
    fontSize: 26,
    fontFamily: 1, // Virgil / Handwritten
    strokeColor: isGerman ? genderStyle.color : (isDark ? '#f4f4f5' : '#18181b'),
    isDeleted: false,
  };

  // Phonetic / Subtitle
  const subContent = [
    item.ipa ? item.ipa : '',
    item.plural ? `pl: ${item.plural}` : '',
    item.partOfSpeech ? `(${item.partOfSpeech})` : '',
  ].filter(Boolean).join('  •  ');

  const subEl = {
    id: 'text_' + generateId(),
    type: 'text',
    frameId,
    x: startX + 24,
    y: startY + 62,
    text: subContent || item.english,
    fontSize: 14,
    fontFamily: 2, // Helvetica
    strokeColor: isDark ? '#a1a1aa' : '#71717a',
    isDeleted: false,
  };

  // English Meaning
  const meaningEl = {
    id: 'text_' + generateId(),
    type: 'text',
    frameId,
    x: startX + 24,
    y: startY + 92,
    text: `Meaning:  ${item.english || item.definition || ''}`,
    fontSize: 16,
    fontFamily: 1,
    strokeColor: isDark ? '#e4e4e7' : '#27272a',
    isDeleted: false,
  };

  // Example sentence (Target language)
  const exDe = item.exampleDe || item.example || '';
  const exampleEl = {
    id: 'text_' + generateId(),
    type: 'text',
    frameId,
    x: startX + 24,
    y: startY + 130,
    text: `"${exDe}"`,
    fontSize: 14,
    fontFamily: 2,
    strokeColor: isDark ? '#38bdf8' : '#0369a1',
    isDeleted: false,
  };

  // Example translation (English)
  const exEn = item.exampleEn || item.notes || '';
  const transEl = {
    id: 'text_' + generateId(),
    type: 'text',
    frameId,
    x: startX + 24,
    y: startY + 160,
    text: exEn ? `→ ${exEn}` : '',
    fontSize: 13,
    fontFamily: 2,
    strokeColor: isDark ? '#71717a' : '#a1a1aa',
    isDeleted: false,
  };

  // Notes or Grammatical Declension hint
  const noteEl = {
    id: 'text_' + generateId(),
    type: 'text',
    frameId,
    x: startX + 24,
    y: startY + 195,
    text: item.notes ? `💡 ${item.notes}` : (item.breakdown ? `🔍 ${item.breakdown}` : ''),
    fontSize: 12,
    fontFamily: 2,
    strokeColor: isDark ? '#fbbf24' : '#d97706',
    isDeleted: false,
  };

  return [frameEl, wordEl, subEl, meaningEl, exampleEl, transEl, noteEl].filter(Boolean);
}

/**
 * Generates an Interactive Table element for Grammatical Cases or Verb Conjugations
 */
export function generateLanguageTableElement(tableSpec, options = {}) {
  const { startX = 200, startY = 200, theme = 'dark' } = options;
  const isDark = theme === 'dark';
  const tableId = 'lang_table_' + generateId();

  const totalWidth = tableSpec.columns.reduce((acc, c) => acc + (c.width || 160), 0) + 40;
  const totalHeight = (tableSpec.rows.length + 1) * 44 + 80;

  return {
    id: tableId,
    type: 'iframe',
    docType: 'interactive_table',
    title: tableSpec.title || 'Language Grammar Matrix',
    x: startX,
    y: startY,
    width: Math.max(680, totalWidth),
    height: Math.max(280, totalHeight),
    strokeColor: isDark ? '#ffffff' : '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    tableData: {
      columns: tableSpec.columns,
      rows: tableSpec.rows,
      showHeader: true,
      autoArrange: true,
    },
    isDeleted: false,
  };
}

/**
 * Generates a full Word Power Made Easy Root Mind Map:
 * Central Root node + Orthogonal/Radial branches to derivative cards
 */
export function generateEtymologyTreeElements(rootItem, options = {}) {
  const { startX = 400, startY = 300, theme = 'dark' } = options;
  const isDark = theme === 'dark';
  const elements = [];

  // 1. Central Root Node
  const rootNodeId = 'root_node_' + generateId();
  const rootW = 220;
  const rootH = 110;
  const rootX = startX - rootW / 2;
  const rootY = startY - rootH / 2;

  elements.push({
    id: rootNodeId,
    type: 'rectangle',
    x: rootX,
    y: rootY,
    width: rootW,
    height: rootH,
    strokeColor: rootItem.badgeColor || '#8b5cf6',
    backgroundColor: isDark ? '#1a102f' : '#f5f3ff',
    fillStyle: 'solid',
    strokeWidth: 3,
    roughness: 1,
    roundness: { type: 2 },
    isDeleted: false,
  });

  // Central Root Text
  elements.push({
    id: 'text_' + generateId(),
    type: 'text',
    x: rootX + 24,
    y: rootY + 20,
    text: `ROOT: ${rootItem.root}`,
    fontSize: 22,
    fontFamily: 1,
    strokeColor: rootItem.badgeColor || '#a855f7',
    isDeleted: false,
  });

  elements.push({
    id: 'text_' + generateId(),
    type: 'text',
    x: rootX + 24,
    y: rootY + 54,
    text: `${rootItem.origin}\n"${rootItem.meaning}"`,
    fontSize: 13,
    fontFamily: 2,
    strokeColor: isDark ? '#d4d4d8' : '#3f3f46',
    isDeleted: false,
  });

  // 2. Derivatives radiating outward
  const derivatives = rootItem.derivatives || [];
  const radiusX = 360;
  const radiusY = 240;
  const angleStep = (2 * Math.PI) / Math.max(1, derivatives.length);

  derivatives.forEach((deriv, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const cardW = 240;
    const cardH = 120;
    const cx = startX + Math.cos(angle) * radiusX;
    const cy = startY + Math.sin(angle) * radiusY;
    const cardX = Math.round(cx - cardW / 2);
    const cardY = Math.round(cy - cardH / 2);
    const cardId = 'deriv_' + idx + '_' + generateId();

    // Card shape
    elements.push({
      id: cardId,
      type: 'rectangle',
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      strokeColor: isDark ? '#3f3f46' : '#d4d4d8',
      backgroundColor: isDark ? '#18181b' : '#ffffff',
      fillStyle: 'solid',
      strokeWidth: 1.5,
      roundness: { type: 2 },
      isDeleted: false,
    });

    // Card Title
    elements.push({
      id: 'text_' + generateId(),
      type: 'text',
      x: cardX + 16,
      y: cardY + 14,
      text: deriv.word,
      fontSize: 18,
      fontFamily: 1,
      strokeColor: isDark ? '#38bdf8' : '#0284c7',
      isDeleted: false,
    });

    // Breakdown & Definition
    elements.push({
      id: 'text_' + generateId(),
      type: 'text',
      x: cardX + 16,
      y: cardY + 42,
      text: `${deriv.breakdown}\n${deriv.definition}`,
      fontSize: 12,
      fontFamily: 2,
      strokeColor: isDark ? '#a1a1aa' : '#52525b',
      isDeleted: false,
    });

    // Connecting Arrow from Central Root to Derivative Card
    const startPt = [startX, startY];
    const endPt = [cx, cy];
    elements.push({
      id: 'arrow_' + generateId(),
      type: 'arrow',
      x: startPt[0],
      y: startPt[1],
      width: endPt[0] - startPt[0],
      height: endPt[1] - startPt[1],
      points: [[0, 0], [endPt[0] - startPt[0], endPt[1] - startPt[1]]],
      strokeColor: rootItem.badgeColor || '#8b5cf6',
      strokeWidth: 1.5,
      strokeStyle: 'dashed',
      roughness: 1,
      isDeleted: false,
    });
  });

  return elements;
}

/**
 * Converts a list of language items into a table specification
 * directly playable in InteractiveTableFlashcardsModal
 */
export function createLanguageFlashcardDeck(items, lang = 'German') {
  const columns = [
    { id: 'col_front', title: `${lang} Term / Root`, width: 220 },
    { id: 'col_back', title: 'English Meaning & Usage', width: 340 },
    { id: 'col_extra', title: 'Grammar / Notes', width: 220 },
  ];

  const rows = items.map((item, idx) => {
    const isGerman = !!item.article;
    const frontText = isGerman
      ? `${item.article} ${item.word}`
      : (item.root ? `Root: ${item.root}` : item.word);

    const backText = item.english || item.meaning || item.definition || '';
    const extraText = [
      item.plural ? `pl: ${item.plural}` : '',
      item.ipa || '',
      item.notes || item.breakdown || '',
    ].filter(Boolean).join(' | ');

    return {
      id: `row_${idx}_${generateId()}`,
      cells: {
        col_front: frontText,
        col_back: backText,
        col_extra: extraText,
      },
    };
  });

  return {
    id: 'deck_table_' + generateId(),
    docType: 'interactive_table',
    title: `${lang} Language Flashcards Deck`,
    tableData: {
      columns,
      rows,
      showHeader: true,
      autoArrange: true,
    },
  };
}
