import { describe, expect, it } from 'vitest';
import type { AnswerRecord, QuizItem } from '../../src/types/quiz';
import { buildBreakdown, buildCompletedResult } from '../../src/utils/scoring';

const questions: QuizItem[] = [
  {
    id: 'q1',
    statement: 'Observed error count spikes',
    correct_type: 'symptom',
    rationale_correct: 'Observable signal.'
  },
  {
    id: 'q2',
    statement: 'Control threshold is missed',
    correct_type: 'issue',
    rationale_correct: 'Deviation from requirement.'
  },
  {
    id: 'q3',
    statement: 'Single-point architecture causes outages',
    correct_type: 'root_cause',
    rationale_correct: 'Underlying enabling reason.'
  }
];

const answers: AnswerRecord[] = [
  { item_id: 'q1', selected_type: 'symptom', is_correct: true },
  { item_id: 'q2', selected_type: 'symptom', is_correct: false },
  { item_id: 'q3', selected_type: 'root_cause', is_correct: true }
];

describe('scoring', () => {
  it('computes per-type breakdown by correct classification', () => {
    const breakdown = buildBreakdown(questions, answers);

    expect(breakdown.symptom.total).toBe(1);
    expect(breakdown.symptom.correct).toBe(1);
    expect(breakdown.issue.total).toBe(1);
    expect(breakdown.issue.correct).toBe(0);
    expect(breakdown.root_cause.total).toBe(1);
    expect(breakdown.root_cause.correct).toBe(1);
    expect(breakdown.issue.accuracy).toBe(0);
  });

  it('builds completed result totals', () => {
    const result = buildCompletedResult(questions, answers);

    expect(result.totalQuestions).toBe(3);
    expect(result.correctCount).toBe(2);
    expect(result.answers).toHaveLength(3);
  });
});
