// Smart Template Presets for Doodle Desk
import { FONT_FAMILY } from '../engine/elements.js';

const getFont = () => FONT_FAMILY?.Doodlefont ?? 5;

const uid = () => Math.random().toString(36).substring(2, 11);

// Helper to create a base element
const createElement = (type, x, y, width, height, custom = {}) => ({
  id: uid(),
  type,
  x,
  y,
  width,
  height,
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: { type: 3 },
  seed: Math.floor(Math.random() * 100000),
  version: 1,
  versionNonce: Math.floor(Math.random() * 100000),
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
  ...custom,
});

// Helper for text element
const createText = (text, x, y, custom = {}) => ({
  ...createElement('text', x, y, Math.max(text.length * 10, 60), 28, {
    text,
    fontSize: 16,
    fontFamily: getFont(),
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: '#1e1e1e',
    ...custom,
  }),
});

// Helper for arrow element
const createArrow = (startX, startY, endX, endY, custom = {}) => ({
  ...createElement('arrow', startX, startY, endX - startX, endY - startY, {
    points: [
      [0, 0],
      [endX - startX, endY - startY],
    ],
    endArrowhead: 'arrow',
    startArrowhead: null,
    strokeWidth: 2,
    roundness: { type: 2 },
    ...custom,
  }),
});

// 1. Flowchart & Decision Tree Template
export function generateFlowchart(originX = 100, originY = 100) {
  const elements = [];
  const darkStroke = '#cbd5e1';

  // Frame container
  const frame = createElement('frame', originX - 40, originY - 50, 720, 520, {
    name: 'Flowchart: User Auth',
    strokeColor: '#38bdf8',
    strokeWidth: 1,
  });
  elements.push(frame);

  // Start Node (Pill)
  const startY = originY;
  elements.push(createElement('rectangle', originX + 220, startY, 160, 50, {
    roundness: { type: 3 },
    backgroundColor: '#86efac33',
    strokeColor: '#22c55e',
    fillStyle: 'solid',
    frameId: frame.id,
  }));
  elements.push(createText('Start: Login', originX + 250, startY + 14, {
    strokeColor: '#22c55e',
    frameId: frame.id,
  }));

  // Arrow to Step 1
  elements.push(createArrow(originX + 300, startY + 50, originX + 300, startY + 110, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));

  // Step 1: Input Credentials
  const step1Y = startY + 110;
  elements.push(createElement('rectangle', originX + 200, step1Y, 200, 55, {
    backgroundColor: '#93c5fd33',
    strokeColor: '#3b82f6',
    frameId: frame.id,
  }));
  elements.push(createText('Enter Email & Password', originX + 215, step1Y + 16, {
    strokeColor: '#60a5fa',
    fontSize: 14,
    frameId: frame.id,
  }));

  // Arrow to Decision
  elements.push(createArrow(originX + 300, step1Y + 55, originX + 300, step1Y + 120, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));

  // Decision Node (Diamond)
  const decisionY = step1Y + 120;
  elements.push(createElement('diamond', originX + 210, decisionY, 180, 90, {
    backgroundColor: '#fde04733',
    strokeColor: '#eab308',
    frameId: frame.id,
  }));
  elements.push(createText('Credentials\nValid?', originX + 255, decisionY + 26, {
    strokeColor: '#facc15',
    fontSize: 14,
    frameId: frame.id,
  }));

  // Branch 1: Invalid (Left) -> Retry
  elements.push(createArrow(originX + 210, decisionY + 45, originX + 60, decisionY + 45, {
    strokeColor: '#f87171',
    frameId: frame.id,
  }));
  elements.push(createText('No', originX + 130, decisionY + 20, {
    strokeColor: '#f87171',
    fontSize: 13,
    frameId: frame.id,
  }));

  elements.push(createElement('rectangle', originX + 20, decisionY + 20, 100, 50, {
    backgroundColor: '#fca5a533',
    strokeColor: '#ef4444',
    frameId: frame.id,
  }));
  elements.push(createText('Show Error', originX + 30, decisionY + 34, {
    strokeColor: '#ef4444',
    fontSize: 13,
    frameId: frame.id,
  }));

  // Loop back arrow
  elements.push(createArrow(originX + 70, decisionY + 20, originX + 200, step1Y + 27, {
    strokeColor: '#f87171',
    strokeStyle: 'dashed',
    frameId: frame.id,
  }));

  // Branch 2: Valid (Down) -> Dashboard
  elements.push(createArrow(originX + 300, decisionY + 90, originX + 300, decisionY + 150, {
    strokeColor: '#22c55e',
    frameId: frame.id,
  }));
  elements.push(createText('Yes', originX + 312, decisionY + 105, {
    strokeColor: '#22c55e',
    fontSize: 13,
    frameId: frame.id,
  }));

  const endY = decisionY + 150;
  elements.push(createElement('rectangle', originX + 200, endY, 200, 50, {
    roundness: { type: 3 },
    backgroundColor: '#86efac33',
    strokeColor: '#22c55e',
    frameId: frame.id,
  }));
  elements.push(createText('Open User Dashboard', originX + 215, endY + 14, {
    strokeColor: '#22c55e',
    fontSize: 14,
    frameId: frame.id,
  }));

  return elements;
}

