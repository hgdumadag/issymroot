# Symptom / Issue / Root Cause Trainer (V1)

Static SPA training app for classifying statements as `symptom`, `issue`, or `root_cause` using a consistent three-test rubric.

## Stack

- Vue 3 + Vite + TypeScript (strict)
- Local JSON question bank (`public/data/quiz-items.json`)
- Vitest + Vue Test Utils for unit/component tests
- Playwright for E2E tests
- Azure Static Web Apps deployment via GitHub Actions

## Three-Test Rubric

- Symptom: observable signal
- Issue: deviation from criteria/control requirement
- Root cause: underlying reason enabling the issue

## Data Schema

```ts
type ClassificationType = 'symptom' | 'issue' | 'root_cause';
type Difficulty = 'easy' | 'medium' | 'hard';

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

## Authoring Rules

- `id`, `statement`, `correct_type`, and `rationale_correct` are required.
- `common_traps` must only use `symptom | issue | root_cause` as keys.
- Keep statements classifiable by the rubric.
- Avoid ambiguous items unless intentional and explicitly explained.
- Ensure rationale explains why the correct type is correct and why tempting wrong choices fail.

## Commands

```bash
npm install
npm run dev
npm run lint:data
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Storage Keys

- `isr_quiz_in_progress_v1`: resumable in-progress session
- `isr_quiz_latest_result_v1`: latest completed result snapshot

## Deployment (Azure Static Web Apps)

1. Push to `main`.
2. In repository secrets, set `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. GitHub Actions workflow runs quality checks and deploys the built static app.
