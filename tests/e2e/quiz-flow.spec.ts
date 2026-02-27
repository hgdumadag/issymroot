import { expect, test } from '@playwright/test';

test('completes a short quiz and shows results', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('question-count-input').fill('2');
  await page.getByTestId('start-quiz').click();

  for (let index = 0; index < 2; index += 1) {
    await page.getByTestId('answer-choice-symptom').click();
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('feedback-panel')).toBeVisible();
    await page.getByTestId('next-question').click();
  }

  await expect(page.getByTestId('results-heading')).toBeVisible();
  await expect(page.getByTestId('breakdown-table')).toBeVisible();
});

test('restores in-progress session after refresh', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('question-count-input').fill('2');
  await page.getByTestId('start-quiz').click();

  await page.getByTestId('answer-choice-symptom').click();
  await page.getByTestId('submit-answer').click();
  await expect(page.getByTestId('feedback-panel')).toBeVisible();

  await page.reload();

  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('resume-quiz').click();
  await expect(page.getByTestId('quiz-screen')).toBeVisible();
  await expect(page.getByTestId('feedback-panel')).toBeVisible();
});
