import { beforeEach, describe, expect, it } from 'vitest';
import type { CompletedResult, InProgressSession } from '../../src/types/quiz';
import {
  clearInProgress,
  IN_PROGRESS_STORAGE_KEY,
  LATEST_RESULT_STORAGE_KEY,
  loadInProgress,
  loadLatestResult,
  saveInProgress,
  saveLatestResult
} from '../../src/utils/storage';

const sessionFixture: InProgressSession = {
  version: 1,
  questions: [
    {
      id: 'q1',
      statement: 'Alert count rises',
      correct_type: 'symptom',
      rationale_correct: 'Observable signal.',
      difficulty: 'easy',
      tags: ['Ops']
    }
  ],
  answers: [],
  currentIndex: 0,
  currentSelection: null,
  currentSubmitted: false,
  requestedCount: 1,
  filters: {
    tags: ['Ops'],
    difficulty: 'easy'
  }
};

const resultFixture: CompletedResult = {
  completedAt: new Date().toISOString(),
  questions: sessionFixture.questions,
  answers: [{ item_id: 'q1', selected_type: 'symptom', is_correct: true }],
  totalQuestions: 1,
  correctCount: 1,
  breakdown: {
    symptom: { total: 1, correct: 1, accuracy: 100 },
    issue: { total: 0, correct: 0, accuracy: 0 },
    root_cause: { total: 0, correct: 0, accuracy: 0 }
  }
};

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips valid in-progress sessions', () => {
    saveInProgress(sessionFixture);
    const loaded = loadInProgress();

    expect(loaded).not.toBeNull();
    expect(loaded?.questions[0].id).toBe('q1');
    expect(loaded?.filters.tags).toEqual(['Ops']);

    clearInProgress();
    expect(localStorage.getItem(IN_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('drops malformed in-progress payloads', () => {
    localStorage.setItem(IN_PROGRESS_STORAGE_KEY, JSON.stringify({ version: 1, bad: true }));
    expect(loadInProgress()).toBeNull();
  });

  it('round-trips latest result snapshots', () => {
    saveLatestResult(resultFixture);
    const loaded = loadLatestResult();

    expect(loaded).not.toBeNull();
    expect(loaded?.correctCount).toBe(1);
    expect(loaded?.answers[0].is_correct).toBe(true);

    localStorage.setItem(LATEST_RESULT_STORAGE_KEY, 'not-json');
    expect(loadLatestResult()).toBeNull();
  });
});
