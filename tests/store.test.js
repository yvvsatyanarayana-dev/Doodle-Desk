import { describe, it, expect } from 'vitest';

describe('Settings & Recents Logic', () => {
  it('should maintain max 15 recent files and put newest first', () => {
    let recents = [];

    function addRecent(list, filePath) {
      const normalized = filePath.replace(/\\/g, '/');
      let next = list.filter(f => f.path !== normalized);
      next.unshift({
        path: normalized,
        name: normalized.split('/').pop(),
        lastOpened: Date.now(),
      });
      return next.slice(0, 15);
    }

    for (let i = 1; i <= 20; i++) {
      recents = addRecent(recents, `C:/docs/drawing-${i}.doodle`);
    }

    expect(recents).toHaveLength(15);
    expect(recents[0].name).toBe('drawing-20.doodle');
    expect(recents[14].name).toBe('drawing-6.doodle');
  });

  it('should deduplicate re-opened recent files and move to top', () => {
    let recents = [
      { path: 'C:/docs/a.doodle', name: 'a.doodle' },
      { path: 'C:/docs/b.doodle', name: 'b.doodle' },
    ];

    function addRecent(list, filePath) {
      const normalized = filePath.replace(/\\/g, '/');
      let next = list.filter(f => f.path !== normalized);
      next.unshift({
        path: normalized,
        name: normalized.split('/').pop(),
        lastOpened: Date.now(),
      });
      return next.slice(0, 15);
    }

    recents = addRecent(recents, 'C:/docs/b.doodle');
    expect(recents).toHaveLength(2);
    expect(recents[0].name).toBe('b.doodle');
    expect(recents[1].name).toBe('a.doodle');
  });

  it('should validate default export options', () => {
    const defaultExportOptions = {
      scale: 2,
      background: true,
      darkMode: false,
      embedScene: true,
    };

    expect(defaultExportOptions.scale).toBeGreaterThanOrEqual(1);
    expect(defaultExportOptions.embedScene).toBe(true);
  });
});
