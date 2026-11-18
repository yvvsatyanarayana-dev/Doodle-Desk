import { describe, expect, it, vi, beforeEach } from 'vitest';
import { proceduralAudio } from '../src/utils/proceduralAudio.js';
import { ambientAudio } from '../src/utils/ambientAudioEngine.js';

describe('proceduralAudio ASMR synthesizer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows toggling audio state and persists in localStorage', () => {
    proceduralAudio.setEnabled(false);
    expect(proceduralAudio.isEnabled()).toBe(false);
    expect(localStorage.getItem('doodle_asmr_audio')).toBe('false');

    proceduralAudio.setEnabled(true);
    expect(proceduralAudio.isEnabled()).toBe(true);
    expect(localStorage.getItem('doodle_asmr_audio')).toBe('true');
  });

  it('allows setting volume and clamps between 0 and 1', () => {
    proceduralAudio.setVolume(0.8);
    expect(proceduralAudio.getVolume()).toBe(0.8);

    proceduralAudio.setVolume(1.5);
    expect(proceduralAudio.getVolume()).toBe(1.0);

    proceduralAudio.setVolume(-0.2);
    expect(proceduralAudio.getVolume()).toBe(0.0);
  });

  it('runs startDrawingSound, updateDrawingSpeed, stopDrawingSound, and playSnapClick without throwing in node environment', () => {
    expect(() => {
      proceduralAudio.startDrawingSound('pencil');
      proceduralAudio.updateDrawingSpeed(100, 200);
      proceduralAudio.stopDrawingSound();
      proceduralAudio.playSnapClick();
    }).not.toThrow();
  });

  it('ambientAudio supports subscription events without polling', () => {
    const events = [];
    const unsubscribe = ambientAudio.subscribe((state) => {
      events.push(state);
    });

    expect(typeof unsubscribe).toBe('function');
    ambientAudio.stop();
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].isPlaying).toBe(false);

    unsubscribe();
    const countBefore = events.length;
    ambientAudio.stop();
    expect(events.length).toBe(countBefore);
  });
});
