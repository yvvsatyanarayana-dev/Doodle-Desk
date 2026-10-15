import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { getScenarioWalkthroughScenes } from '../engine/scenarioWalkthrough.js';

export function ScenarioWalkthroughPlayer({
  elements = [],
  frameId,
  path = [],
  theme = 'dark',
  onNavigate,
  onBack,
  onRestart,
  onEdit,
  onClose,
}) {
  const scenes = useMemo(() => getScenarioWalkthroughScenes(elements), [elements]);
  const scene = scenes.find((item) => item.id === frameId);
  if (!scene) return null;

  const visitedCount = new Set(path).size;
  const percentage = scenes.length ? Math.round((visitedCount / scenes.length) * 100) : 0;

  return (
    <aside
      className="scenario-walkthrough-player"
      data-theme={theme}
      aria-label="Playable scenario walkthrough"
    >
      <header className="scenario-player-header">
        <div className="scenario-player-brand">
          <span className="scenario-player-mark"><CheckCircle2 size={15} /></span>
          <span><strong>Scenario walkthrough</strong><small>Follow a path through this board</small></span>
        </div>
        <button type="button" className="scenario-player-icon" onClick={onClose} aria-label="Exit walkthrough">
          <X size={16} />
        </button>
      </header>

      <div className="scenario-player-progress" aria-label={`${visitedCount} scenes visited`}>
        <span style={{ width: `${percentage}%` }} />
      </div>

      <div className="scenario-player-content">
        <div className="scenario-player-step">
          <span>SCENE {String(scenes.findIndex((item) => item.id === scene.id) + 1).padStart(2, '0')}</span>
          <span>{visitedCount} VISITED</span>
        </div>
        <h2>{scene.name}</h2>
        {scene.description ? (
          <p className="scenario-player-description">{scene.description}</p>
        ) : (
          <p className="scenario-player-description scenario-player-hint">
            Explore this scene, then choose a connected path to continue.
          </p>
        )}

        {scene.choices.length ? (
          <div className="scenario-player-choices" aria-label="Choose what happens next">
            {scene.choices.map((choice) => (
              <button
                key={`${choice.sourceId}-${choice.targetFrameId}`}
                type="button"
                className="scenario-player-choice"
                onClick={() => onNavigate?.(choice.targetFrameId)}
              >
                <span><strong>{choice.label}</strong><small>Continue to {choice.targetFrameName}</small></span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <div className="scenario-player-complete" role="status">
            <CheckCircle2 size={17} />
            <span><strong>End of this path</strong><small>You reached a scene with no outgoing choices.</small></span>
          </div>
        )}
      </div>

      <footer className="scenario-player-footer">
        <button type="button" className="scenario-player-secondary" onClick={onBack} disabled={path.length < 2}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="scenario-player-secondary" onClick={onRestart}>
          <RotateCcw size={14} /> Restart
        </button>
        <button type="button" className="scenario-player-edit" onClick={onEdit}>
          Edit flow
        </button>
      </footer>
    </aside>
  );
}

export default ScenarioWalkthroughPlayer;
