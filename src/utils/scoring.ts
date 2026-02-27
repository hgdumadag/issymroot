import {
  CLASSIFICATION_TYPES,
  type AnswerRecord,
  type ClassificationType,
  type CompletedResult,
  type QuizBreakdown,
  type QuizItem
} from '../types/quiz';

export function buildBreakdown(questions: QuizItem[], answers: AnswerRecord[]): QuizBreakdown {
  const breakdown = Object.fromEntries(
    CLASSIFICATION_TYPES.map((classification) => [
      classification,
      {
        total: 0,
        correct: 0,
        accuracy: 0
      }
    ])
  ) as QuizBreakdown;

  const questionById = new Map(questions.map((question) => [question.id, question]));

  for (const answer of answers) {
    const question = questionById.get(answer.item_id);
    if (!question) {
      continue;
    }

    const key = question.correct_type as ClassificationType;
    breakdown[key].total += 1;
    if (answer.is_correct) {
      breakdown[key].correct += 1;
    }
  }

  for (const key of CLASSIFICATION_TYPES) {
    const entry = breakdown[key];
    entry.accuracy = entry.total === 0 ? 0 : Math.round((entry.correct / entry.total) * 100);
  }

  return breakdown;
}

export function buildCompletedResult(questions: QuizItem[], answers: AnswerRecord[]): CompletedResult {
  const correctCount = answers.filter((answer) => answer.is_correct).length;

  return {
    completedAt: new Date().toISOString(),
    questions,
    answers,
    totalQuestions: questions.length,
    correctCount,
    breakdown: buildBreakdown(questions, answers)
  };
}

export function getQuestionMap(questions: QuizItem[]): Map<string, QuizItem> {
  return new Map(questions.map((question) => [question.id, question]));
}
