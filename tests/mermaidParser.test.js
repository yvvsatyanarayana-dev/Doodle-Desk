import { describe, it, expect } from 'vitest';
import { parseMermaidToElements, MERMAID_PRESETS } from '../src/utils/mermaidParser';

describe('mermaidParser', () => {
  it('parses flowchart TD diagrams into shape, text, and arrow elements', () => {
    const code = `flowchart TD
      A[Start] --> B{Is Valid?}
      B -->|Yes| C[Process]
      B -->|No| D[Reject]`;

    const result = parseMermaidToElements(code, { theme: 'dark' });

    expect(result.error).toBeNull();
    expect(result.type).toBe('flowchart');
    expect(result.elements.length).toBeGreaterThan(0);

    // Verify nodes exist
    const rectangles = result.elements.filter((el) => el.type === 'rectangle');
    const diamonds = result.elements.filter((el) => el.type === 'diamond');
    const arrows = result.elements.filter((el) => el.type === 'arrow');
    const texts = result.elements.filter((el) => el.type === 'text');

    expect(rectangles.length).toBe(3); // Start, Process, Reject
    expect(diamonds.length).toBe(1); // Is Valid?
    expect(arrows.length).toBe(3); // 3 connections
    expect(texts.length).toBeGreaterThanOrEqual(4); // Node labels + edge labels
  });

  it('parses flowchart LR diagrams with horizontal layout', () => {
    const code = `flowchart LR
      Client[Client App] --> Server[API Server]
      Server --> DB[(Database)]`;

    const result = parseMermaidToElements(code, { theme: 'dark' });

    expect(result.error).toBeNull();
    expect(result.type).toBe('flowchart');
    expect(result.elements.length).toBeGreaterThan(0);

    const clientNode = result.elements.find((el) => el.type === 'text' && el.text === 'Client App');
    const serverNode = result.elements.find((el) => el.type === 'text' && el.text === 'API Server');
    const dbNode = result.elements.find((el) => el.type === 'text' && el.text === 'Database');

    expect(clientNode).toBeDefined();
    expect(serverNode).toBeDefined();
    expect(dbNode).toBeDefined();

    // In LR direction, X coordinates should progress from left to right
    expect(serverNode.x).toBeGreaterThan(clientNode.x);
    expect(dbNode.x).toBeGreaterThan(serverNode.x);
  });

  it('parses sequence diagrams with participants and message arrows', () => {
    const code = `sequenceDiagram
      Alice->>Bob: Hello
      Bob-->>Alice: Hi Alice`;

    const result = parseMermaidToElements(code, { theme: 'dark' });

    expect(result.error).toBeNull();
    expect(result.type).toBe('sequence');
    expect(result.elements.length).toBeGreaterThan(0);

    const participants = result.elements.filter(
      (el) => el.type === 'text' && (el.text === 'Alice' || el.text === 'Bob')
    );
    expect(participants.length).toBe(2);

    const arrows = result.elements.filter((el) => el.type === 'arrow');
    expect(arrows.length).toBe(2);
  });

  it('parses all default MERMAID_PRESETS successfully without error', () => {
    MERMAID_PRESETS.forEach((preset) => {
      const result = parseMermaidToElements(preset.code, { theme: 'dark' });
      expect(result.error).toBeNull();
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.bounds).not.toBeNull();
    });
  });
});
