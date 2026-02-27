import type { Difficulty, QuizItem } from '../types/quiz';
import { shuffleItems } from './shuffle';

export function applyFilters(items: QuizItem[], tags: string[], difficulty: Difficulty | null): QuizItem[] {
  return items.filter((item) => {
    const matchesDifficulty = !difficulty || item.difficulty === difficulty;
    const matchesTags =
      tags.length === 0 || tags.every((tag) => (item.tags ?? []).includes(tag));

    return matchesDifficulty && matchesTags;
  });
}

export function clampRequestedCount(requestedCount: number, maxCount: number): number {
  if (maxCount <= 0) {
    return 0;
  }

  const rounded = Math.floor(requestedCount);

  if (!Number.isFinite(rounded) || rounded < 1) {
    return 1;
  }

  return Math.min(rounded, maxCount);
}

export function pickSessionItems(items: QuizItem[], requestedCount: number): QuizItem[] {
  const count = clampRequestedCount(requestedCount, items.length);
  if (count === 0) {
    return [];
  }

  return shuffleItems(items).slice(0, count);
}
