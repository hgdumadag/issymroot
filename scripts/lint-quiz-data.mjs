import fs from 'node:fs';
import path from 'node:path';

const CLASSIFICATION_TYPES = new Set(['symptom', 'issue', 'root_cause']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const targetPath = process.argv[2] ?? path.join(process.cwd(), 'public', 'data', 'quiz-items.json');

function fail(message) {
  console.error(`lint:data error: ${message}`);
  process.exitCode = 1;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function validateArray(json) {
  if (!Array.isArray(json)) {
    fail('Quiz data must be a JSON array.');
    return;
  }

  const seenIds = new Set();

  for (let index = 0; index < json.length; index += 1) {
    const item = json[index];
    const label = `item ${index + 1}`;

    if (!isRecord(item)) {
      fail(`${label} is not an object.`);
      continue;
    }

    if (typeof item.id !== 'string' || item.id.trim() === '') {
      fail(`${label} is missing a non-empty string id.`);
    } else if (seenIds.has(item.id.trim())) {
      fail(`${label} has duplicate id "${item.id}".`);
    } else {
      seenIds.add(item.id.trim());
    }

    if (typeof item.statement !== 'string' || item.statement.trim() === '') {
      fail(`${label} is missing a non-empty statement.`);
    }

    if (!CLASSIFICATION_TYPES.has(item.correct_type)) {
      fail(`${label} has invalid correct_type "${item.correct_type}".`);
    }

    if (typeof item.rationale_correct !== 'string' || item.rationale_correct.trim() === '') {
      fail(`${label} is missing rationale_correct.`);
    }

    if (item.difficulty !== undefined && !DIFFICULTIES.has(item.difficulty)) {
      fail(`${label} has invalid difficulty "${item.difficulty}".`);
    }

    if (item.tags !== undefined) {
      if (!Array.isArray(item.tags)) {
        fail(`${label} tags must be an array.`);
      } else if (item.tags.some((tag) => typeof tag !== 'string' || tag.trim() === '')) {
        fail(`${label} tags must contain only non-empty strings.`);
      }
    }

    if (item.common_traps !== undefined) {
      if (!isRecord(item.common_traps)) {
        fail(`${label} common_traps must be an object.`);
      } else {
        for (const [key, value] of Object.entries(item.common_traps)) {
          if (!CLASSIFICATION_TYPES.has(key)) {
            fail(`${label} common_traps contains invalid key "${key}".`);
          }

          if (typeof value !== 'string' || value.trim() === '') {
            fail(`${label} common_traps.${key} must be a non-empty string.`);
          }
        }
      }
    }
  }
}

try {
  const raw = fs.readFileSync(targetPath, 'utf8').replace(/^\uFEFF/, '');
  const json = JSON.parse(raw);
  validateArray(json);

  if (process.exitCode === 1) {
    process.exit(1);
  }

  console.log(`lint:data ok: validated ${json.length} items at ${targetPath}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
