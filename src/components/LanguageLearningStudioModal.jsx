import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Volume2,
  Layers,
  Table,
  GitFork,
  Sparkles,
  BookOpen,
  Plus,
  Search,
  Languages,
  Check,
  RotateCcw,
  BookA,
} from 'lucide-react';
import {
  GERMAN_GENDER_COLORS,
  GERMAN_VOCABULARY,
  GERMAN_CASE_DECLENSIONS,
  GERMAN_VERB_CONJUGATIONS,
  WORD_POWER_ROOTS,
  ENGLISH_ADVANCED_VOCABULARY,
  SPANISH_VOCABULARY,
  FRENCH_VOCABULARY,
  speakLanguageText,
  generateLanguageCardElements,
  generateLanguageTableElement,
  generateEtymologyTreeElements,
  createLanguageFlashcardDeck,
} from '../utils/languageLearningEngine.js';

export function LanguageLearningStudioModal({
  isOpen,
  onClose,
  doodleAPI,
  onOpenFlashcards,
  onToast,
}) {
  const [activeTab, setActiveTab] = useState('german'); // 'german' | 'english' | 'global' | 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [germanFilter, setGermanFilter] = useState('all'); // 'all' | 'der' | 'die' | 'das' | 'cases' | 'verbs'
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Custom Card Creator Form State
  const [customLang, setCustomLang] = useState('German');
  const [customWord, setCustomWord] = useState('');
  const [customArticle, setCustomArticle] = useState('der');
  const [customIpa, setCustomIpa] = useState('');
  const [customMeaning, setCustomMeaning] = useState('');
  const [customExample, setCustomExample] = useState('');
  const [customExampleEn, setCustomExampleEn] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  if (!isOpen) return null;

  // Audio Pronunciation Handler
  const handleSpeak = (text, langCode, itemId) => {
    setActiveAudioId(itemId);
    speakLanguageText(text, langCode);
    setTimeout(() => setActiveAudioId(null), 1200);
  };

  // Canvas Insertion Handlers
  const handleInsertCard = (item, lang = 'de') => {
    if (!doodleAPI) {
      onToast?.('Canvas API unavailable');
      return;
    }
    const elements = generateLanguageCardElements(item, {
      startX: 240 + Math.floor(Math.random() * 80),
      startY: 200 + Math.floor(Math.random() * 60),
      theme: 'dark',
    });
    const current = doodleAPI.getSceneElements?.() || [];
    doodleAPI.updateScene?.({ elements: [...current, ...elements] });
    onToast?.(`Inserted "${item.word || item.root}" Study Card to canvas`);
    setCopiedId(item.id || item.word);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleInsertCaseTable = () => {
    if (!doodleAPI) return;
    const tableEl = generateLanguageTableElement(GERMAN_CASE_DECLENSIONS, {
      startX: 180,
      startY: 180,
      theme: 'dark',
    });
    const current = doodleAPI.getSceneElements?.() || [];
    doodleAPI.updateScene?.({ elements: [...current, tableEl] });
    onToast?.('Inserted German Case Declension Table to canvas');
  };

  const handleInsertVerbTable = (verbItem) => {
    if (!doodleAPI) return;
    const verbSpec = {
      title: `German Verb Conjugation: ${verbItem.verb} (${verbItem.english})`,
      columns: [
        { id: 'col_pronoun', title: 'Pronoun', width: 140 },
        { id: 'col_conj', title: 'Conjugation', width: 180 },
        { id: 'col_ex', title: 'Example', width: 320 },
      ],
      rows: [
        { id: 'r1', cells: { col_pronoun: 'ich (I)', col_conj: verbItem.conjugations.ich, col_ex: verbItem.example } },
        { id: 'r2', cells: { col_pronoun: 'du (you sing.)', col_conj: verbItem.conjugations.du, col_ex: '' } },
        { id: 'r3', cells: { col_pronoun: 'er / sie / es (he/she/it)', col_conj: verbItem.conjugations.er_sie_es, col_ex: '' } },
        { id: 'r4', cells: { col_pronoun: 'wir (we)', col_conj: verbItem.conjugations.wir, col_ex: '' } },
        { id: 'r5', cells: { col_pronoun: 'ihr (you pl.)', col_conj: verbItem.conjugations.ihr, col_ex: '' } },
        { id: 'r6', cells: { col_pronoun: 'sie / Sie (they / You formal)', col_conj: verbItem.conjugations.sie_Sie, col_ex: '' } },
      ],
    };
    const tableEl = generateLanguageTableElement(verbSpec, {
      startX: 200,
      startY: 200,
      theme: 'dark',
    });
    const current = doodleAPI.getSceneElements?.() || [];
    doodleAPI.updateScene?.({ elements: [...current, tableEl] });
    onToast?.(`Inserted "${verbItem.verb}" Conjugation Matrix to canvas`);
  };

  const handleInsertRootMindMap = (rootItem) => {
    if (!doodleAPI) return;
    const elements = generateEtymologyTreeElements(rootItem, {
      startX: 500,
      startY: 380,
      theme: 'dark',
    });
    const current = doodleAPI.getSceneElements?.() || [];
    doodleAPI.updateScene?.({ elements: [...current, ...elements] });
    onToast?.(`Generated "${rootItem.root}" Etymology Mind Map on canvas`);
    setCopiedId(rootItem.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleLaunchPracticeDeck = (items, lang) => {
    const deck = createLanguageFlashcardDeck(items, lang);
    if (typeof onOpenFlashcards === 'function') {
      onOpenFlashcards(deck);
      onClose?.();
    } else if (typeof window !== 'undefined' && typeof window.__openTableFlashcards === 'function') {
      window.__openTableFlashcards(deck);
      onClose?.();
    } else {
      onToast?.('Flashcard player unavailable');
    }
  };

  const handleCreateCustomCard = () => {
    if (!customWord.trim()) {
      onToast?.('Please enter a target word');
      return;
    }
    const customItem = {
      id: 'custom_' + Date.now(),
      word: customWord.trim(),
      article: customLang === 'German' ? customArticle : '',
      english: customMeaning.trim(),
      ipa: customIpa.trim(),
      exampleDe: customExample.trim(),
      exampleEn: customExampleEn.trim(),
      notes: customNotes.trim(),
    };
    handleInsertCard(customItem, customLang === 'German' ? 'de-DE' : 'en-US');
    setCustomWord('');
    setCustomMeaning('');
    setCustomIpa('');
    setCustomExample('');
    setCustomExampleEn('');
    setCustomNotes('');
  };

  // Filtered German Vocab
  const filteredGermanVocab = useMemo(() => {
    return GERMAN_VOCABULARY.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || v.word.toLowerCase().includes(q) || v.english.toLowerCase().includes(q);
      const matchGender = germanFilter === 'all' || v.article === germanFilter;
      return matchQuery && matchGender;
    });
  }, [searchQuery, germanFilter]);

  // Filtered English Roots
  const filteredRoots = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return WORD_POWER_ROOTS;
    return WORD_POWER_ROOTS.filter(
      (r) =>
        r.root.toLowerCase().includes(q) ||
        r.meaning.toLowerCase().includes(q) ||
        r.derivatives.some((d) => d.word.toLowerCase().includes(q) || d.definition.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="studio-modal-card"
        style={{
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          backgroundColor: '#111215',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e4e4e7',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#14151a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Languages size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#f4f4f5' }}>
                  Human Language Learning Studio
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 500,
                  }}
                >
                  German • English (Word Power) • Global
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#71717a' }}>
                Grammatical gender color coding, root-word etymology trees, case declensions, and offline speech audio.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Top Tabs Navigation ── */}
        <div
          style={{
            padding: '8px 24px',
            backgroundColor: '#131418',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'german', label: '🇩🇪 German Studio (Deutsch)', badge: 'Der / Die / Das' },
              { id: 'english', label: '🇬🇧 English (Word Power Roots)', badge: 'Etymology' },
              { id: 'global', label: '🌍 Global Languages', badge: 'ES / FR' },
              { id: 'custom', label: '✍️ Custom Card Builder', badge: 'Create' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: active ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                    backgroundColor: active ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    color: active ? '#10b981' : '#a1a1aa',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab !== 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1b22',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '4px 10px',
                gap: '8px',
                width: '220px',
              }}
            >
              <Search size={14} style={{ color: '#71717a' }} />
              <input
                type="text"
                placeholder="Search words & roots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f4f4f5',
                  fontSize: '12px',
                  width: '100%',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Tab Contents Container ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* ═════════════════════════════════════════════════════════════
              TAB 1: GERMAN (DEUTSCH) STUDIO
             ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'german' && (
            <div>
              {/* Gender Color Bar Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                {Object.entries(GERMAN_GENDER_COLORS).map(([key, item]) => (
                  <div
                    key={key}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: item.bg,
                      border: `1px solid ${item.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase' }}>
                        {item.label}
                      </span>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>
                        {item.article}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSpeak(item.article, 'de-DE', key)}
                      title={`Listen to ${item.article}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: item.color,
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#16171d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                {/* Gender filter pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'all', label: 'All Nouns' },
                    { id: 'der', label: 'der (M)' },
                    { id: 'die', label: 'die (F)' },
                    { id: 'das', label: 'das (N)' },
                    { id: 'cases', label: 'Case Tables' },
                    { id: 'verbs', label: 'Verbs Matrix' },
                  ].map((btn) => {
                    const active = germanFilter === btn.id;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => setGermanFilter(btn.id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: active ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: active ? 'rgba(16, 185, 129, 0.15)' : '#1a1b22',
                          color: active ? '#10b981' : '#a1a1aa',
                          fontSize: '11px',
                          fontWeight: active ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleInsertCaseTable}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#60a5fa',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Table size={13} />
                    <span>Insert Case Table</span>
                  </button>
                  <button
                    onClick={() => handleLaunchPracticeDeck(filteredGermanVocab, 'German')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <BookOpen size={13} />
                    <span>Practice in 3D Flashcards</span>
                  </button>
                </div>
              </div>

              {/* Case Tables View */}
              {germanFilter === 'cases' && (
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#16171d',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', color: '#f4f4f5' }}>
                        Definite Articles Declension Matrix (Bestimmte Artikel)
                      </h4>
                      <button
                        onClick={handleInsertCaseTable}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#10b981',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        + Insert to Canvas
                      </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#a1a1aa' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Case (Kasus)</th>
                          <th style={{ textAlign: 'left', padding: '8px', color: '#3b82f6' }}>Masculine (der)</th>
                          <th style={{ textAlign: 'left', padding: '8px', color: '#f43f5e' }}>Feminine (die)</th>
                          <th style={{ textAlign: 'left', padding: '8px', color: '#10b981' }}>Neuter (das)</th>
                          <th style={{ textAlign: 'left', padding: '8px', color: '#8b5cf6' }}>Plural (die)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {GERMAN_CASE_DECLENSIONS.rows.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '8px', fontWeight: 600, color: '#e4e4e7' }}>{row.cells.col_case}</td>
                            <td style={{ padding: '8px', color: '#60a5fa', fontWeight: 600 }}>{row.cells.col_masc}</td>
                            <td style={{ padding: '8px', color: '#fb7185', fontWeight: 600 }}>{row.cells.col_fem}</td>
                            <td style={{ padding: '8px', color: '#34d399', fontWeight: 600 }}>{row.cells.col_neut}</td>
                            <td style={{ padding: '8px', color: '#a78bfa', fontWeight: 600 }}>{row.cells.col_plur}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Verb Conjugation Matrix View */}
              {germanFilter === 'verbs' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {GERMAN_VERB_CONJUGATIONS.map((verb) => (
                    <div
                      key={verb.verb}
                      style={{
                        padding: '14px',
                        backgroundColor: '#16171d',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>{verb.verb}</span>
                          <span style={{ fontSize: '12px', color: '#a1a1aa', marginLeft: '6px' }}>— {verb.english}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSpeak(verb.verb, 'de-DE', verb.verb)}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                          >
                            <Volume2 size={15} />
                          </button>
                          <button
                            onClick={() => handleInsertVerbTable(verb)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              fontSize: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            + Canvas
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px' }}>
                        <div style={{ color: '#d4d4d8' }}>ich: <strong style={{ color: '#38bdf8' }}>{verb.conjugations.ich}</strong></div>
                        <div style={{ color: '#d4d4d8' }}>wir: <strong style={{ color: '#38bdf8' }}>{verb.conjugations.wir}</strong></div>
                        <div style={{ color: '#d4d4d8' }}>du: <strong style={{ color: '#38bdf8' }}>{verb.conjugations.du}</strong></div>
                        <div style={{ color: '#d4d4d8' }}>ihr: <strong style={{ color: '#38bdf8' }}>{verb.conjugations.ihr}</strong></div>
                        <div style={{ color: '#d4d4d8' }}>er/sie/es: <strong style={{ color: '#38bdf8' }}>{verb.conjugations.er_sie_es}</strong></div>
                        <div style={{ color: '#d4d4d8' }}>sie/Sie: <strong style={{ color: '#38bdf8' }}>{verb.conjugations.sie_Sie}</strong></div>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#71717a', fontStyle: 'italic' }}>
                        "{verb.example}"
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nouns Vocabulary Grid */}
              {germanFilter !== 'cases' && germanFilter !== 'verbs' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {filteredGermanVocab.map((v) => {
                    const genderStyle = GERMAN_GENDER_COLORS[v.gender] || GERMAN_GENDER_COLORS.neuter;
                    const isCopied = copiedId === v.id;
                    return (
                      <div
                        key={v.id}
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          backgroundColor: '#15161c',
                          border: `1px solid ${genderStyle.border}`,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: genderStyle.bg,
                                  color: genderStyle.color,
                                  fontWeight: 700,
                                }}
                              >
                                {v.article}
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#f4f4f5' }}>
                                {v.word}
                              </span>
                              <span style={{ fontSize: '11px', color: '#71717a' }}>{v.ipa}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '2px' }}>
                              pl: {v.plural} • <strong>{v.english}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleSpeak(`${v.article} ${v.word}`, 'de-DE', v.id)}
                              title="Listen to German pronunciation"
                              style={{
                                background: activeAudioId === v.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                border: 'none',
                                color: activeAudioId === v.id ? '#10b981' : '#a1a1aa',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                            >
                              <Volume2 size={16} />
                            </button>
                            <button
                              onClick={() => handleInsertCard(v, 'de')}
                              title="Insert Study Card into Canvas"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: isCopied ? '#10b981' : '#e4e4e7',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {isCopied ? <Check size={12} /> : <Plus size={12} />}
                              <span>{isCopied ? 'Added' : 'Canvas'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Example sentence */}
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '8px 10px',
                            backgroundColor: '#121216',
                            borderRadius: '6px',
                            fontSize: '11px',
                            borderLeft: `2px solid ${genderStyle.color}`,
                          }}
                        >
                          <div style={{ color: '#38bdf8', fontStyle: 'italic' }}>"{v.exampleDe}"</div>
                          <div style={{ color: '#71717a', marginTop: '2px' }}>{v.exampleEn}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              TAB 2: ENGLISH (WORD POWER MADE EASY) STUDIO
             ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'english' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#16171d',
                  borderRadius: '10px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#c084fc' }}>
                    Word Power Made Easy — Etymology & Root Trees
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#a1a1aa' }}>
                    Click "Insert Root Mind Map" to create interactive radiating tree diagrams on your whiteboard.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchPracticeDeck(filteredRoots, 'Word Power Roots')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#8b5cf6',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <BookOpen size={13} />
                  <span>Practice Roots Deck</span>
                </button>
              </div>

              {/* Roots List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredRoots.map((r) => {
                  const isCopied = copiedId === r.id;
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#15161c',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                color: '#c084fc',
                                fontWeight: 700,
                              }}
                            >
                              ROOT: {r.root}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5' }}>
                              "{r.meaning}"
                            </span>
                            <span style={{ fontSize: '11px', color: '#71717a' }}>({r.origin})</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleSpeak(r.root, 'en-US', r.id)}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                          >
                            <Volume2 size={16} />
                          </button>
                          <button
                            onClick={() => handleInsertRootMindMap(r)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              backgroundColor: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.15)',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              color: isCopied ? '#10b981' : '#c084fc',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <GitFork size={12} />
                            <span>{isCopied ? 'Tree Inserted' : 'Insert Root Mind Map'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Derivatives */}
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                        }}
                      >
                        {r.derivatives.map((d) => (
                          <div
                            key={d.word}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: '#121216',
                              borderRadius: '8px',
                              fontSize: '11px',
                              border: '1px solid rgba(255, 255, 255, 0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong style={{ color: '#38bdf8' }}>{d.word}</strong>
                              <button
                                onClick={() => handleSpeak(d.word, 'en-US', d.word)}
                                style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
                              >
                                <Volume2 size={12} />
                              </button>
                            </div>
                            <div style={{ color: '#fbbf24', fontSize: '10px', marginTop: '2px' }}>{d.breakdown}</div>
                            <div style={{ color: '#a1a1aa', marginTop: '3px' }}>{d.definition}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advanced English Vocab Section */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#f4f4f5' }}>
                  Advanced GRE / TOEFL Vocabulary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {ENGLISH_ADVANCED_VOCABULARY.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '12px',
                        backgroundColor: '#15161c',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong style={{ color: '#38bdf8', fontSize: '15px' }}>{v.word}</strong>
                          <span style={{ fontSize: '11px', color: '#71717a', marginLeft: '6px' }}>{v.ipa}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSpeak(v.word, 'en-US', v.id)}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                          >
                            <Volume2 size={15} />
                          </button>
                          <button
                            onClick={() => handleInsertCard(v, 'en')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              fontSize: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            + Card
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#d4d4d8', marginTop: '4px' }}>{v.definition}</div>
                      <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                        Synonyms: {v.synonyms.join(', ')}
                      </div>
                      <div style={{ fontSize: '10px', color: '#71717a', fontStyle: 'italic', marginTop: '4px' }}>
                        "{v.example}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              TAB 3: GLOBAL LANGUAGES (SPANISH & FRENCH)
             ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'global' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#f59e0b' }}>
                  🇪🇸 Spanish (Español) Essentials
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {SPANISH_VOCABULARY.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px',
                        backgroundColor: '#15161c',
                        borderRadius: '10px',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, color: '#fbbf24' }}>{item.article} {item.word}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleSpeak(`${item.article} ${item.word}`, 'es-ES', item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                          >
                            <Volume2 size={14} />
                          </button>
                          <button
                            onClick={() => handleInsertCard(item, 'es')}
                            style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#27272a', border: 'none', color: '#e4e4e7', fontSize: '10px', cursor: 'pointer' }}
                          >
                            + Card
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>{item.english}</div>
                      <div style={{ fontSize: '10px', color: '#71717a', fontStyle: 'italic', marginTop: '4px' }}>"{item.example}"</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#38bdf8' }}>
                  🇫🇷 French (Français) Essentials
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {FRENCH_VOCABULARY.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px',
                        backgroundColor: '#15161c',
                        borderRadius: '10px',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{item.article} {item.word}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleSpeak(`${item.article} ${item.word}`, 'fr-FR', item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                          >
                            <Volume2 size={14} />
                          </button>
                          <button
                            onClick={() => handleInsertCard(item, 'fr')}
                            style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#27272a', border: 'none', color: '#e4e4e7', fontSize: '10px', cursor: 'pointer' }}
                          >
                            + Card
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>{item.english}</div>
                      <div style={{ fontSize: '10px', color: '#71717a', fontStyle: 'italic', marginTop: '4px' }}>"{item.example}"</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              TAB 4: CUSTOM CARD BUILDER
             ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'custom' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#16171d',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: '#f4f4f5' }}>
                  Create Custom Language Study Card
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                      Language
                    </label>
                    <select
                      value={customLang}
                      onChange={(e) => setCustomLang(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#121216',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f4f4f5',
                        fontSize: '12px',
                      }}
                    >
                      <option value="German">German (Deutsch)</option>
                      <option value="English">English</option>
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="Italian">Italian (Italiano)</option>
                      <option value="Japanese">Japanese (日本語)</option>
                    </select>
                  </div>

                  {customLang === 'German' ? (
                    <div>
                      <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                        Article / Gender
                      </label>
                      <select
                        value={customArticle}
                        onChange={(e) => setCustomArticle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#121216',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#f4f4f5',
                          fontSize: '12px',
                        }}
                      >
                        <option value="der">der (Masculine)</option>
                        <option value="die">die (Feminine)</option>
                        <option value="das">das (Neuter)</option>
                        <option value="">None / Verb / Adjective</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                        Phonetics / IPA (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. /haʊ̯s/"
                        value={customIpa}
                        onChange={(e) => setCustomIpa(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#121216',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#f4f4f5',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                    Target Word / Phrase
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. Wörterbuch"
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        backgroundColor: '#121216',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f4f4f5',
                        fontSize: '13px',
                      }}
                    />
                    <button
                      onClick={() => speakLanguageText(customWord, customLang === 'German' ? 'de-DE' : 'en-US')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#27272a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Volume2 size={15} />
                      <span style={{ fontSize: '11px' }}>Test Audio</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                    English Translation / Meaning
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. dictionary"
                    value={customMeaning}
                    onChange={(e) => setCustomMeaning(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#121216',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#f4f4f5',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                      Example Sentence (Target Language)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ich benutze das Wörterbuch."
                      value={customExample}
                      onChange={(e) => setCustomExample(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#121216',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f4f4f5',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                      Example Translation (English)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. I am using the dictionary."
                      value={customExampleEn}
                      onChange={(e) => setCustomExampleEn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#121216',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f4f4f5',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateCustomCard}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>Insert Custom Card to Canvas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#14151a',
            fontSize: '11px',
            color: '#71717a',
          }}
        >
          <div>
            100% Offline Speech • German der/die/das color coding • Word Power Made Easy etymology engine
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#27272a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f4f4f5',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LanguageLearningStudioModal;
