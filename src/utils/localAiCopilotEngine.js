import { createElement, createTextElement, createLinearElement, ELEMENT_TYPES } from '../engine/elements.js';

/**
 * Analyzes selected elements and generates narrative architectural documentation in Markdown.
 */
export function explainDiagram(elements = []) {
  const active = elements.filter(el => el && !el.isDeleted && !el.isHidden);
  if (active.length === 0) {
    return '# System Overview\n\nNo elements currently selected on the canvas. Select components to generate an architecture breakdown.';
  }

  const frames = active.filter(el => el.type === 'frame');
  const components = active.filter(el => el.type !== 'arrow' && el.type !== 'line');
  const arrows = active.filter(el => el.type === 'arrow');

  const componentNames = components.map(c => c.text || c.name || `${c.type} (${Math.round(c.x)},${Math.round(c.y)})`);
  const databases = components.filter(c => c.type === 'cylinder' || (c.text && /db|database|sql|redis|store|cache/i.test(c.text)));
  const gateways = components.filter(c => c.type === 'cloud' || (c.text && /api|gateway|ingress|proxy|cdn/i.test(c.text)));
  const decisions = components.filter(c => c.type === 'diamond' || (c.text && /check|verify|auth|decision|if/i.test(c.text)));

  const title = frames[0]?.name || components[0]?.text || 'Analyzed Architecture Subsystem';

  return `# Architectural Walkthrough: ${title}

## Executive Summary
This subsystem model comprises **${components.length} architectural entities** interconnected via **${arrows.length} directional interaction pathways**. The topology represents an offline-verifiable system blueprint.

${frames.length > 0 ? `### Subsystem Boundaries (${frames.length})\n` + frames.map(f => `- **${f.name || 'Logical Container'}** (Boundary: ${Math.round(f.width)}×${Math.round(f.height)}px)`).join('\n') : ''}

### Core Component Manifest
${componentNames.slice(0, 12).map(n => `- **${n}**`).join('\n')}
${componentNames.length > 12 ? `- *...and ${componentNames.length - 12} additional sub-components*` : ''}

### Topological Roles
- **Data Stores & State Repositories (${databases.length}):** ${databases.map(d => d.text || 'Database').join(', ') || 'Stateless architecture or external persistence'}
- **Ingress & Gateway Interfaces (${gateways.length}):** ${gateways.map(g => g.text || 'Gateway').join(', ') || 'Direct peer-to-peer / internal communication'}
- **Control Flow & Decision Checkpoints (${decisions.length}):** ${decisions.map(dec => dec.text || 'Decision point').join(', ') || 'Linear execution path'}

### Interaction Pathways (${arrows.length})
${arrows.length > 0 ? arrows.slice(0, 10).map((a, i) => `${i + 1}. Directional data flow: ${a.text ? `*\`"${a.text}"\`*` : 'Direct invocation'}`).join('\n') : '- Self-contained components with decoupled asynchronous boundaries'}

## Architectural Recommendations
1. Ensure all ingress entry points maintain explicit schema validation and rate limiting.
2. Verify failure fallback semantics for asynchronous connector routes.
3. Keep boundary frames named semantically to automate CI/CD Architecture Decision Records.
`;
}

/**
 * Instantiates complete diagram architectures directly from natural language prompts.
 * Generates shapes, connectors, containers, and coordinates 100% offline.
 * Supports ANY topic: AI/LLMs, Cloud, E-Commerce, Logistics, Streaming, Fintech, Healthcare,
 * Blockchain, IoT, DevOps, Science/Biology, and universal dynamic concept synthesis.
 */
export function generateDiagramFromPrompt(prompt, originX = 140, originY = 140, isDark = true) {
  const p = (prompt || '').trim().toLowerCase();
  const elements = [];
  const bgFrame = isDark ? '#18181b' : '#ffffff';
  const strokeColor = isDark ? '#ffffff' : '#18181b';
  const accentColor = '#10b981'; // Emerald
  const secondaryColor = '#38bdf8'; // Sky
  const purpleColor = '#a855f7'; // Purple
  const amberColor = '#f59e0b'; // Amber

  // Helper to add node with centered text
  const addBox = (type, x, y, w, h, text, custom = {}) => {
    const el = createElement(type, x, y, w, h, {
      strokeColor: custom.strokeColor || strokeColor,
      backgroundColor: custom.backgroundColor || (isDark ? '#27272a' : '#f4f4f5'),
      fillStyle: custom.fillStyle || 'solid',
      strokeWidth: 1.8,
      roundness: 'round',
      boundElements: [],
      ...custom,
    });
    elements.push(el);

    if (text) {
      const fontSize = custom.fontSize || 13;
      const textEl = createTextElement(x + 10, y + h / 2 - 12, text, {
        width: w - 20,
        fontSize,
        strokeColor: custom.textColor || strokeColor,
        frameId: custom.frameId,
        textAlign: 'center',
      });
      elements.push(textEl);
    }
    return el;
  };

  // Helper to add arrow using createLinearElement with proper points & arrowheads
  const addArrow = (fromEl, toEl, label) => {
    const startX = fromEl.x + (fromEl.width || 120);
    const startY = fromEl.y + (fromEl.height || 60) / 2;
    const endX = toEl.x;
    const endY = toEl.y + (toEl.height || 60) / 2;

    const arrow = createLinearElement(ELEMENT_TYPES.ARROW, startX, startY, endX, endY, {
      strokeColor: isDark ? '#a1a1aa' : '#52525b',
      strokeWidth: 1.8,
      startBinding: { elementId: fromEl.id, focus: 0, gap: 4 },
      endBinding: { elementId: toEl.id, focus: 0, gap: 4 },
      text: label || '',
      frameId: fromEl.frameId || toEl.frameId,
    });

    if (!fromEl.boundElements) fromEl.boundElements = [];
    fromEl.boundElements.push({ id: arrow.id, type: 'arrow' });
    if (!toEl.boundElements) toEl.boundElements = [];
    toEl.boundElements.push({ id: arrow.id, type: 'arrow' });

    elements.push(arrow);
    return arrow;
  };

  // 1. AI, Machine Learning, LLM, or Neural Pipeline
  if (/\b(ai|artificial intelligence|llm|machine learning|deep learning|neural|transformer|rag|gpt|nlp|computer vision)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 940, 500, {
      name: 'Generative AI & LLM Inference Architecture',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const userPrompt = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 130, 65, 'User Query\n& Prompt UI', { frameId: frame.id });
    const tokenizer = addBox(ELEMENT_TYPES.RECTANGLE, originX + 200, originY + 160, 135, 65, 'Tokenizer &\nEmbedding Model', { frameId: frame.id, strokeColor: accentColor });
    const vectorDb = addBox(ELEMENT_TYPES.CYLINDER, originX + 200, originY + 310, 135, 80, 'Vector DB (RAG)\nKnowledge Base', { frameId: frame.id, strokeColor: secondaryColor });
    const llm = addBox(ELEMENT_TYPES.RECTANGLE, originX + 390, originY + 150, 150, 85, 'LLM Foundation Model\n(Transformer Core)', { frameId: frame.id, strokeColor: purpleColor });
    const guardrails = addBox(ELEMENT_TYPES.DIAMOND, originX + 590, originY + 145, 110, 95, 'Safety &\nAlignment Check', { frameId: frame.id, strokeColor: amberColor });
    const output = addBox(ELEMENT_TYPES.RECTANGLE, originX + 750, originY + 160, 140, 65, 'Response &\nTool Execution', { frameId: frame.id, strokeColor: accentColor });

    addArrow(userPrompt, tokenizer, 'Raw Prompt');
    addArrow(tokenizer, vectorDb, 'Semantic Query');
    addArrow(tokenizer, llm, 'Input Embeddings');
    addArrow(vectorDb, llm, 'Context Retrieval');
    addArrow(llm, guardrails, 'Raw Generation');
    addArrow(guardrails, output, 'Verified Response');

  // 2. E-Commerce, Orders, Cart & Checkout Flow
  } else if (/\b(e-?commerce|shop|store|checkout|cart|order|stripe|payment|billing|invoice)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'E-Commerce Order & Checkout Architecture',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const shopper = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Shopper Cart\nWeb & Mobile UI', { frameId: frame.id });
    const orderSvc = addBox(ELEMENT_TYPES.RECTANGLE, originX + 190, originY + 160, 130, 65, 'Order Processing\nService', { frameId: frame.id, strokeColor: accentColor });
    const inventory = addBox(ELEMENT_TYPES.DIAMOND, originX + 360, originY + 145, 110, 95, 'Inventory In Stock\nCheck?', { frameId: frame.id, strokeColor: amberColor });
    const payment = addBox(ELEMENT_TYPES.RECTANGLE, originX + 520, originY + 160, 130, 65, 'Payment Gateway\n(Stripe / Card)', { frameId: frame.id, strokeColor: purpleColor });
    const orderDb = addBox(ELEMENT_TYPES.CYLINDER, originX + 360, originY + 310, 120, 80, 'Orders & Ledger\nPostgreSQL DB', { frameId: frame.id, strokeColor: secondaryColor });
    const fulfillment = addBox(ELEMENT_TYPES.CLOUD, originX + 700, originY + 150, 140, 85, 'Warehouse &\nFulfillment Dispatch', { frameId: frame.id, strokeColor: accentColor });

    addArrow(shopper, orderSvc, 'Checkout Click');
    addArrow(orderSvc, inventory, 'Reserve Stock');
    addArrow(inventory, payment, 'Stock Confirmed');
    addArrow(payment, orderDb, 'Authorize & Record');
    addArrow(payment, fulfillment, 'Trigger Shipment');

  // 3. Ride Hailing, Logistics, Delivery & Uber/Lyft
  } else if (/\b(uber|lyft|ride|dispatch|driver|taxi|delivery|logistics|fleet|route)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'Realtime Dispatch & Logistics Topology',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const rider = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Rider Mobile App\nRequest Pickup', { frameId: frame.id });
    const geoGateway = addBox(ELEMENT_TYPES.CLOUD, originX + 190, originY + 150, 130, 80, 'Geohash Ingress\nWebsocket Gateway', { frameId: frame.id });
    const matchEngine = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 160, 140, 65, 'Driver Match &\nDispatch Engine', { frameId: frame.id, strokeColor: accentColor });
    const geoRedis = addBox(ELEMENT_TYPES.CYLINDER, originX + 360, originY + 310, 140, 80, 'Redis Geospatial\nDriver Locations', { frameId: frame.id, strokeColor: secondaryColor });
    const acceptedCheck = addBox(ELEMENT_TYPES.DIAMOND, originX + 540, originY + 145, 110, 95, 'Driver Accepted\nOffer?', { frameId: frame.id, strokeColor: amberColor });
    const driverApp = addBox(ELEMENT_TYPES.RECTANGLE, originX + 700, originY + 160, 130, 65, 'Driver Navigation\n& Turn-by-Turn', { frameId: frame.id, strokeColor: accentColor });

    addArrow(rider, geoGateway, 'Request Ride');
    addArrow(geoGateway, matchEngine, 'Route Request');
    addArrow(matchEngine, geoRedis, 'Query Nearby');
    addArrow(matchEngine, acceptedCheck, 'Broadcast Offer');
    addArrow(acceptedCheck, driverApp, 'Yes: Dispatch Route');

  // 4. Video Streaming, Transcoding & Media Delivery (Netflix / YouTube)
  } else if (/\b(netflix|youtube|video|audio|transcod|hls|media|broadcast|vod)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'High-Scale Video Transcoding & HLS Streaming',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const creator = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Content Upload\nRaw 4K Video', { frameId: frame.id });
    const transcode = addBox(ELEMENT_TYPES.RECTANGLE, originX + 190, originY + 160, 140, 65, 'Transcoding Worker\n(FFmpeg / H.265 / AV1)', { frameId: frame.id, strokeColor: purpleColor });
    const chunkStore = addBox(ELEMENT_TYPES.CYLINDER, originX + 370, originY + 150, 130, 85, 'Object Storage\n(Multi-Bitrate HLS)', { frameId: frame.id, strokeColor: secondaryColor });
    const cdn = addBox(ELEMENT_TYPES.CLOUD, originX + 540, originY + 150, 130, 80, 'Global Edge CDN\nCache POPs', { frameId: frame.id, strokeColor: accentColor });
    const viewer = addBox(ELEMENT_TYPES.RECTANGLE, originX + 710, originY + 160, 130, 65, 'Viewer Smart TV\n& Mobile Player', { frameId: frame.id, strokeColor: accentColor });

    addArrow(creator, transcode, 'S3 Multipart');
    addArrow(transcode, chunkStore, 'Chunk & Manifest');
    addArrow(chunkStore, cdn, 'Origin Pull');
    addArrow(cdn, viewer, 'Low-Latency Stream');

  // 5. Blockchain, Crypto, Smart Contracts & Web3
  } else if (/\b(blockchain|crypto|bitcoin|ethereum|web3|smart contract|ledger|token|wallet|defi)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'Decentralized Blockchain & Smart Contract Flow',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const wallet = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Crypto Wallet\nSign Tx (ECDSA)', { frameId: frame.id });
    const rpc = addBox(ELEMENT_TYPES.CLOUD, originX + 190, originY + 150, 130, 80, 'RPC Gateway\nMempool Queue', { frameId: frame.id });
    const validator = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 160, 140, 65, 'Validator Consensus\n(Proof-of-Stake)', { frameId: frame.id, strokeColor: accentColor });
    const verify = addBox(ELEMENT_TYPES.DIAMOND, originX + 540, originY + 145, 110, 95, 'Nonce & Balance\nValid?', { frameId: frame.id, strokeColor: amberColor });
    const block = addBox(ELEMENT_TYPES.RECTANGLE, originX + 700, originY + 160, 130, 65, 'Immutable Block\nMerkle State Update', { frameId: frame.id, strokeColor: purpleColor });
    const evm = addBox(ELEMENT_TYPES.CYLINDER, originX + 360, originY + 310, 140, 80, 'Smart Contract\nEVM State Storage', { frameId: frame.id, strokeColor: secondaryColor });

    addArrow(wallet, rpc, 'Broadcast Tx');
    addArrow(rpc, validator, 'Gossip Protocol');
    addArrow(validator, verify, 'Consensus Vote');
    addArrow(verify, block, 'Mint Block');
    addArrow(validator, evm, 'Execute OpCodes');

  // 6. Healthcare, Hospital & Patient Workflow
  } else if (/\b(hospital|health|medical|patient|clinic|doctor|pharmacy|triage|prescription)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'Clinical Patient Care & Hospital Workflow',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const patient = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Patient Check-in\n& Registration', { frameId: frame.id });
    const triage = addBox(ELEMENT_TYPES.DIAMOND, originX + 190, originY + 145, 110, 95, 'Triage Severity\nCritical?', { frameId: frame.id, strokeColor: amberColor });
    const doctor = addBox(ELEMENT_TYPES.RECTANGLE, originX + 350, originY + 160, 130, 65, 'Physician Clinical\nExam & Diagnosis', { frameId: frame.id, strokeColor: accentColor });
    const ehr = addBox(ELEMENT_TYPES.CYLINDER, originX + 350, originY + 310, 130, 80, 'Electronic Health\nRecords (HIPAA EHR)', { frameId: frame.id, strokeColor: secondaryColor });
    const pharmacy = addBox(ELEMENT_TYPES.RECTANGLE, originX + 530, originY + 160, 130, 65, 'Pharmacy &\nPrescription Desk', { frameId: frame.id });
    const discharge = addBox(ELEMENT_TYPES.RECTANGLE, originX + 700, originY + 160, 130, 65, 'Follow-up &\nDischarge Summary', { frameId: frame.id, strokeColor: accentColor });

    addArrow(patient, triage, 'Vitals Intake');
    addArrow(triage, doctor, 'Assign Room');
    addArrow(doctor, ehr, 'Log Encounter');
    addArrow(doctor, pharmacy, 'Order Medicine');
    addArrow(pharmacy, discharge, 'Patient Complete');

  // 7. Banking, Fintech & Fraud Detection
  } else if (/\b(bank|banking|fintech|fraud|loan|credit|atm|wire|settlement)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'Real-time Core Banking & Fraud Prevention Pipeline',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const tx = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Transaction Initiate\n(Card / SWIFT / UPI)', { frameId: frame.id });
    const fraudEngine = addBox(ELEMENT_TYPES.RECTANGLE, originX + 190, originY + 160, 140, 65, 'Realtime ML Fraud\nDetection Engine', { frameId: frame.id, strokeColor: purpleColor });
    const checkRisk = addBox(ELEMENT_TYPES.DIAMOND, originX + 370, originY + 145, 110, 95, 'Risk Score <\nThreshold?', { frameId: frame.id, strokeColor: amberColor });
    const ledger = addBox(ELEMENT_TYPES.CYLINDER, originX + 530, originY + 150, 130, 85, 'Core Banking Ledger\n(Double-Entry ACID)', { frameId: frame.id, strokeColor: secondaryColor });
    const notify = addBox(ELEMENT_TYPES.RECTANGLE, originX + 700, originY + 160, 130, 65, 'Instant Receipt &\nPUSH Notification', { frameId: frame.id, strokeColor: accentColor });

    addArrow(tx, fraudEngine, 'Ingest Transaction');
    addArrow(fraudEngine, checkRisk, 'Evaluate Velocity');
    addArrow(checkRisk, ledger, 'Approved: Commit');
    addArrow(ledger, notify, 'Emit SMS Alert');

  // 8. Social Networks, Feed Ranking & Recommendation
  } else if (/\b(social|feed|followers?|timeline|posts?|tweet|recommendation)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'Social Network Graph & Feed Ranking Algorithm',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const user = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'User Action\nScroll / Like / Post', { frameId: frame.id });
    const collector = addBox(ELEMENT_TYPES.CLOUD, originX + 190, originY + 150, 130, 80, 'Telemetry Collector\nEdge Aggregator', { frameId: frame.id });
    const graphDb = addBox(ELEMENT_TYPES.CYLINDER, originX + 360, originY + 310, 130, 80, 'Graph Database\nFollowers & Network', { frameId: frame.id, strokeColor: secondaryColor });
    const ranker = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 160, 140, 65, 'Multi-Stage Ranker\n(Two-Tower DNN)', { frameId: frame.id, strokeColor: purpleColor });
    const dedupe = addBox(ELEMENT_TYPES.DIAMOND, originX + 540, originY + 145, 110, 95, 'Deduplicate &\nDiversity Filter', { frameId: frame.id, strokeColor: amberColor });
    const feed = addBox(ELEMENT_TYPES.RECTANGLE, originX + 700, originY + 160, 130, 65, 'Personalized\nChronological Feed', { frameId: frame.id, strokeColor: accentColor });

    addArrow(user, collector, 'Engagement Event');
    addArrow(collector, ranker, 'Candidate Fetch');
    addArrow(graphDb, ranker, 'Friend Graph');
    addArrow(ranker, dedupe, 'Top 100 Scored');
    addArrow(dedupe, feed, 'Render Feed');

  // 9. IoT, Smart Home, Sensors & Robotics
  } else if (/\b(iot|smart home|sensor|telemetry|mqtt|scada|robot|arduino|hardware)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: 'IoT Edge Telemetry & Device Automation',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const sensors = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 120, 65, 'Hardware Sensors\n(Temp, Humidity, GPS)', { frameId: frame.id });
    const mqtt = addBox(ELEMENT_TYPES.CLOUD, originX + 190, originY + 150, 130, 80, 'MQTT Broker\nEMQX / Mosquitto', { frameId: frame.id, strokeColor: secondaryColor });
    const ruleEngine = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 160, 135, 65, 'IoT Rules Engine\nComplex Event Stream', { frameId: frame.id, strokeColor: purpleColor });
    const alertCheck = addBox(ELEMENT_TYPES.DIAMOND, originX + 535, originY + 145, 110, 95, 'Threshold Exceeded\nAlert?', { frameId: frame.id, strokeColor: amberColor });
    const timeDb = addBox(ELEMENT_TYPES.CYLINDER, originX + 360, originY + 310, 135, 80, 'Time-Series DB\n(InfluxDB / Timescale)', { frameId: frame.id, strokeColor: accentColor });
    const actuator = addBox(ELEMENT_TYPES.RECTANGLE, originX + 695, originY + 160, 135, 65, 'Actuator / Relay\nTrigger Power / Alarm', { frameId: frame.id, strokeColor: accentColor });

    addArrow(sensors, mqtt, 'Publish Topic');
    addArrow(mqtt, ruleEngine, 'Subscribe');
    addArrow(ruleEngine, timeDb, 'Log Metrics');
    addArrow(ruleEngine, alertCheck, 'Evaluate Threshold');
    addArrow(alertCheck, actuator, 'Fire Action');

  // 10. Natural Science, Photosynthesis, Solar & Energy Systems
  } else if (/\b(photosynthesis|solar|energy|plant|cell|biology|physics|chemistry|battery|grid)\b/i.test(p)) {
    const isPlant = /\b(photosynthesis|plant|cell|biology)\b/i.test(p);
    const title = isPlant ? 'Biochemical Photosynthesis Energy Cycle' : 'Smart Solar Grid & Battery Storage Architecture';
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: title,
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const inputEnergy = addBox(ELEMENT_TYPES.CLOUD, originX + 30, originY + 150, 120, 75, isPlant ? 'Sunlight & CO2\n(Atmospheric Input)' : 'Solar PV Array\nSunlight Harvesting', { frameId: frame.id, strokeColor: amberColor });
    const converter = addBox(ELEMENT_TYPES.RECTANGLE, originX + 190, originY + 160, 130, 65, isPlant ? 'Chloroplasts\n(Light Reaction)' : 'Inverter / MPPT\nDC to AC Converter', { frameId: frame.id, strokeColor: accentColor });
    const energyState = addBox(ELEMENT_TYPES.CYLINDER, originX + 360, originY + 150, 130, 85, isPlant ? 'ATP & NADPH\nChemical Energy' : 'Lithium-Ion Battery\nEnergy Storage Bank', { frameId: frame.id, strokeColor: secondaryColor });
    const regulator = addBox(ELEMENT_TYPES.DIAMOND, originX + 530, originY + 145, 110, 95, isPlant ? 'Calvin Cycle\nFixation Rate?' : 'Grid Demand\nBalance Check?', { frameId: frame.id, strokeColor: purpleColor });
    const outputProduct = addBox(ELEMENT_TYPES.RECTANGLE, originX + 690, originY + 160, 140, 65, isPlant ? 'Glucose & Oxygen\n(Biomass & O2)' : 'Utility Power Grid\n& Home Consumption', { frameId: frame.id, strokeColor: accentColor });

    addArrow(inputEnergy, converter, isPlant ? 'Photon Absorption' : 'Raw DC Voltage');
    addArrow(converter, energyState, isPlant ? 'Excited Electrons' : 'Charge Battery');
    addArrow(energyState, regulator, isPlant ? 'Dark Reaction' : 'Discharge Control');
    addArrow(regulator, outputProduct, isPlant ? 'Sugar Synthesis' : 'Deliver AC Power');

  // 11. CI/CD & DevOps Pipeline
  } else if (/\b(ci\/?cd|devops|deploy|docker|kubernetes|k8s|jenkins|github actions)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 900, 460, {
      name: 'Automated CI/CD DevOps & Deployment Pipeline',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const dev = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 150, 120, 65, 'Developer Git\nPush (Main)', { frameId: frame.id });
    const runner = addBox(ELEMENT_TYPES.RECTANGLE, originX + 190, originY + 150, 130, 65, 'CI Runner\n(Lint & Tests)', { frameId: frame.id, strokeColor: accentColor });
    const build = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 150, 130, 65, 'Container Build\n(Docker Image)', { frameId: frame.id });
    const scan = addBox(ELEMENT_TYPES.DIAMOND, originX + 530, originY + 135, 110, 95, 'Security &\nCVE Scan', { frameId: frame.id, strokeColor: amberColor });
    const k8s = addBox(ELEMENT_TYPES.CLOUD, originX + 700, originY + 140, 140, 85, 'Kubernetes\nProduction Cluster', { frameId: frame.id, strokeColor: secondaryColor });

    addArrow(dev, runner, 'Webhook Trigger');
    addArrow(runner, build, 'Tests Pass');
    addArrow(build, scan, 'Image Artifact');
    addArrow(scan, k8s, 'Rolling Deploy');

  // 12. Streaming Data, ETL, Kafka & Spark
  } else if (/\b(etl|data warehouse|snowflake|databricks|big data|kafka|spark|flink|data lake|lakehouse)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 900, 480, {
      name: 'Modern Streaming Data & ETL Pipeline',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const sources = addBox(ELEMENT_TYPES.CLOUD, originX + 30, originY + 150, 120, 75, 'Data Sources\n(IoT, APIs, DBs)', { frameId: frame.id });
    const ingestion = addBox(ELEMENT_TYPES.RECTANGLE, originX + 200, originY + 155, 130, 65, 'Ingestion Engine\n(CDC / Debezium)', { frameId: frame.id });
    const stream = addBox(ELEMENT_TYPES.CYLINDER, originX + 380, originY + 145, 130, 85, 'Apache Kafka\nEvent Stream', { frameId: frame.id, strokeColor: accentColor });
    const spark = addBox(ELEMENT_TYPES.RECTANGLE, originX + 560, originY + 155, 140, 65, 'Transform Engine\n(Apache Spark / Flink)', { frameId: frame.id, strokeColor: purpleColor });
    const warehouse = addBox(ELEMENT_TYPES.CYLINDER, originX + 740, originY + 145, 120, 85, 'Delta Lake /\nSnowflake', { frameId: frame.id, strokeColor: secondaryColor });

    addArrow(sources, ingestion, 'Raw Events');
    addArrow(ingestion, stream, 'Produce Stream');
    addArrow(stream, spark, 'Realtime Consume');
    addArrow(spark, warehouse, 'Clean Tables');

  // 13. Serverless & Cloud Infrastructure
  } else if (/\b(serverless|lambda|cloud function|aws|azure|gcp)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 860, 460, {
      name: 'Event-Driven Serverless Cloud Architecture',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const client = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 150, 120, 65, 'Client Device\nWeb / Mobile', { frameId: frame.id });
    const apiGateway = addBox(ELEMENT_TYPES.CLOUD, originX + 190, originY + 140, 130, 80, 'API Gateway\nHTTP Routes', { frameId: frame.id });
    const lambda = addBox(ELEMENT_TYPES.RECTANGLE, originX + 370, originY + 150, 140, 65, 'Serverless Lambda\nCompute Handlers', { frameId: frame.id, strokeColor: accentColor });
    const dynamo = addBox(ELEMENT_TYPES.CYLINDER, originX + 560, originY + 80, 120, 75, 'DynamoDB\nNoSQL State', { frameId: frame.id, strokeColor: secondaryColor });
    const s3 = addBox(ELEMENT_TYPES.CYLINDER, originX + 560, originY + 230, 120, 75, 'S3 Bucket\nStatic Storage', { frameId: frame.id, strokeColor: amberColor });

    addArrow(client, apiGateway, 'HTTPS Request');
    addArrow(apiGateway, lambda, 'Invoke Event');
    addArrow(lambda, dynamo, 'Read / Write Document');
    addArrow(lambda, s3, 'Store Media Blobs');

  // 14. Modern OAuth2 / JWT Authentication Flow
  } else if (/\b(auth|authentication|oauth|jwt|sso|login|security)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 780, 440, {
      name: 'OAuth2 & JWT Authentication Architecture',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const client = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 140, 120, 60, 'Client App\n(React SPA)', { frameId: frame.id });
    const gateway = addBox(ELEMENT_TYPES.CLOUD, originX + 200, originY + 130, 140, 80, 'API Gateway\nReverse Proxy', { frameId: frame.id });
    const authServer = addBox(ELEMENT_TYPES.RECTANGLE, originX + 390, originY + 60, 140, 65, 'Identity Provider\nOAuth2 / OIDC', { frameId: frame.id, strokeColor: accentColor });
    const redis = addBox(ELEMENT_TYPES.CYLINDER, originX + 580, originY + 55, 120, 75, 'Redis Store\nRefresh Tokens', { frameId: frame.id });
    const resourceService = addBox(ELEMENT_TYPES.RECTANGLE, originX + 390, originY + 240, 140, 65, 'Resource Service\nProtected API', { frameId: frame.id });
    const resourceDb = addBox(ELEMENT_TYPES.CYLINDER, originX + 580, originY + 235, 120, 75, 'Application DB\nPostgreSQL', { frameId: frame.id });

    addArrow(client, gateway, 'HTTPS Request');
    addArrow(gateway, authServer, 'Validate / Sign');
    addArrow(authServer, redis, 'Verify Session');
    addArrow(gateway, resourceService, 'Bearer Token');
    addArrow(resourceService, resourceDb, 'Query Data');

  // 15. Microservices Mesh & Distributed Systems
  } else if (/\b(microservice|mesh|distributed|kubernetes)\b/i.test(p)) {
    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 860, 480, {
      name: 'Resilient Microservices Mesh Topology',
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const client = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 170, 110, 60, 'Client Browser\n/ Mobile', { frameId: frame.id });
    const ingress = addBox(ELEMENT_TYPES.CLOUD, originX + 180, originY + 160, 130, 80, 'Ingress Gateway\nEnvoy Proxy', { frameId: frame.id });
    const userSvc = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 60, 140, 60, 'User Service\n(Go / gRPC)', { frameId: frame.id });
    const orderSvc = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 170, 140, 60, 'Order Service\n(Node.js)', { frameId: frame.id });
    const paySvc = addBox(ELEMENT_TYPES.RECTANGLE, originX + 360, originY + 280, 140, 60, 'Payment Service\n(Rust)', { frameId: frame.id });
    const cache = addBox(ELEMENT_TYPES.CYLINDER, originX + 550, originY + 50, 110, 75, 'Distributed\nRedis Cache', { frameId: frame.id });
    const orderDb = addBox(ELEMENT_TYPES.CYLINDER, originX + 550, originY + 160, 110, 75, 'Order DB\nMongoDB', { frameId: frame.id });
    const mq = addBox(ELEMENT_TYPES.CYLINDER, originX + 550, originY + 270, 110, 75, 'RabbitMQ\nBroker', { frameId: frame.id });

    addArrow(client, ingress, 'HTTPS / TLS');
    addArrow(ingress, userSvc, 'Route /users');
    addArrow(ingress, orderSvc, 'Route /orders');
    addArrow(ingress, paySvc, 'Route /checkout');
    addArrow(userSvc, cache, 'Read / Write');
    addArrow(orderSvc, orderDb, 'Persist');
    addArrow(paySvc, mq, 'Publish Event');

  // 16. Universal Dynamic Concept Synthesizer for ANY OTHER Arbitrary Topic
  } else {
    // Clean and capitalize prompt words
    const rawWords = (prompt || 'System Process Workflow')
      .replace(/^(draw|create|make|show|design|generate)\s+/i, '')
      .replace(/\s+(works?|system|diagram|flow|architecture|pipeline)$/i, '')
      .trim();

    const titleCased = rawWords.charAt(0).toUpperCase() + rawWords.slice(1);
    const keywords = rawWords.split(/\s+/).filter(w => w.length > 2);
    const mainTopic = keywords.length > 0 ? keywords[0].toUpperCase() : 'CORE';

    const frame = createElement(ELEMENT_TYPES.FRAME, originX, originY, 920, 480, {
      name: `${titleCased} Architecture & Execution Flow`,
      backgroundColor: bgFrame,
      strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    });
    elements.push(frame);

    const initiator = addBox(ELEMENT_TYPES.RECTANGLE, originX + 30, originY + 160, 125, 65, `Trigger / Input:\n${titleCased.slice(0, 20)}`, { frameId: frame.id });
    const ingress = addBox(ELEMENT_TYPES.CLOUD, originX + 195, originY + 150, 130, 80, `Ingress Protocol\n& Gateway`, { frameId: frame.id, strokeColor: secondaryColor });
    const engine = addBox(ELEMENT_TYPES.RECTANGLE, originX + 365, originY + 160, 140, 65, `${mainTopic} Processing\n& Logic Engine`, { frameId: frame.id, strokeColor: accentColor });
    const decision = addBox(ELEMENT_TYPES.DIAMOND, originX + 545, originY + 145, 110, 95, `Validation &\nRule Policy?`, { frameId: frame.id, strokeColor: amberColor });
    const persistence = addBox(ELEMENT_TYPES.CYLINDER, originX + 365, originY + 310, 140, 80, `Audit State &\n${mainTopic} Data Store`, { frameId: frame.id, strokeColor: purpleColor });
    const outcome = addBox(ELEMENT_TYPES.RECTANGLE, originX + 705, originY + 160, 135, 65, `Final Output &\nFeedback Target`, { frameId: frame.id, strokeColor: accentColor });

    addArrow(initiator, ingress, 'Initiate Request');
    addArrow(ingress, engine, 'Dispatch Payload');
    addArrow(engine, persistence, 'Persist State');
    addArrow(engine, decision, 'Verify Constraints');
    addArrow(decision, outcome, 'Approved: Deliver');
  }

  return elements;
}

