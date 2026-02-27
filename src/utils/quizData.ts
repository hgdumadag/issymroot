import {
  CLASSIFICATION_TYPES,
  DIFFICULTIES,
  type ClassificationType,
  type Difficulty,
  type QuizItem
} from '../types/quiz';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isClassificationType(value: unknown): value is ClassificationType {
  return typeof value === 'string' && CLASSIFICATION_TYPES.includes(value as ClassificationType);
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTIES.includes(value as Difficulty);
}

function parseCommonTraps(value: unknown, itemLabel: string): Partial<Record<ClassificationType, string>> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error(`${itemLabel}: common_traps must be an object if provided.`);
  }

  const result: Partial<Record<ClassificationType, string>> = {};

  for (const [key, trap] of Object.entries(value)) {
    if (!isClassificationType(key)) {
      throw new Error(`${itemLabel}: common_traps contains invalid key "${key}".`);
    }

    if (typeof trap !== 'string' || trap.trim() === '') {
      throw new Error(`${itemLabel}: common_traps.${key} must be a non-empty string.`);
    }

    result[key] = trap.trim();
  }

  return result;
}

function parseTags(value: unknown, itemLabel: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`${itemLabel}: tags must be an array of non-empty strings if provided.`);
  }

  return Array.from(new Set(value.map((entry) => entry.trim())));
}

export function parseQuizItems(payload: unknown): QuizItem[] {
  if (!Array.isArray(payload)) {
    throw new Error('Quiz data must be an array of quiz items.');
  }

  const ids = new Set<string>();

  return payload.map((raw, index) => {
    if (!isRecord(raw)) {
      throw new Error(`Item ${index + 1}: item must be an object.`);
    }

    const itemLabel = `Item ${index + 1}`;

    const id = raw.id;
    const statement = raw.statement;
    const correctType = raw.correct_type;
    const rationale = raw.rationale_correct;

    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`${itemLabel}: id is required and must be a non-empty string.`);
    }

    const normalizedId = id.trim();

    if (ids.has(normalizedId)) {
      throw new Error(`${itemLabel}: duplicate id "${normalizedId}" found.`);
    }
    ids.add(normalizedId);

    if (typeof statement !== 'string' || statement.trim() === '') {
      throw new Error(`${itemLabel}: statement is required and must be a non-empty string.`);
    }

    if (!isClassificationType(correctType)) {
      throw new Error(`${itemLabel}: correct_type must be one of ${CLASSIFICATION_TYPES.join(', ')}.`);
    }

    if (typeof rationale !== 'string' || rationale.trim() === '') {
      throw new Error(`${itemLabel}: rationale_correct is required and must be a non-empty string.`);
    }

    const difficultyRaw = raw.difficulty;
    if (difficultyRaw !== undefined && !isDifficulty(difficultyRaw)) {
      throw new Error(`${itemLabel}: difficulty must be one of ${DIFFICULTIES.join(', ')} if provided.`);
    }

    return {
      id: normalizedId,
      statement: statement.trim(),
      correct_type: correctType,
      rationale_correct: rationale.trim(),
      common_traps: parseCommonTraps(raw.common_traps, itemLabel),
      tags: parseTags(raw.tags, itemLabel),
      difficulty: difficultyRaw
    } satisfies QuizItem;
  });
}

export async function loadQuizItems(url = '/data/quiz-items.json'): Promise<QuizItem[]> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load quiz data (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  const items = parseQuizItems(payload);

  if (items.length === 0) {
    throw new Error('Quiz data file is valid but empty.');
  }

  return items;
}

export function deriveTags(items: QuizItem[]): string[] {
  const tags = new Set<string>();

  for (const item of items) {
    for (const tag of item.tags ?? []) {
      tags.add(tag);
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}
