import React from 'react';
import { ArrowLeft, CirclePlay, RotateCcw, X } from 'lucide-react';
import { getSimulationNodeTitle } from '../simulation.js';

export function SimulationPanel({ nodes, currentId, path, choices, onStart, onChoose, onBack, onReset, onClose }) {
  const current = nodes.find(node => node.id === currentId);
  return (
    <section className="doodle-simulation-panel" aria-label="Diagram simulation">
      <header>
        <div>
          <strong><CirclePlay size={16} /> Simulation</strong>
          <span>{path.length > 1 ? `Step ${path.length}` : 'Interactive flow'}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Exit simulation"><X size={16} /></button>
      </header>
      {!current ? (
        <div className="doodle-simulation-content">
          <p>Choose a starting point to run this flow.</p>
          {nodes.map(node => (
            <button type="button" className="doodle-simulation-choice" key={node.id} onClick={() => onStart(node.id)}>
              <CirclePlay size={14} /> {getSimulationNodeTitle(node)}
            </button>
          ))}
          {nodes.length === 0 && <p>Add shapes and connect them with bound arrows to build a flow.</p>}
        </div>
      ) : (
        <div className="doodle-simulation-content">
          <span className="doodle-simulation-step">CURRENT STEP</span>
          <strong className="doodle-simulation-current">{getSimulationNodeTitle(current)}</strong>
          {current.text && current.text !== getSimulationNodeTitle(current) && <p>{current.text}</p>}
          {choices.length ? (
            <div className="doodle-simulation-choices">
              <span className="doodle-simulation-step">CHOOSE NEXT</span>
              {choices.map(choice => (
                <button type="button" className="doodle-simulation-choice" key={choice.id} onClick={() => onChoose(choice)}>
                  {choice.label}
                </button>
              ))}
            </div>
          ) : <p className="doodle-simulation-finished">End of this flow.</p>}
          <footer>
            <button type="button" disabled={path.length < 2} onClick={onBack}><ArrowLeft size={13} /> Back</button>
            <button type="button" onClick={onReset}><RotateCcw size={13} /> Restart</button>
          </footer>
        </div>
      )}
    </section>
  );
}