// 2. System Architecture Template (Cloud, API, DB)
export function generateArchitecture(originX = 100, originY = 100) {
  const elements = [];
  const darkStroke = '#cbd5e1';

  const frame = createElement('frame', originX - 30, originY - 40, 840, 480, {
    name: 'Cloud System Architecture',
    strokeColor: '#38bdf8',
    strokeWidth: 1,
  });
  elements.push(frame);

  // Client Web App
  elements.push(createElement('rectangle', originX + 20, originY + 140, 140, 90, {
    backgroundColor: '#c084fc22',
    strokeColor: '#a855f7',
    frameId: frame.id,
  }));
  elements.push(createText('Frontend Client\n(React / Electron)', originX + 30, originY + 165, {
    strokeColor: '#c084fc',
    fontSize: 13,
    frameId: frame.id,
  }));

  // Arrow to Gateway
  elements.push(createArrow(originX + 160, originY + 185, originX + 240, originY + 185, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));
  elements.push(createText('HTTPS / WSS', originX + 165, originY + 160, {
    strokeColor: '#94a3b8',
    fontSize: 11,
    frameId: frame.id,
  }));

  // API Gateway / Load Balancer
  elements.push(createElement('rectangle', originX + 240, originY + 120, 130, 130, {
    backgroundColor: '#38bdf822',
    strokeColor: '#0ea5e9',
    frameId: frame.id,
  }));
  elements.push(createText('API Gateway\n& Auth Proxy', originX + 252, originY + 165, {
    strokeColor: '#38bdf8',
    fontSize: 13,
    frameId: frame.id,
  }));

  // Arrow to Microservices
  elements.push(createArrow(originX + 370, originY + 155, originX + 450, originY + 95, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));
  elements.push(createArrow(originX + 370, originY + 215, originX + 450, originY + 275, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));

  // Service A (Auth / User)
  elements.push(createElement('rectangle', originX + 450, originY + 50, 150, 80, {
    backgroundColor: '#4ade8022',
    strokeColor: '#22c55e',
    frameId: frame.id,
  }));
  elements.push(createText('Auth Service\n(OAuth2 / JWT)', originX + 465, originY + 70, {
    strokeColor: '#4ade80',
    fontSize: 13,
    frameId: frame.id,
  }));

  // Service B (Data Sync)
  elements.push(createElement('rectangle', originX + 450, originY + 235, 150, 80, {
    backgroundColor: '#fbbf2422',
    strokeColor: '#f59e0b',
    frameId: frame.id,
  }));
  elements.push(createText('Sync Service\n(Diagram Engine)', originX + 462, originY + 255, {
    strokeColor: '#fbbf24',
    fontSize: 13,
    frameId: frame.id,
  }));

  // Databases (Right Side)
  elements.push(createArrow(originX + 600, originY + 90, originX + 670, originY + 90, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));
  elements.push(createArrow(originX + 600, originY + 275, originX + 670, originY + 275, {
    strokeColor: darkStroke,
    frameId: frame.id,
  }));

  // Redis Cache (Cylinder simulated with rounded rect)
  elements.push(createElement('rectangle', originX + 670, originY + 60, 110, 65, {
    roundness: { type: 3 },
    backgroundColor: '#f8717122',
    strokeColor: '#ef4444',
    frameId: frame.id,
  }));
  elements.push(createText('Redis Cache\n(Session store)', originX + 675, originY + 75, {
    strokeColor: '#f87171',
    fontSize: 12,
    frameId: frame.id,
  }));

  // PostgreSQL Database
  elements.push(createElement('rectangle', originX + 670, originY + 245, 110, 65, {
    roundness: { type: 3 },
    backgroundColor: '#60a5fa22',
    strokeColor: '#3b82f6',
    frameId: frame.id,
  }));
  elements.push(createText('PostgreSQL\n(Drawings / Meta)', originX + 672, originY + 260, {
    strokeColor: '#60a5fa',
    fontSize: 12,
    frameId: frame.id,
  }));

  return elements;
}

