import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Brain,
  Sparkles,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle2,
  XCircle,
  X,
  ArrowLeftRight,
  Volume2,
  VolumeX,
  HelpCircle,
  Check,
  Flame,
} from 'lucide-react';
import { generateSketchyRoundedRectPath } from '../engine/renderer/sketchy.js';

/**
 * Procedural Web Audio Sound FX (100% Offline, no external files)
 */
function playStudySound(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'flip') {
      // Soft gentle paper whoosh/click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'mastered') {
      // Gentle cheerful chime (C6 -> E6)
      const now = ctx.currentTime;
      [1046.5, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.07, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } else if (type === 'learning') {
      // Soft reminder tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * InteractiveTableFlashcardsModal
 * Dedicated Flashcard study & practice environment powered directly by an Interactive Table.
 * Seamlessly treats any two columns as Question and Answer, offering 3D flip cards,
 * self-assessment ratings, progress tracking, and full Doodle Desk hand-drawn theme styling.
 */
export function InteractiveTableFlashcardsModal({
  isOpen,
  onClose,
  tableElement,
  isDark = false,
}) {
  if (!isOpen || !tableElement) return null;

  const tableData = tableElement.tableData || {};
  const columns = useMemo(() => tableData.columns || [], [tableData.columns]);
  const rows = useMemo(() => tableData.rows || [], [tableData.rows]);

  // Handwriting font stack from table element
  const fontStack = useMemo(() => {
    const family = tableElement.fontFamily;
    if (family === 1) return 'Helvetica, Arial, sans-serif';
    if (family === 2) return '"Cascadia Code", "Fira Code", monospace';
    if (family === 3) return '"Virgil", cursive';
    if (family === 6) return '"Nunito", sans-serif';
    if (family === 7) return '"Comic Shanns", cursive';
    if (family === 8) return '"Patrick Hand", cursive';
    return '"Doodlefont", "Virgil", cursive, sans-serif';
  }, [tableElement.fontFamily]);

  // Intelligent column detection for Question & Answer
  const defaultColIds = useMemo(() => {
    if (!columns || columns.length === 0) return { q: null, a: null };

    const qKeywords = ['question', 'front', 'term', 'word', 'prompt', 'concept', 'title', 'name'];
    const aKeywords = ['answer', 'back', 'definition', 'meaning', 'solution', 'desc', 'description', 'notes', 'translation'];

    let qCol = columns.find((c) => {
      const title = (c.title || '').trim().toLowerCase();
      const words = title.split(/[\s_-]+/);
      return qKeywords.some((k) => words.includes(k) || title.includes(k)) || c.id === 'col_q';
    });

    let aCol = columns.find((c) => {
      if (qCol && c.id === qCol.id) return false;
      const title = (c.title || '').trim().toLowerCase();
      const words = title.split(/[\s_-]+/);
      return aKeywords.some((k) => words.includes(k) || title.includes(k)) || c.id === 'col_a';
    });

    if (!qCol && columns.length > 0) qCol = columns[0];
    if (!aCol && columns.length > 1) {
      aCol = columns.find((c) => c.id !== qCol?.id) || columns[1];
    } else if (!aCol) {
      aCol = columns[0];
    }

    return {
      q: qCol ? qCol.id : (columns[0]?.id || null),
      a: aCol ? aCol.id : (columns[1]?.id || columns[0]?.id || null),
    };
  }, [columns]);

  const [questionColId, setQuestionColId] = useState(defaultColIds.q);
  const [answerColId, setAnswerColId] = useState(defaultColIds.a);

  // Sync if columns change
  useEffect(() => {
    if (!questionColId || !columns.some((c) => c.id === questionColId)) {
      setQuestionColId(defaultColIds.q);
    }
    if (!answerColId || !columns.some((c) => c.id === answerColId)) {
      setAnswerColId(defaultColIds.a);
    }
  }, [columns, defaultColIds, questionColId, answerColId]);

  // Build card deck from table rows
  const allCards = useMemo(() => {
    if (!questionColId || !answerColId) return [];
    return rows.map((r, idx) => {
      const qVal = (r.cells?.[questionColId] || '').trim();
      const aVal = (r.cells?.[answerColId] || '').trim();
      return {
        id: r.id || `card_${idx}`,
        rowIdx: idx,
        question: qVal,
        answer: aVal,
        hasContent: qVal.length > 0 || aVal.length > 0,
      };
    });
  }, [rows, questionColId, answerColId]);

  // Flashcard study state
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'learning'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Progress tracking: mastered card IDs vs learning card IDs
  const [masteredIds, setMasteredIds] = useState(() => new Set());
  const [learningIds, setLearningIds] = useState(() => new Set());

  // Active cards based on filter mode
  const activeDeck = useMemo(() => {
    let deck = allCards.filter((c) => c.hasContent);
    if (deck.length === 0 && allCards.length > 0) {
      deck = allCards; // fallback to show empty row templates
    }

    if (filterMode === 'learning') {
      deck = deck.filter((c) => learningIds.has(c.id));
    }

    if (isShuffled && shuffledIndices.length === deck.length) {
      return shuffledIndices.map((i) => deck[i]).filter(Boolean);
    }

    return deck;
  }, [allCards, filterMode, learningIds, isShuffled, shuffledIndices]);

  // Clamp current index when deck changes
  useEffect(() => {
    if (currentIndex >= activeDeck.length) {
      setCurrentIndex(Math.max(0, activeDeck.length - 1));
      setIsFlipped(false);
    }
  }, [activeDeck.length, currentIndex]);

  const currentCard = activeDeck[currentIndex] || null;

  // Swap question and answer columns
  const handleSwapColumns = () => {
    setQuestionColId(answerColId);
    setAnswerColId(questionColId);
    setIsFlipped(false);
    if (soundEnabled) playStudySound('flip');
  };

  // Flip card
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    if (soundEnabled) playStudySound('flip');
  }, [soundEnabled]);

  // Navigate next / prev
  const handleNext = useCallback(() => {
    if (currentIndex < activeDeck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((i) => i + 1);
      if (soundEnabled) playStudySound('flip');
    }
  }, [currentIndex, activeDeck.length, soundEnabled]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((i) => i - 1);
      if (soundEnabled) playStudySound('flip');
    }
  }, [currentIndex, soundEnabled]);

  // Rate card as Got It / Still Learning
  const handleRate = useCallback((status) => {
    if (!currentCard) return;
    const cardId = currentCard.id;

    if (status === 'mastered') {
      setMasteredIds((prev) => {
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
      setLearningIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      if (soundEnabled) playStudySound('mastered');
    } else {
      setLearningIds((prev) => {
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
      setMasteredIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      if (soundEnabled) playStudySound('learning');
    }

    // Auto-advance to next card if available
    if (currentIndex < activeDeck.length - 1) {
      setTimeout(() => {
        setIsFlipped(false);
        setCurrentIndex((i) => i + 1);
      }, 180);
    }
  }, [currentCard, currentIndex, activeDeck.length, soundEnabled]);

  // Shuffle toggle
  const handleToggleShuffle = () => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledIndices([]);
    } else {
      const indices = Array.from({ length: activeDeck.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
      setIsShuffled(true);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
    if (soundEnabled) playStudySound('flip');
  };

  // Reset mastery progress
  const handleResetProgress = () => {
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
    setFilterMode('all');
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '1') {
        e.preventDefault();
        handleRate('learning');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRate('mastered');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleRate, onClose]);

  // Hand-drawn sketchy border paths for the card (front and back have distinct sketchy character)
  const cardSketchPathFront = useMemo(() => {
    return generateSketchyRoundedRectPath(4, 4, 592, 322, 16, tableElement.seed || 12345, 1.25);
  }, [tableElement.seed]);

  const cardSketchPathBack = useMemo(() => {
    return generateSketchyRoundedRectPath(4, 4, 592, 322, 16, (tableElement.seed || 12345) + 77, 1.25);
  }, [tableElement.seed]);

  // Dynamic font sizing for flashcard content to make short text bold & prominent
  const getCardFontSize = (text) => {
    const len = (text || '').trim().length;
    if (len <= 25) return '34px';
    if (len <= 60) return '28px';
    if (len <= 120) return '22px';
    if (len <= 200) return '18px';
    return '16px';
  };

  // Column titles for labels
  const questionCol = columns.find((c) => c.id === questionColId);
  const answerCol = columns.find((c) => c.id === answerColId);
  const questionTitle = questionCol?.title?.trim() || 'Question';
  const answerTitle = answerCol?.title?.trim() || 'Answer';

  // Completion calculation
  const totalCards = activeDeck.length;
  const masteredCount = activeDeck.filter((c) => masteredIds.has(c.id)).length;
  const learningCount = activeDeck.filter((c) => learningIds.has(c.id)).length;

  return (
    <div
      className="modal-overlay interactive-table-flashcards-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(8, 8, 12, 0.82)' : 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '20px',
        boxSizing: 'border-box',
        userSelect: 'none',
        animation: 'modalOverlayFadeIn 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        className="interactive-table-flashcards-modal"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          backgroundColor: isDark ? '#16161a' : '#ffffff',
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: isDark
            ? '0 28px 72px rgba(0, 0, 0, 0.65), 0 4px 16px rgba(0, 0, 0, 0.4)'
            : '0 24px 64px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          color: isDark ? '#f4f4f5' : '#18181b',
          overflow: 'hidden',
          boxSizing: 'border-box',
          fontFamily: fontStack,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header Bar ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: isDark ? '#141418' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <Brain size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Table Flashcards</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.16)',
                    color: '#818cf8',
                    letterSpacing: '0.02em',
                  }}
                >
                  Interactive Table
                </span>
              </div>
              <div style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#64748b', marginTop: '2px' }}>
                {tableElement.title || 'Canvas Table'} • {totalCards} card{totalCards === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSoundEnabled((p) => !p)}
              title={soundEnabled ? 'Mute study sounds' : 'Enable study sounds'}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: 'none',
                background: soundEnabled ? (isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)') : 'transparent',
                color: soundEnabled ? '#818cf8' : (isDark ? '#71717a' : '#94a3b8'),
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Flashcards (Esc)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                background: isDark ? '#27272a' : '#f1f5f9',
                color: isDark ? '#e4e4e7' : '#334155',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              <X size={14} />
              <kbd className="doodle-help-kbd" style={{ minWidth: 16, height: 18, fontSize: 10, padding: '1px 5px' }}>Esc</kbd>
            </button>
          </div>
        </div>

        {/* ── Column Selector Bar (Question Column <-> Answer Column) ── */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: isDark ? '#18181c' : '#ffffff',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Question column selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: '#818cf8', letterSpacing: '0.01em' }}>Question:</span>
              <select
                value={questionColId || ''}
                onChange={(e) => {
                  setQuestionColId(e.target.value);
                  setIsFlipped(false);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #cbd5e1',
                  background: isDark ? '#232329' : '#f8fafc',
                  color: isDark ? '#f4f4f5' : '#0f172a',
                  fontSize: '12px',
                  fontFamily: fontStack,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {columns.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.title?.trim() || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap button */}
            <button
              type="button"
              onClick={handleSwapColumns}
              title="Swap Question & Answer columns"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(99, 102, 241, 0.35)',
                background: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                color: '#818cf8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeftRight size={13} />
              <span>Swap</span>
            </button>

            {/* Answer column selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: '#34d399', letterSpacing: '0.01em' }}>Answer:</span>
              <select
                value={answerColId || ''}
                onChange={(e) => {
                  setAnswerColId(e.target.value);
                  setIsFlipped(false);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #cbd5e1',
                  background: isDark ? '#232329' : '#f8fafc',
                  color: isDark ? '#f4f4f5' : '#0f172a',
                  fontSize: '12px',
                  fontFamily: fontStack,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {columns.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.title?.trim() || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter: All vs Needs Learning */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: filterMode === 'all'
                  ? (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1')
                  : '1px solid transparent',
                background: filterMode === 'all' ? (isDark ? '#2e2e38' : '#e2e8f0') : 'transparent',
                color: isDark ? '#f4f4f5' : '#1e293b',
                fontWeight: filterMode === 'all' ? 700 : 500,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              All ({allCards.filter((c) => c.hasContent).length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('learning')}
              disabled={learningCount === 0}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: filterMode === 'learning'
                  ? '1px solid rgba(245, 158, 11, 0.35)'
                  : '1px solid transparent',
                background: filterMode === 'learning' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: filterMode === 'learning' ? '#f59e0b' : isDark ? '#71717a' : '#94a3b8',
                fontWeight: filterMode === 'learning' ? 700 : 500,
                fontSize: '11px',
                cursor: learningCount === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Review ({learningCount})
            </button>
          </div>
        </div>

        {/* ── Progress & Status Bar ── */}
        <div style={{ padding: '12px 20px 0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700 }}>
              {totalCards > 0 ? `Card ${currentIndex + 1} of ${totalCards}` : '0 Cards'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> {masteredCount} Mastered
              </span>
              <span style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={13} /> {learningCount} Learning
              </span>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: isDark ? '#27272a' : '#e2e8f0',
              borderRadius: '99px',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${totalCards > 0 ? (masteredCount / totalCards) * 100 : 0}%`,
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease',
              }}
            />
            <div
              style={{
                width: `${totalCards > 0 ? (learningCount / totalCards) * 100 : 0}%`,
                backgroundColor: '#f59e0b',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* ── 3D Flashcard Display Area ── */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '350px',
            perspective: '1200px',
          }}
        >
          {totalCards === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: isDark ? '#a1a1aa' : '#64748b',
                fontFamily: fontStack,
              }}
            >
              <HelpCircle size={40} style={{ opacity: 0.4, margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                No Question & Answer rows found
              </div>
              <div style={{ fontSize: '13px', maxWidth: '380px', lineHeight: 1.5 }}>
                Fill in some questions and answers in your interactive table cells, then practice them here as instant flip cards!
              </div>
            </div>
          ) : currentCard ? (
            <div
              onClick={handleFlip}
              style={{
                width: '100%',
                maxWidth: '600px',
                height: '330px',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)',
                cursor: 'pointer',
              }}
            >
              {/* ── CARD FRONT (Question) ── */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: '18px',
                  backgroundColor: isDark ? '#1c1c22' : '#ffffff',
                  boxShadow: isDark
                    ? '0 16px 36px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 16px 36px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                {/* Hand-drawn sketchy border SVG for Question */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                  viewBox="0 0 600 330"
                  preserveAspectRatio="none"
                >
                  <path
                    d={cardSketchPathFront}
                    stroke={isDark ? 'rgba(129, 140, 248, 0.5)' : 'rgba(99, 102, 241, 0.4)'}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Front Header */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Sparkles size={11} />
                    <span>{questionTitle.toUpperCase()}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {masteredIds.has(currentCard.id) && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                        }}
                      >
                        ✓ Mastered
                      </span>
                    )}
                    {learningIds.has(currentCard.id) && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                        }}
                      >
                        Learning
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: isDark ? '#71717a' : '#94a3b8', fontWeight: 600 }}>
                      #{currentIndex + 1}
                    </span>
                  </div>
                </div>

                {/* Question Body */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '20px 14px',
                    fontFamily: fontStack,
                    fontSize: getCardFontSize(currentCard.question),
                    lineHeight: 1.45,
                    color: isDark ? '#f4f4f5' : '#0f172a',
                    fontWeight: 600,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {currentCard.question || <span style={{ opacity: 0.35 }}>(Empty question cell)</span>}
                </div>

                {/* Front Footer Hint */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: isDark ? '#a1a1aa' : '#64748b',
                  }}
                >
                  <RotateCw size={12} />
                  <span>Click card or press Space to reveal answer</span>
                </div>
              </div>

              {/* ── CARD BACK (Answer) ── */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: '18px',
                  backgroundColor: isDark ? '#141c18' : '#f0fdf4',
                  boxShadow: isDark
                    ? '0 16px 36px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(52, 211, 153, 0.15)'
                    : '0 16px 36px rgba(16, 185, 129, 0.1), inset 0 0 0 1px rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                {/* Hand-drawn sketchy border SVG for Answer */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                  viewBox="0 0 600 330"
                  preserveAspectRatio="none"
                >
                  <path
                    d={cardSketchPathBack}
                    stroke={isDark ? 'rgba(52, 211, 153, 0.6)' : 'rgba(16, 185, 129, 0.5)'}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Back Header */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <CheckCircle2 size={11} />
                    <span>{answerTitle.toUpperCase()}</span>
                  </div>

                  <span style={{ fontSize: '11px', color: isDark ? '#71717a' : '#94a3b8', fontWeight: 600 }}>
                    #{currentIndex + 1}
                  </span>
                </div>

                {/* Answer Body */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '16px 14px',
                    fontFamily: fontStack,
                    fontSize: getCardFontSize(currentCard.answer),
                    lineHeight: 1.45,
                    color: isDark ? '#34d399' : '#047857',
                    fontWeight: 600,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {currentCard.answer || <span style={{ opacity: 0.35 }}>(Empty answer cell)</span>}
                </div>

                {/* Back Rating Actions */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    paddingTop: '6px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleRate('learning')}
                    title="Still Learning (Press 1)"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <XCircle size={14} />
                    <span>Still Learning</span>
                    <kbd className="doodle-help-kbd" style={{ minWidth: 16, height: 18, fontSize: 10, padding: '1px 5px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>1</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('mastered')}
                    title="Got It! (Press 2)"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Got It!</span>
                    <kbd style={{ minWidth: 16, height: 18, fontSize: 10, padding: '1px 5px', background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 4, color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</kbd>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Footer Navigation & Deck Controls ── */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: isDark ? '#141418' : '#f8fafc',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Deck tools: Shuffle & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleToggleShuffle}
              title={isShuffled ? 'Revert to original row order' : 'Shuffle card deck'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: isShuffled
                  ? '1px solid rgba(99, 102, 241, 0.5)'
                  : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                backgroundColor: isShuffled
                  ? 'rgba(99, 102, 241, 0.16)'
                  : isDark ? '#27272a' : '#ffffff',
                color: isShuffled ? '#818cf8' : isDark ? '#e4e4e7' : '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Shuffle size={13} />
              <span>{isShuffled ? 'Shuffled' : 'Shuffle'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetProgress}
              title="Reset study progress"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#27272a' : '#ffffff',
                color: isDark ? '#a1a1aa' : '#64748b',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          {/* Central Prev / Flip / Next buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0 || totalCards === 0}
              title="Previous card (←)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#27272a' : '#ffffff',
                color: currentIndex === 0 ? (isDark ? '#52525b' : '#94a3b8') : isDark ? '#f4f4f5' : '#1e293b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>

            <button
              type="button"
              onClick={handleFlip}
              disabled={totalCards === 0}
              title="Flip Card (Space)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: totalCards === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              <RotateCw size={14} />
              <span>Flip</span>
              <kbd style={{ fontSize: 10, padding: '1px 5px', height: 18, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 4, color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Space</kbd>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= totalCards - 1 || totalCards === 0}
              title="Next card (→)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#27272a' : '#ffffff',
                color: currentIndex >= totalCards - 1 ? (isDark ? '#52525b' : '#94a3b8') : isDark ? '#f4f4f5' : '#1e293b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: currentIndex >= totalCards - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InteractiveTableFlashcardsModal;