/**
 * Diagram Linter: Detects unlabelled arrows, decision frames missing outcomes, and orphan components.
 */
export function lintDiagram(elements = []) {
  const active = elements.filter(el => el && !el.isDeleted && !el.isHidden);
  const issues = [];
  const nodes = active.filter(el => el.type !== 'arrow' && el.type !== 'line');
  const arrows = active.filter(el => el.type === 'arrow');

  const connectedIds = new Set();
  arrows.forEach(a => {
    if (a.startBinding?.elementId) connectedIds.add(a.startBinding.elementId);
    if (a.endBinding?.elementId) connectedIds.add(a.endBinding.elementId);
  });

  // Check 1: Orphan nodes
  nodes.forEach(n => {
    if (n.type === 'frame') return;
    if (!connectedIds.has(n.id)) {
      issues.push({
        severity: 'warning',
        elementId: n.id,
        title: 'Orphan Component',
        description: `"${n.text || n.name || n.type}" has no incoming or outgoing connectors.`,
      });
    }
  });

  // Check 2: Unlabelled arrows
  arrows.forEach(a => {
    if (!a.text || !a.text.trim()) {
      issues.push({
        severity: 'info',
        elementId: a.id,
        title: 'Unlabelled Connector',
        description: 'Directional arrow connector lacks an interaction description label.',
      });
    }
  });

  // Check 3: Decision diamond missing outcome branches
  const decisions = nodes.filter(n => n.type === 'diamond');
  decisions.forEach(d => {
    const outgoing = arrows.filter(a => a.startBinding?.elementId === d.id);
    if (outgoing.length < 2) {
      issues.push({
        severity: 'warning',
        elementId: d.id,
        title: 'Decision Node Incomplete',
        description: `Decision diamond "${d.text || 'Condition'}" has ${outgoing.length} outgoing path(s). Decision nodes should have at least 2 branches (e.g. Yes/No).`,
      });
    }
  });

  const result = [...issues];
  result.issues = issues;
  result.summary = {
    totalIssues: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };
  return result;
}

