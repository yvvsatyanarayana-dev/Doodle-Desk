import { describe, it, expect } from 'vitest';
import { applyAutoLayout, AUTO_LAYOUT_TYPES } from '../src/engine/layout/autoLayout.js';
import { HistoryManager } from '../src/engine/history.js';

describe('Extraordinary Whiteboard Features', () => {
  describe('AI Smart Auto-Layout Engine', () => {
    it('arranges elements in a clean horizontal flow pipeline', () => {
      const elements = [
        { id: '1', type: 'rectangle', x: 200, y: 100, width: 100, height: 50 },
        { id: '2', type: 'rectangle', x: 50, y: 120, width: 80, height: 40 },
        { id: '3', type: 'rectangle', x: 400, y: 80, width: 120, height: 60 },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW,
        gap: 40,
      });

      // The sorted order should be 2, 1, 3
      const el2 = arranged.find((e) => e.id === '2');
      const el1 = arranged.find((e) => e.id === '1');
      const el3 = arranged.find((e) => e.id === '3');

      expect(el2.x).toBe(50); // origin
      expect(el1.x).toBe(50 + 80 + 40); // 170
      expect(el3.x).toBe(170 + 100 + 40); // 310
    });

    it('arranges elements into a balanced smart grid matrix', () => {
      const elements = [
        { id: '1', type: 'rectangle', x: 10, y: 10, width: 100, height: 60 },
        { id: '2', type: 'rectangle', x: 50, y: 20, width: 100, height: 60 },
        { id: '3', type: 'rectangle', x: 90, y: 30, width: 100, height: 60 },
        { id: '4', type: 'rectangle', x: 130, y: 40, width: 100, height: 60 },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.GRID_MATRIX,
        columns: 2,
        gap: 30,
      });

      expect(arranged.length).toBe(4);
      // Items 0 and 1 in column 0 & 1, row 0
      // Items 2 and 3 in column 0 & 1, row 1
      const p1 = arranged.find((e) => e.id === '1');
      const p2 = arranged.find((e) => e.id === '2');
      const p3 = arranged.find((e) => e.id === '3');
      const p4 = arranged.find((e) => e.id === '4');

      expect(p1.y).toBe(p2.y);
      expect(p3.y).toBe(p4.y);
      expect(p3.y).toBeGreaterThan(p1.y);
    });

    it('updates bound text elements when their parent container moves', () => {
      const elements = [
        { id: 'box1', type: 'rectangle', x: 100, y: 100, width: 120, height: 80 },
        { id: 'text1', type: 'text', containerId: 'box1', x: 120, y: 120, width: 80, height: 20 },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW,
        gap: 50,
      });

      const box = arranged.find((e) => e.id === 'box1');
      const text = arranged.find((e) => e.id === 'text1');

      // Bound text offset from parent should remain constant
      expect(text.x - box.x).toBe(20);
      expect(text.y - box.y).toBe(20);
    });

    it('keeps bound arrow endpoints attached as connected shapes move', () => {
      const elements = [
        { id: 'box1', type: 'rectangle', x: 100, y: 100, width: 80, height: 60 },
        { id: 'box2', type: 'rectangle', x: 300, y: 120, width: 80, height: 60 },
        {
          id: 'arrow1',
          type: 'arrow',
          x: 180,
          y: 130,
          width: 120,
          height: 20,
          points: [[0, 0], [120, 20]],
          startBinding: { elementId: 'box1' },
          endBinding: { elementId: 'box2' },
        },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.VERTICAL_FLOW,
        gap: 40,
      });
      const box1 = arranged.find((element) => element.id === 'box1');
      const box2 = arranged.find((element) => element.id === 'box2');
      const arrow = arranged.find((element) => element.id === 'arrow1');

      expect(arrow.x + arrow.points[0][0]).toBe(box1.x + box1.width / 2);
      expect(arrow.y + arrow.points[0][1]).toBe(box1.y + box1.height);
      expect(arrow.x + arrow.points.at(-1)[0]).toBe(box2.x + box2.width / 2);
      expect(arrow.y + arrow.points.at(-1)[1]).toBe(box2.y);
      expect(arrow.points.slice(1).every(([x, y], index) => {
        const [previousX, previousY] = arrow.points[index];
        return x === previousX || y === previousY;
      })).toBe(true);
    });

    it('routes bound connectors around unselected shapes', () => {
      const elements = [
        { id: 'start', type: 'rectangle', x: 0, y: 0, width: 80, height: 60 },
        { id: 'end', type: 'rectangle', x: 300, y: 0, width: 80, height: 60 },
        { id: 'obstacle', type: 'rectangle', x: 150, y: -10, width: 80, height: 80 },
        {
          id: 'connector',
          type: 'arrow',
          x: 80,
          y: 30,
          width: 220,
          height: 0,
          points: [[0, 0], [220, 0]],
          startBinding: { elementId: 'start' },
          endBinding: { elementId: 'end' },
        },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW,
        selectedIds: { start: true, end: true },
        gap: 200,
      });
      const connector = arranged.find((element) => element.id === 'connector');
      const obstacle = arranged.find((element) => element.id === 'obstacle');
      const routePoints = connector.points.map(([x, y]) => [connector.x + x, connector.y + y]);
      const crossesObstacle = routePoints.slice(1).some(([x, y], index) => {
        const [previousX, previousY] = routePoints[index];
        if (y === previousY) {
          return y > obstacle.y - 8 && y < obstacle.y + obstacle.height + 8 &&
            Math.max(Math.min(x, previousX), obstacle.x - 8) <
              Math.min(Math.max(x, previousX), obstacle.x + obstacle.width + 8);
        }
        if (x === previousX) {
          return x > obstacle.x - 8 && x < obstacle.x + obstacle.width + 8 &&
            Math.max(Math.min(y, previousY), obstacle.y - 8) <
              Math.min(Math.max(y, previousY), obstacle.y + obstacle.height + 8);
        }
        return true;
      });

      expect(crossesObstacle).toBe(false);
    });

    it('routes vertical connectors around unselected shapes', () => {
      const elements = [
        { id: 'start', type: 'rectangle', x: 0, y: 0, width: 80, height: 60 },
        { id: 'end', type: 'rectangle', x: 0, y: 300, width: 80, height: 60 },
        { id: 'obstacle', type: 'rectangle', x: -10, y: 150, width: 80, height: 80 },
        {
          id: 'connector',
          type: 'arrow',
          x: 40,
          y: 60,
          width: 0,
          height: 240,
          points: [[0, 0], [0, 240]],
          startBinding: { elementId: 'start' },
          endBinding: { elementId: 'end' },
        },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.VERTICAL_FLOW,
        selectedIds: { start: true, end: true },
        gap: 200,
      });
      const connector = arranged.find((element) => element.id === 'connector');
      const obstacle = arranged.find((element) => element.id === 'obstacle');
      const routePoints = connector.points.map(([x, y]) => [connector.x + x, connector.y + y]);
      const crossesObstacle = routePoints.slice(1).some(([x, y], index) => {
        const [previousX, previousY] = routePoints[index];
        if (y === previousY) {
          return y > obstacle.y - 8 && y < obstacle.y + obstacle.height + 8 &&
            Math.max(Math.min(x, previousX), obstacle.x - 8) <
              Math.min(Math.max(x, previousX), obstacle.x + obstacle.width + 8);
        }
        if (x === previousX) {
          return x > obstacle.x - 8 && x < obstacle.x + obstacle.width + 8 &&
            Math.max(Math.min(y, previousY), obstacle.y - 8) <
              Math.min(Math.max(y, previousY), obstacle.y + obstacle.height + 8);
        }
        return true;
      });

      expect(crossesObstacle).toBe(false);
    });

    it('leaves unselected elements unchanged when arranging a selection', () => {
      const elements = [
        { id: 'selected-1', type: 'rectangle', x: 10, y: 10, width: 50, height: 50 },
        { id: 'selected-2', type: 'rectangle', x: 200, y: 40, width: 50, height: 50 },
        { id: 'unselected', type: 'rectangle', x: 500, y: 300, width: 50, height: 50 },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW,
        selectedIds: { 'selected-1': true, 'selected-2': true },
      });

      expect(arranged.find((element) => element.id === 'unselected')).toEqual(elements[2]);
    });
  });

  describe('Canvas Time Machine History & Timelapse', () => {
    it('records timestamped snapshots and produces a scrubbing timeline', () => {
      const history = new HistoryManager();

      history.record([{ id: 'a', type: 'rectangle' }]);
      history.record([{ id: 'a', type: 'rectangle' }, { id: 'b', type: 'ellipse' }]);
      history.record([{ id: 'a', type: 'rectangle' }, { id: 'b', type: 'ellipse' }, { id: 'c', type: 'diamond' }]);

      const timeline = history.getTimeline([{ id: 'a', type: 'rectangle' }, { id: 'b', type: 'ellipse' }, { id: 'c', type: 'diamond' }]);
      expect(timeline.steps.length).toBeGreaterThanOrEqual(3);
      expect(timeline.steps[0].count).toBe(1);
      expect(timeline.steps[1].count).toBe(2);
      expect(timeline.steps[2].count).toBe(3);
    });

    it('peeks and restores state to an earlier timeline index accurately', () => {
      const history = new HistoryManager();

      const step1 = [{ id: '1', x: 10 }];
      const step2 = [{ id: '1', x: 10 }, { id: '2', x: 20 }];
      const step3 = [{ id: '1', x: 10 }, { id: '2', x: 20 }, { id: '3', x: 30 }];

      history.record(step1);
      history.record(step2);

      const peeked = history.peekSnapshot(0, step3);
      expect(peeked).toEqual(step1);

      const restored = history.restoreTo(0, step3);
      expect(restored).toEqual(step1);
    });
  });

  describe('Radial Mind Ring & Smart Tidy Layouts', () => {
    it('arranges nodes in radial circle equidistant from center', () => {
      const elements = [
        { id: '1', x: 0, y: 0, width: 60, height: 40 },
        { id: '2', x: 100, y: 100, width: 60, height: 40 },
        { id: '3', x: 200, y: 200, width: 60, height: 40 },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.RADIAL_CIRCLE,
        gap: 30,
      });

      expect(arranged.length).toBe(3);
      // All 3 elements should have distinct coordinates arranged in a circle
      expect(arranged[0].x).not.toBe(arranged[1].x);
      expect(arranged[1].x).not.toBe(arranged[2].x);
    });

    it('equalizes spacing along dominant axis in smart tidy mode', () => {
      const elements = [
        { id: '1', x: 0, y: 50, width: 100, height: 50 },
        { id: '2', x: 120, y: 55, width: 100, height: 50 },
        { id: '3', x: 300, y: 48, width: 100, height: 50 },
      ];

      const arranged = applyAutoLayout(elements, {
        type: AUTO_LAYOUT_TYPES.SMART_TIDY,
        gap: 40,
      });

      // All elements should have their Y snapped to identical center baseline
      expect(arranged[0].y).toBe(arranged[1].y);
      expect(arranged[1].y).toBe(arranged[2].y);
    });
  });
});
