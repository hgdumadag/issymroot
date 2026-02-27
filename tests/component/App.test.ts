import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from '../../src/App.vue';

const testItems = [
  {
    id: 't1',
    statement: 'Dashboard error rate is above baseline',
    correct_type: 'symptom',
    rationale_correct: 'Observed metric shift.',
    common_traps: {
      issue: 'This line does not reference a required control threshold.',
      root_cause: 'No underlying mechanism is provided.'
    },
    tags: ['Ops'],
    difficulty: 'easy'
  },
  {
    id: 't2',
    statement: 'Control reconciliation misses the documented SLA',
    correct_type: 'issue',
    rationale_correct: 'Control requirement is violated.',
    common_traps: {
      symptom: 'Could be observed as a signal, but explicit requirement miss makes it issue-level.',
      root_cause: 'No causal mechanism is identified.'
    },
    tags: ['Ops'],
    difficulty: 'medium'
  }
];

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('loads, runs quiz flow, and shows results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => testItems
      })
    );

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.get('[data-testid="start-screen"]').exists()).toBe(true);

    await wrapper.get('[data-testid="question-count-input"]').setValue('1');
    await wrapper.get('[data-testid="start-quiz"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="quiz-screen"]').exists()).toBe(true);

    await wrapper.get('[data-testid="answer-choice-symptom"]').trigger('click');
    await wrapper.get('[data-testid="submit-answer"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="feedback-panel"]').text()).toContain('Correct label');

    await wrapper.get('[data-testid="next-question"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="results-screen"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="score-summary"]').text()).toContain('/ 1 correct');
  });

  it('shows trap feedback for incorrect choice when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [testItems[0]]
      })
    );

    const wrapper = mount(App);
    await flushPromises();

    await wrapper.get('[data-testid="start-quiz"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="answer-choice-issue"]').trigger('click');
    await wrapper.get('[data-testid="submit-answer"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="feedback-panel"]').text()).toContain('Why your choice is tempting');
  });
});