/**
 * Architecture Reviewer: Detects single points of failure (SPOF) and circular dependencies.
 */
export function reviewArchitecture(elements = []) {
  const active = elements.filter(el => el && !el.isDeleted && !el.isHidden);
  const nodes = active.filter(el => el.type !== 'arrow' && el.type !== 'line' && el.type !== 'frame');
  const arrows = active.filter(el => el.type === 'arrow');

  const incomingCounts = new Map();
  const outgoingCounts = new Map();
  const adj = new Map();

  nodes.forEach(n => {
    incomingCounts.set(n.id, 0);
    outgoingCounts.set(n.id, 0);
    adj.set(n.id, []);
  });

  arrows.forEach(a => {
    const from = a.startBinding?.elementId;
    const to = a.endBinding?.elementId;
    if (from && to && adj.has(from) && adj.has(to)) {
      outgoingCounts.set(from, (outgoingCounts.get(from) || 0) + 1);
      incomingCounts.set(to, (incomingCounts.get(to) || 0) + 1);
      adj.get(from).push(to);
    }
  });

  const findings = [];

  // SPOF Detection: high in-degree with no backup
  nodes.forEach(n => {
    const inCount = incomingCounts.get(n.id) || 0;
    const label = n.text || n.name || n.type;
    if (inCount >= 3) {
      findings.push({
        type: 'SPOF_RISK',
        severity: 'critical',
        elementId: n.id,
        name: label,
        reason: `High coupling: ${inCount} separate upstream components depend on this single component without visible redundancy.`,
        recommendation: 'Introduce an ingress load balancer or read replicas to decouple single point of failure risk.',
      });
    }
  });

  // Cycle Detection (DFS)
  const visited = new Set();
  const recStack = new Set();
  let cycleDetected = false;

  function dfs(curr, path = []) {
    visited.add(curr);
    recStack.add(curr);
    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        dfs(next, [...path, curr]);
      } else if (recStack.has(next)) {
        cycleDetected = true;
        const cycleNodes = [...path, curr, next];
        findings.push({
          type: 'CIRCULAR_DEPENDENCY',
          severity: 'warning',
          elementId: curr,
          name: 'Cyclic Interaction Loop',
          reason: `Detected circular invocation chain involving ${cycleNodes.length} nodes.`,
          recommendation: 'Break circular synchronous RPC loops with asynchronous event queues or pub/sub topics.',
        });
      }
    }
    recStack.delete(curr);
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) dfs(n.id);
  });

  const spofCandidates = findings.filter(f => f.type === 'SPOF_RISK').map(f => ({
    id: f.elementId,
    name: f.name,
    degree: 3,
    inDegree: 3,
    outDegree: 0,
  }));
  const circularDependencies = findings.filter(f => f.type === 'CIRCULAR_DEPENDENCY').map(f => ({
    path: [f.name],
  }));
  const riskScore = findings.length > 0 ? Math.min(100, findings.length * 25) : 0;
  const summary = findings.length > 0
    ? `Identified ${findings.length} resilience risk factor(s).`
    : 'No critical single points of failure detected in the active graph topology.';

  return {
    findings,
    spofCandidates,
    circularDependencies,
    riskScore,
    summary,
    totalComponents: nodes.length,
    totalConnections: arrows.length,
    healthScore: Math.max(20, 100 - findings.length * 15),
  };
}