// 3. Radiant Mind Map Template
export function generateMindMap(originX = 200, originY = 200) {
  const elements = [];

  const frame = createElement('frame', originX - 220, originY - 180, 840, 560, {
    name: 'Mind Map: Project Launch',
    strokeColor: '#38bdf8',
    strokeWidth: 1,
  });
  elements.push(frame);

  // Central Core Node
  const coreX = originX + 160;
  const coreY = originY + 80;
  elements.push(createElement('ellipse', coreX, coreY, 180, 80, {
    backgroundColor: '#38bdf844',
    strokeColor: '#818cf8',
    strokeWidth: 3,
    frameId: frame.id,
  }));
  elements.push(createText('Doodle Desk\nRoadmap', coreX + 35, coreY + 24, {
    strokeColor: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    frameId: frame.id,
  }));

  // 4 Radiant Branches
  const branches = [
    { title: 'Core Features', color: '#38bdf8', bg: '#38bdf822', dx: -190, dy: -120 },
    { title: 'Aesthetics', color: '#ec4899', bg: '#ec489922', dx: 220, dy: -120 },
    { title: 'Performance', color: '#22c55e', bg: '#22c55e22', dx: -190, dy: 130 },
    { title: 'Ecosystem', color: '#eab308', bg: '#eab30822', dx: 220, dy: 130 },
  ];

  branches.forEach(b => {
    const nodeX = coreX + b.dx;
    const nodeY = coreY + b.dy;

    // Curved connector arrow
    elements.push(createArrow(coreX + 90, coreY + 40, nodeX + 70, nodeY + 25, {
      strokeColor: b.color,
      strokeWidth: 2,
      frameId: frame.id,
    }));

    // Branch node
    elements.push(createElement('rectangle', nodeX, nodeY, 140, 50, {
      roundness: { type: 3 },
      backgroundColor: b.bg,
      strokeColor: b.color,
      frameId: frame.id,
    }));
    elements.push(createText(b.title, nodeX + 15, nodeY + 14, {
      strokeColor: b.color,
      fontSize: 14,
      frameId: frame.id,
    }));
  });

  return elements;
}

// 4. Kanban Board Template
export function generateKanban(originX = 100, originY = 100) {
  const elements = [];

  const frame = createElement('frame', originX - 30, originY - 30, 840, 520, {
    name: 'Sprint Kanban Board',
    strokeColor: '#38bdf8',
    strokeWidth: 1,
  });
  elements.push(frame);

  const columns = [
    { title: 'TO DO', color: '#94a3b8', bg: '#94a3b811', x: originX, tasks: ['Auth Dialog Redesign', 'Export to PDF Landscape'] },
    { title: 'IN PROGRESS', color: '#38bdf8', bg: '#38bdf811', x: originX + 260, tasks: ['Command Palette Ctrl+K', 'Mini-Map Navigator'] },
    { title: 'COMPLETED', color: '#22c55e', bg: '#22c55e11', x: originX + 520, tasks: ['Preferences Modal V2', 'Doodle Desk Branding'] },
  ];

  columns.forEach(col => {
    // Column frame/background
    elements.push(createElement('rectangle', col.x, originY, 240, 460, {
      backgroundColor: col.bg,
      strokeColor: col.color,
      strokeWidth: 1.5,
      frameId: frame.id,
    }));

    // Header label
    elements.push(createText(col.title, col.x + 20, originY + 14, {
      strokeColor: col.color,
      fontSize: 14,
      fontWeight: 'bold',
      frameId: frame.id,
    }));

    // Task Sticky Cards
    col.tasks.forEach((task, idx) => {
      const cardY = originY + 50 + idx * 85;
      elements.push(createElement('rectangle', col.x + 12, cardY, 216, 70, {
        backgroundColor: '#1e1e24ee',
        strokeColor: col.color,
        strokeWidth: 1,
        frameId: frame.id,
      }));
      elements.push(createText(task, col.x + 24, cardY + 16, {
        strokeColor: '#f1f5f9',
        fontSize: 13,
        textAlign: 'left',
        frameId: frame.id,
      }));
      // Status pill dot
      elements.push(createElement('ellipse', col.x + 24, cardY + 45, 10, 10, {
        backgroundColor: col.color,
        strokeColor: col.color,
        frameId: frame.id,
      }));
    });
  });

  return elements;
}

