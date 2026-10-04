import { describe, expect, it } from 'vitest';
import { daysInStage, nextStage, WorkflowError } from '../src/stages.js';

describe('nextStage', () => {
  it('moves through the workflow in order', () => {
    expect(nextStage('SITE_SURVEY')).toBe('DESIGN');
    expect(nextStage('DESIGN')).toBe('PERMITTING');
    expect(nextStage('INSPECTION')).toBe('COMPLETE');
  });

  it('refuses to advance a completed job', () => {
    expect(() => nextStage('COMPLETE')).toThrow(WorkflowError);
  });
});

describe('daysInStage', () => {
  it('counts whole days and never goes negative', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    expect(daysInStage(new Date('2026-10-07T13:00:00Z'), now)).toBe(2);
    expect(daysInStage(new Date('2026-10-11T00:00:00Z'), now)).toBe(0);
  });
});
