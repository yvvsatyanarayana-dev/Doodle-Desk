import { describe, expect, it, vi } from 'vitest';
import {
  GERMAN_GENDER_COLORS,
  GERMAN_VOCABULARY,
  GERMAN_CASE_DECLENSIONS,
  GERMAN_VERB_CONJUGATIONS,
  WORD_POWER_ROOTS,
  ENGLISH_ADVANCED_VOCABULARY,
  speakLanguageText,
  generateLanguageCardElements,
  generateLanguageTableElement,
  generateEtymologyTreeElements,
  createLanguageFlashcardDeck,
} from '../src/utils/languageLearningEngine.js';

describe('Language Learning Engine', () => {
  describe('German Grammar & Vocabulary Dictionary', () => {
    it('defines distinct gender color coding for der, die, das, and plural die', () => {
      expect(GERMAN_GENDER_COLORS.masculine.article).toBe('der');
      expect(GERMAN_GENDER_COLORS.masculine.color).toBe('#3b82f6'); // Blue

      expect(GERMAN_GENDER_COLORS.feminine.article).toBe('die');
      expect(GERMAN_GENDER_COLORS.feminine.color).toBe('#f43f5e'); // Rose

      expect(GERMAN_GENDER_COLORS.neuter.article).toBe('das');
      expect(GERMAN_GENDER_COLORS.neuter.color).toBe('#10b981'); // Emerald

      expect(GERMAN_GENDER_COLORS.plural.article).toBe('die (pl)');
    });

    it('contains curated German A1-B1 vocabulary with complete linguistic metadata', () => {
      expect(GERMAN_VOCABULARY.length).toBeGreaterThanOrEqual(10);
      const apfel = GERMAN_VOCABULARY.find((v) => v.word === 'Apfel');
      expect(apfel).toBeDefined();
      expect(apfel.article).toBe('der');
      expect(apfel.gender).toBe('masculine');
      expect(apfel.plural).toBe('die Äpfel');
      expect(apfel.english).toBe('apple');
      expect(apfel.ipa).toBeTruthy();
      expect(apfel.exampleDe).toBeTruthy();
    });

    it('provides full German case declension matrix (Nom, Akk, Dat, Gen)', () => {
      expect(GERMAN_CASE_DECLENSIONS.columns).toHaveLength(5);
      expect(GERMAN_CASE_DECLENSIONS.rows).toHaveLength(4);
      const nom = GERMAN_CASE_DECLENSIONS.rows.find((r) => r.id === 'row_nom');
      expect(nom.cells.col_masc).toBe('der');
      expect(nom.cells.col_fem).toBe('die');
      expect(nom.cells.col_neut).toBe('das');

      const akk = GERMAN_CASE_DECLENSIONS.rows.find((r) => r.id === 'row_akk');
      expect(akk.cells.col_masc).toBe('den');
    });

    it('provides German irregular and modal verb conjugations', () => {
      const sein = GERMAN_VERB_CONJUGATIONS.find((v) => v.verb === 'sein');
      expect(sein).toBeDefined();
      expect(sein.conjugations.ich).toBe('bin');
      expect(sein.conjugations.du).toBe('bist');
      expect(sein.conjugations.er_sie_es).toBe('ist');
      expect(sein.conjugations.wir).toBe('sind');
    });
  });

  describe('English Word Power Made Easy Etymology Roots', () => {
    it('contains core Greek/Latin roots with breakdown and derivatives', () => {
      expect(WORD_POWER_ROOTS.length).toBeGreaterThanOrEqual(6);
      const phil = WORD_POWER_ROOTS.find((r) => r.root === 'PHIL');
      expect(phil).toBeDefined();
      expect(phil.meaning).toContain('Love');
      expect(phil.derivatives.length).toBeGreaterThanOrEqual(4);

      const philosopher = phil.derivatives.find((d) => d.word === 'Philosopher');
      expect(philosopher.breakdown).toContain('phil');
      expect(philosopher.breakdown).toContain('sophia');
    });

    it('contains advanced GRE/TOEFL vocabulary entries', () => {
      expect(ENGLISH_ADVANCED_VOCABULARY.length).toBeGreaterThanOrEqual(5);
      const perspicacious = ENGLISH_ADVANCED_VOCABULARY.find((v) => v.word === 'Perspicacious');
      expect(perspicacious).toBeDefined();
      expect(perspicacious.synonyms.length).toBeGreaterThanOrEqual(2);
      expect(perspicacious.definition).toBeTruthy();
    });
  });

  describe('Canvas Element Generators', () => {
    it('generates an authentic canvas Study Card frame with word, meaning and examples', () => {
      const apfel = GERMAN_VOCABULARY.find((v) => v.word === 'Apfel');
      const elements = generateLanguageCardElements(apfel, { startX: 100, startY: 100, theme: 'dark' });

      expect(elements.length).toBeGreaterThanOrEqual(5);
      const frame = elements.find((e) => e.type === 'frame');
      expect(frame).toBeDefined();
      expect(frame.x).toBe(100);
      expect(frame.y).toBe(100);
      expect(frame.strokeColor).toBe(GERMAN_GENDER_COLORS.masculine.color); // Matches der Apfel

      const wordText = elements.find((e) => e.type === 'text' && e.text.includes('Apfel'));
      expect(wordText).toBeDefined();
      expect(wordText.frameId).toBe(frame.id);
    });

    it('generates an interactive table element for German declensions', () => {
      const table = generateLanguageTableElement(GERMAN_CASE_DECLENSIONS, { startX: 150, startY: 150 });
      expect(table.docType).toBe('interactive_table');
      expect(table.tableData.columns).toHaveLength(5);
      expect(table.tableData.rows).toHaveLength(4);
    });

    it('generates a radiating Word Power etymology tree with central root and connected derivatives', () => {
      const phil = WORD_POWER_ROOTS.find((r) => r.root === 'PHIL');
      const treeElements = generateEtymologyTreeElements(phil, { startX: 400, startY: 300, theme: 'dark' });

      // Root box
      const rootNode = treeElements.find((e) => e.type === 'rectangle' && e.id.startsWith('root_node_'));
      expect(rootNode).toBeDefined();

      // Derivative boxes
      const derivBoxes = treeElements.filter((e) => e.type === 'rectangle' && e.id.startsWith('deriv_'));
      expect(derivBoxes.length).toBe(phil.derivatives.length);

      // Connecting arrows
      const arrows = treeElements.filter((e) => e.type === 'arrow');
      expect(arrows.length).toBe(phil.derivatives.length);
    });

    it('creates an exportable Flashcard deck formatted for InteractiveTableFlashcardsModal', () => {
      const deck = createLanguageFlashcardDeck(GERMAN_VOCABULARY.slice(0, 5), 'German A1');
      expect(deck.docType).toBe('interactive_table');
      expect(deck.tableData.columns).toHaveLength(3);
      expect(deck.tableData.rows).toHaveLength(5);
      expect(deck.tableData.rows[0].cells.col_front).toBeTruthy();
      expect(deck.tableData.rows[0].cells.col_back).toBeTruthy();
    });
  });

  describe('Offline Speech Synthesis', () => {
    it('safely handles audio pronunciation in node/headless environment without crashing', () => {
      const result = speakLanguageText('Guten Tag', 'de-DE');
      // In Node test environment, window.speechSynthesis is undefined or mocked, returns false gracefully
      expect(typeof result).toBe('boolean');
    });
  });
});
