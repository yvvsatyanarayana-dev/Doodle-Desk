import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CirclePlay, Pause, Play, RotateCcw, X, FastForward, CheckCircle2 } from 'lucide-react';
import { getSimulationNodeTitle } from '../simulation.js';
import { proceduralAudio } from '../../utils/proceduralAudio.js';

export function SimulationPanel({ nodes, currentId, path, choices, onStart, onChoose, onBack, onReset, onClose }) {
  const current = nodes.find(node => node.id === currentId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 0.5x
  const timerRef = useRef(null);

  // Auto-play timer for linear paths
  useEffect(() => {
    if (!isPlaying || !current) return;

    if (choices.length === 1) {
      const interval = Math.max(300, 1000 / speed);
      timerRef.current = setTimeout(() => {
        proceduralAudio.playSnapClick();
        onChoose(choices[0]);
      }, interval);
    } else {
      // Pause on decision nodes with multiple choices
      setIsPlaying(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, current, choices, speed, onChoose]);

  const handleStep = (choice) => {
    proceduralAudio.playSnapClick();
    onChoose(choice);
  };

  return (
    <section className="doodle-simulation-panel" aria-label="Diagram simulation">
      <header>
        <div>
          <strong><CirclePlay size={16} /> Logic Simulator</strong>
          <span>{path.length > 1 ? `Step ${path.length}` : 'Executable flow'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {current && (
            <button
              type="button"
              onClick={() => setIsPlaying(prev => !prev)}
              title={isPlaying ? 'Pause simulation' : 'Auto-run simulation'}
              style={{
                background: isPlaying ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: isPlaying ? '#818cf8' : '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause' : 'Auto Run'}
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Exit simulation"><X size={16} /></button>
        </div>
      </header>

      {!current ? (
        <div className="doodle-simulation-content">
          <p>Choose an entry point to begin executing this flowchart.</p>
          {nodes.map(node => (
            <button
              type="button"
              className="doodle-simulation-choice"
              key={node.id}
              onClick={() => {
                proceduralAudio.playSnapClick();
                onStart(node.id);
              }}
            >
              <CirclePlay size={14} /> {getSimulationNodeTitle(node)}
            </button>
          ))}
          {nodes.length === 0 && <p>Add shapes and connect them with bound arrows to build a flow.</p>}
        </div>
      ) : (
        <div className="doodle-simulation-content">
          {/* Breadcrumbs trail */}
          {path.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {path.map((id, idx) => {
                const node = nodes.find(n => n.id === id);
                return (
                  <span
                    key={`${id}:${idx}`}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: id === currentId ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                      color: id === currentId ? '#a5b4fc' : '#a1a1aa',
                      fontWeight: id === currentId ? 700 : 500,
                    }}
                  >
                    {idx + 1}. {getSimulationNodeTitle(node)}
                  </span>
                );
              })}
            </div>
          )}

          <span className="doodle-simulation-step">ACTIVE NODE</span>
          <strong className="doodle-simulation-current">{getSimulationNodeTitle(current)}</strong>
          {current.text && current.text !== getSimulationNodeTitle(current) && <p>{current.text}</p>}

          {choices.length ? (
            <div className="doodle-simulation-choices">
              <span className="doodle-simulation-step">
                {choices.length > 1 ? 'DECISION POINT (BRANCH)' : 'NEXT STEP'}
              </span>
              {choices.map(choice => (
                <button
                  type="button"
                  className="doodle-simulation-choice"
                  key={choice.id}
                  onClick={() => handleStep(choice)}
                >
                  <CirclePlay size={14} /> {choice.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="doodle-simulation-finished" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} style={{ color: '#10b981' }} /> Flow execution finished.
            </p>
          )}

          <footer>
            <button type="button" disabled={path.length < 2} onClick={() => { proceduralAudio.playSnapClick(); onBack(); }}>
              <ArrowLeft size={13} /> Back
            </button>
            <button type="button" onClick={() => { proceduralAudio.playSnapClick(); onReset(); }}>
              <RotateCcw size={13} /> Restart
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}