/**
 * Scans tables and frames on canvas to generate study Flashcard decks.
 */
export function generateAutoFlashcards(elements = []) {
  const active = elements.filter(el => el && !el.isDeleted && !el.isHidden);
  const flashcards = [];

  // Extract from Interactive Tables
  const tables = active.filter(el => el.docType === 'interactive_table' || el.tableData);
  tables.forEach(t => {
    const data = t.tableData || [];
    data.forEach((row, i) => {
      const keys = Object.keys(row).filter(k => k !== 'id');
      if (keys.length >= 2) {
        flashcards.push({
          id: `card_${t.id}_${i}`,
          question: `${keys[0]}: ${row[keys[0]]}`,
          answer: `${keys[1]}: ${row[keys[1]]}`,
          source: t.name || 'Table Entity',
        });
      }
    });
  });

  // Extract from Connected Nodes
  const nodes = new Map(active.map(el => [el.id, el]));
  const arrows = active.filter(el => el.type === 'arrow' && el.text);
  arrows.forEach((a, i) => {
    const from = nodes.get(a.startBinding?.elementId);
    const to = nodes.get(a.endBinding?.elementId);
    if (from?.text && to?.text) {
      flashcards.push({
        id: `arrow_card_${i}`,
        question: `How does "${from.text}" interact with "${to.text}"?`,
        answer: a.text,
        source: 'Diagram Connector',
      });
    }
  });

  // Extract from Frames
  const frames = active.filter(el => el.type === 'frame');
  frames.forEach(f => {
    if (f.name) {
      flashcards.push({
        id: `frame_card_${f.id}`,
        question: `What is the role of the "${f.name}" subsystem?`,
        answer: `It bounds and isolates the architectural components responsible for ${f.name}.`,
        source: 'Subsystem Frame',
      });
    }
  });

  return flashcards;
}
