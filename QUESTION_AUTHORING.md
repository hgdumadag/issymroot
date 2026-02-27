# Adding Questions

Use the quiz data file at `public/data/quiz-items.json`.  
It must be a JSON array of question objects.

## Required format

Each question **must** include:

- `id` (string, unique)
- `statement` (string)
- `correct_type` (`"symptom"` | `"issue"` | `"root_cause"`)
- `rationale_correct` (string)

Optional fields:

- `common_traps` (object keyed by classification type)
- `tags` (array of strings)
- `difficulty` (`"easy"` | `"medium"` | `"hard"`)

## Type shape

```ts
type ClassificationType = "symptom" | "issue" | "root_cause";
type Difficulty = "easy" | "medium" | "hard";

interface QuizItem {
  id: string;
  statement: string;
  correct_type: ClassificationType;
  rationale_correct: string;
  common_traps?: Partial<Record<ClassificationType, string>>;
  tags?: string[];
  difficulty?: Difficulty;
}
```

## Example item

```json
{
  "id": "ops-004",
  "statement": "Daily backup job failure alerts increased from 1% to 12% this week.",
  "correct_type": "symptom",
  "rationale_correct": "This is an observed monitoring signal, not yet a criteria breach statement or causal explanation.",
  "common_traps": {
    "issue": "It may indicate an issue, but the control requirement is not explicitly stated here.",
    "root_cause": "No underlying mechanism is described."
  },
  "tags": ["Ops", "IT"],
  "difficulty": "easy"
}
```

## Adding a new question

1. Open `public/data/quiz-items.json`.
2. Add a new object to the array (comma-separated, valid JSON).
3. Make sure `id` is unique.
4. Use only valid enum values:
   - `correct_type`: `symptom`, `issue`, `root_cause`
   - `difficulty`: `easy`, `medium`, `hard` (if provided)
5. If `common_traps` is used, only use keys: `symptom`, `issue`, `root_cause`.
6. Save and validate:

```bash
npm run lint:data
```

## Writing guidance (quality)

Use the three-test rubric consistently:

- Symptom: observable signal
- Issue: deviation from a defined control/criteria
- Root cause: underlying reason enabling the issue

Keep statements unambiguous unless intentionally tricky, and make `rationale_correct` explicit about why the label is correct.
