/**
 * formalMethodsEngine.js
 * Executable Specification Canvas Engine (Formal Methods Visualizer).
 * Extracts statecharts and protocols from canvas topologies into TLA+, Alloy, and XState v5.
 * 100% Offline, Formal Logic Synthesis.
 */

/**
 * Extracts formal state machine representation from canvas elements.
 */
export function extractStateMachine(elements = []) {
  const active = elements.filter(el => el && !el.isDeleted && !el.isHidden);

  // States: shapes that are not arrows or lines
  const rawStates = active.filter(el => el.type !== 'arrow' && el.type !== 'line' && el.type !== 'frame');
  // Transitions: arrows connecting elements
  const rawArrows = active.filter(el => el.type === 'arrow');

  // Normalize state names (clean alphanumeric identifiers)
  const sanitize = (str, fallback) => {
    const clean = (str || '').replace(/[^a-zA-Z0-9_]/g, '');
    return clean || fallback;
  };

  const states = rawStates.map((s, idx) => {
    const label = s.text || s.name || `State_${idx + 1}`;
    const id = s.id;
    const name = sanitize(label, `State_${idx + 1}`);
    const isInitial = idx === 0 || /init|start|idle|ready/i.test(label);
    const isTerminal = /final|end|done|error|failed/i.test(label);

    return {
      id,
      name,
      label,
      isInitial,
      isTerminal,
      element: s,
    };
  });

  const stateMap = new Map(states.map(s => [s.id, s]));

  // Connect transitions
  const transitions = [];
  rawArrows.forEach((a, idx) => {
    const srcId = a.startBinding?.elementId;
    const dstId = a.endBinding?.elementId;
    const fromState = stateMap.get(srcId);
    const toState = stateMap.get(dstId);

    if (fromState && toState) {
      const eventRaw = a.text || `EVENT_${idx + 1}`;
      const eventName = sanitize(eventRaw, `TRANSITION_${idx + 1}`).toUpperCase();
      transitions.push({
        id: a.id,
        from: fromState.name,
        fromId: fromState.id,
        to: toState.name,
        toId: toState.id,
        event: eventName,
        label: a.text || eventName,
        element: a,
      });
    }
  });

  // If no initial state marked, default first state
  if (states.length > 0 && !states.some(s => s.isInitial)) {
    states[0].isInitial = true;
  }

  return {
    states,
    transitions,
    initialState: states.find(s => s.isInitial) || states[0] || null,
    terminalStates: states.filter(s => s.isTerminal),
  };
}

/**
 * Generates TLA+ specification from state machine.
 */
export function generateTLAPlusSpec(stateMachine, moduleName = 'CanvasProtocol') {
  const { states, transitions, initialState } = stateMachine;
  const mod = moduleName.replace(/[^a-zA-Z0-9_]/g, '') || 'CanvasProtocol';

  if (!states || states.length === 0) {
    return `--------------------------- MODULE ${mod} ---------------------------\nEXTENDS Naturals, TLC\n\* Canvas has no states defined. Draw components and arrows to generate spec.\n=============================================================================`;
  }

  const stateNames = states.map(s => `"${s.name}"`).join(', ');
  const initName = initialState ? `"${initialState.name}"` : `"${states[0].name}"`;

  // Build transition actions
  const actions = transitions.map(t => {
    return `
Action_${t.event} ==
    /\\ state = "${t.from}"
    /\\ state' = "${t.to}"
    /\\ stepCount' = stepCount + 1
    /\\ traceHistory' = Append(traceHistory, "${t.to}")`;
  });

  const nextDisjunction = transitions.length > 0
    ? transitions.map(t => `Action_${t.event}`).join('\n    \\/ ')
    : 'UNCHANGED <<state, stepCount, traceHistory>>';

  return `--------------------------- MODULE ${mod} ---------------------------
EXTENDS Naturals, Sequences, TLC

VARIABLES
    state,         \\* Current protocol state
    stepCount,     \\* Execution clock step
    traceHistory   \\* Sequence of visited states

AllStates == { ${stateNames} }

Init ==
    /\\ state = ${initName}
    /\\ stepCount = 0
    /\\ traceHistory = << ${initName} >>
${actions.join('\n')}

Next ==
    \\/ ${nextDisjunction}

Spec == Init /\\ [][Next]_<<state, stepCount, traceHistory>>

\\* Formal Invariants
TypeOK ==
    state \\in AllStates

MaxStepsBounded ==
    stepCount < 1000

=============================================================================`;
}

/**
 * Generates Alloy relational declarative model.
 */
export function generateAlloySpec(stateMachine, moduleName = 'CanvasProtocol') {
  const { states, transitions, initialState } = stateMachine;
  const mod = moduleName.replace(/[^a-zA-Z0-9_]/g, '') || 'CanvasProtocol';

  if (!states || states.length === 0) {
    return `module ${mod}\n// No states defined on canvas`;
  }

  const initName = initialState ? initialState.name : states[0].name;

  return `module ${mod}

open util/ordering[Time]

sig Time {}

abstract sig State {}
${states.map(s => `one sig State_${s.name} extends State {}`).join('\n')}

one sig Protocol {
  state: State one -> Time
}

pred init [t: Time] {
  Protocol.state.t = State_${initName}
}

pred transition [t, t': Time] {
  ${transitions.length > 0 ? transitions.map(t => `(Protocol.state.t = State_${t.from} and Protocol.state.t' = State_${t.to})`).join(' or\n  ') : 'Protocol.state.t\' = Protocol.state.t'}
}

fact Traces {
  init [first]
  all t: Time - last | let t' = t.next | transition [t, t']
}

assert NoDeadlock {
  all t: Time - last | some t': Time | transition [t, t']
}

check NoDeadlock for 5 Time
`;
}

/**
 * Generates XState v5 state machine specification.
 */
export function generateXStateConfig(stateMachine) {
  const { states, transitions, initialState } = stateMachine;

  const statesConfig = {};
  states.forEach(s => {
    statesConfig[s.name] = {
      description: s.label,
      on: {},
    };
    if (s.isTerminal) {
      statesConfig[s.name].type = 'final';
    }
  });

  transitions.forEach(t => {
    if (statesConfig[t.from]) {
      statesConfig[t.from].on[t.event] = {
        target: t.to,
      };
    }
  });

  const initName = initialState ? initialState.name : (states[0]?.name || 'idle');

  return `import { createMachine } from 'xstate';

export const canvasMachine = createMachine({
  id: 'canvasSpecMachine',
  initial: '${initName}',
  states: ${JSON.stringify(statesConfig, null, 2)}
});
`;
}

/**
 * Stepper Debugger: Computes active step for live visual replay on canvas.
 */
export function computeStepTrace(stateMachine, currentStepIndex = 0) {
  const { transitions, initialState } = stateMachine;
  if (!initialState || transitions.length === 0) {
    return {
      currentStep: 0,
      totalSteps: 0,
      activeStateId: initialState?.id || null,
      activeArrowId: null,
      activeStateName: initialState?.name || 'Idle',
      activeEvent: 'INIT',
    };
  }

  const step = currentStepIndex % transitions.length;
  const currentTransition = transitions[step];

  return {
    currentStep: step + 1,
    totalSteps: transitions.length,
    activeStateId: currentTransition.toId,
    activeArrowId: currentTransition.id,
    activeStateName: currentTransition.to,
    activeEvent: currentTransition.event,
    previousStateName: currentTransition.from,
  };
}
