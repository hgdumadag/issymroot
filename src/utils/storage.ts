import {
  CLASSIFICATION_TYPES,
  DIFFICULTIES,
  type ClassificationType,
  type CompletedResult,
  type Difficulty,
  type InProgressSession
} from '../types/quiz';
import { parseQuizItems } from './quizData';

export const IN_PROGRESS_STORAGE_KEY = 'isr_quiz_in_progress_v1';
export const LATEST_RESULT_STORAGE_KEY = 'isr_quiz_latest_result_v1';

function isClassificationType(value: unknown): value is ClassificationType {
  return typeof value === 'string' && CLASSIFICATION_TYPES.includes(value as ClassificationType);
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTIES.includes(value as Difficulty);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseInProgress(payload: unknown): InProgressSession | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (payload.version !== 1) {
    return null;
  }

  try {
    const questions = parseQuizItems(payload.questions);
    const answersRaw = payload.answers;

    if (!Array.isArray(answersRaw)) {
      return null;
    }

    const answers = answersRaw
      .filter((entry): entry is Record<string, unknown> => isRecord(entry))
      .map((entry) => {
        if (
          typeof entry.item_id !== 'string' ||
          !isClassificationType(entry.selected_type) ||
          typeof entry.is_correct !== 'boolean'
        ) {
          throw new Error('Invalid answer shape.');
        }

        return {
          item_id: entry.item_id,
          selected_type: entry.selected_type,
          is_correct: entry.is_correct
        };
      });

    const filtersRaw = payload.filters;
    if (!isRecord(filtersRaw) || !Array.isArray(filtersRaw.tags)) {
      return null;
    }

    const tags = filtersRaw.tags.filter((tag): tag is string => typeof tag === 'string');
    const difficulty = filtersRaw.difficulty;
    const normalizedDifficulty = difficulty === null || difficulty === undefined ? null : difficulty;

    if (normalizedDifficulty !== null && !isDifficulty(normalizedDifficulty)) {
      return null;
    }

    if (
      typeof payload.currentIndex !== 'number' ||
      typeof payload.currentSubmitted !== 'boolean' ||
      typeof payload.requestedCount !== 'number'
    ) {
      return null;
    }

    const currentSelection = payload.currentSelection;
    if (currentSelection !== null && currentSelection !== undefined && !isClassificationType(currentSelection)) {
      return null;
    }

    return {
      version: 1,
      questions,
      answers,
      currentIndex: Math.max(0, Math.min(Math.floor(payload.currentIndex), Math.max(questions.length - 1, 0))),
      currentSelection: currentSelection ?? null,
      currentSubmitted: payload.currentSubmitted,
      requestedCount: Math.max(1, Math.floor(payload.requestedCount)),
      filters: {
        tags,
        difficulty: normalizedDifficulty
      }
    };
  } catch {
    return null;
  }
}

export function saveInProgress(session: InProgressSession): void {
  localStorage.setItem(IN_PROGRESS_STORAGE_KEY, JSON.stringify(session));
}

export function loadInProgress(): InProgressSession | null {
  const raw = localStorage.getItem(IN_PROGRESS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parseInProgress(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearInProgress(): void {
  localStorage.removeItem(IN_PROGRESS_STORAGE_KEY);
}

function parseCompletedResult(payload: unknown): CompletedResult | null {
  if (!isRecord(payload)) {
    return null;
  }

  try {
    const questions = parseQuizItems(payload.questions);

    if (!Array.isArray(payload.answers)) {
      return null;
    }

    if (typeof payload.completedAt !== 'string' || Number.isNaN(Date.parse(payload.completedAt))) {
      return null;
    }

    const answers = payload.answers
      .filter((entry): entry is Record<string, unknown> => isRecord(entry))
      .map((entry) => {
        if (
          typeof entry.item_id !== 'string' ||
          !isClassificationType(entry.selected_type) ||
          typeof entry.is_correct !== 'boolean'
        ) {
          throw new Error('Invalid answer shape.');
        }

        return {
          item_id: entry.item_id,
          selected_type: entry.selected_type,
          is_correct: entry.is_correct
        };
      });

    if (typeof payload.totalQuestions !== 'number' || typeof payload.correctCount !== 'number' || !isRecord(payload.breakdown)) {
      return null;
    }

    return {
      completedAt: payload.completedAt,
      questions,
      answers,
      totalQuestions: payload.totalQuestions,
      correctCount: payload.correctCount,
      breakdown: payload.breakdown as CompletedResult['breakdown']
    };
  } catch {
    return null;
  }
}

export function saveLatestResult(result: CompletedResult): void {
  localStorage.setItem(LATEST_RESULT_STORAGE_KEY, JSON.stringify(result));
}

export function loadLatestResult(): CompletedResult | null {
  const raw = localStorage.getItem(LATEST_RESULT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parseCompletedResult(JSON.parse(raw));
  } catch {
    return null;
  }
}
