import { describe, expect, it } from 'vitest';
import type { QuizItem } from '../../src/types/quiz';
import { applyFilters, clampRequestedCount, pickSessionItems } from '../../src/utils/selection';

const items: QuizItem[] = [
  {
    id: '1',
    statement: 'Signal observed',
    correct_type: 'symptom',
    rationale_correct: 'Observed signal.',
    tags: ['Ops'],
    difficulty: 'easy'
  },
  {
    id: '2',
    statement: 'Control breach',
    correct_type: 'issue',
    rationale_correct: 'Control criteria deviation.',
    tags: ['Ops', 'Finance'],
    difficulty: 'medium'
  },
  {
    id: '3',
    statement: 'Underlying reason',
    correct_type: 'root_cause',
    rationale_correct: 'Underlying enabling reason.',
    tags: ['IT'],
    difficulty: 'hard'
  }
];

describe('selection utilities', () => {
  it('applies tag and difficulty filters with AND semantics for tags', () => {
    const filtered = applyFilters(items, ['Ops', 'Finance'], 'medium');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('clamps requested count to safe range', () => {
    expect(clampRequestedCount(0, 4)).toBe(1);
    expect(clampRequestedCount(20, 4)).toBe(4);
    expect(clampRequestedCount(2.8, 4)).toBe(2);
    expect(clampRequestedCount(3, 0)).toBe(0);
  });

  it('picks the requested amount from shuffled pool', () => {
    const selected = pickSessionItems(items, 2);
    expect(selected).toHaveLength(2);
    expect(selected.every((item) => items.some((source) => source.id === item.id))).toBe(true);
  });
});