// 5. UI Wireframe / App Mockup Template
export function generateWireframe(originX = 150, originY = 100) {
  const elements = [];

  const frame = createElement('frame', originX - 40, originY - 30, 680, 560, {
    name: 'Mobile App Wireframe',
    strokeColor: '#38bdf8',
    strokeWidth: 1,
  });
  elements.push(frame);

  // Mobile Device Frame
  const phoneX = originX + 160;
  const phoneY = originY;
  elements.push(createElement('rectangle', phoneX, phoneY, 280, 500, {
    roundness: { type: 3 },
    backgroundColor: '#141417',
    strokeColor: '#818cf8',
    strokeWidth: 2,
    frameId: frame.id,
  }));

  // Top Status Bar (camera pill)
  elements.push(createElement('rectangle', phoneX + 90, phoneY + 12, 100, 16, {
    roundness: { type: 3 },
    backgroundColor: '#2e2e34',
    strokeColor: '#475569',
    frameId: frame.id,
  }));

  // App Nav Header
  elements.push(createText('Doodle Studio', phoneX + 75, phoneY + 42, {
    strokeColor: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    frameId: frame.id,
  }));

  // Hero Card
  elements.push(createElement('rectangle', phoneX + 18, phoneY + 80, 244, 110, {
    backgroundColor: '#38bdf822',
    strokeColor: '#38bdf8',
    strokeWidth: 1.5,
    frameId: frame.id,
  }));
  elements.push(createText('Welcome Back!\nStart a new diagram', phoneX + 36, phoneY + 115, {
    strokeColor: '#818cf8',
    fontSize: 14,
    frameId: frame.id,
  }));

  // Action Button
  elements.push(createElement('rectangle', phoneX + 18, phoneY + 210, 244, 42, {
    roundness: { type: 3 },
    backgroundColor: '#38bdf8',
    strokeColor: '#38bdf8',
    frameId: frame.id,
  }));
  elements.push(createText('+ Create New Canvas', phoneX + 55, phoneY + 222, {
    strokeColor: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    frameId: frame.id,
  }));

  // Recent Items Section
  elements.push(createText('Recent Diagrams', phoneX + 22, phoneY + 275, {
    strokeColor: '#94a3b8',
    fontSize: 13,
    frameId: frame.id,
  }));

  for (let i = 0; i < 2; i++) {
    const itemY = phoneY + 305 + i * 55;
    elements.push(createElement('rectangle', phoneX + 18, itemY, 244, 45, {
      backgroundColor: '#1f1f24',
      strokeColor: '#334155',
      frameId: frame.id,
    }));
    elements.push(createText(i === 0 ? '📄 System Architecture' : '💡 Brainstorming Mindmap', phoneX + 30, itemY + 14, {
      strokeColor: '#cbd5e1',
      fontSize: 13,
      frameId: frame.id,
    }));
  }

  // Bottom Navigation Bar
  elements.push(createElement('rectangle', phoneX, phoneY + 450, 280, 50, {
    roundness: { type: 3 },
    backgroundColor: '#1a1a20',
    strokeColor: '#334155',
    frameId: frame.id,
  }));
  elements.push(createText('Home    Explore    Saved    Profile', phoneX + 28, phoneY + 466, {
    strokeColor: '#94a3b8',
    fontSize: 12,
    frameId: frame.id,
  }));

  return elements;
}
