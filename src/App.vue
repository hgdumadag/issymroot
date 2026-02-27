<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  CLASSIFICATION_TYPES,
  type AnswerRecord,
  type AppPhase,
  type ClassificationType,
  type CompletedResult,
  type Difficulty,
  type InProgressSession,
  type QuizItem
} from './types/quiz';
import { LABELS } from './utils/labels';
import { deriveTags, loadQuizItems } from './utils/quizData';
import { applyFilters, clampRequestedCount, pickSessionItems } from './utils/selection';
import { buildCompletedResult, getQuestionMap } from './utils/scoring';
import {
  clearInProgress,
  loadInProgress,
  loadLatestResult,
  saveInProgress,
  saveLatestResult
} from './utils/storage';

const phase = ref<AppPhase>('loading');
const loadError = ref('');
const liveAnnouncement = ref('');

const allItems = ref<QuizItem[]>([]);
const selectedTags = ref<string[]>([]);
const selectedDifficulty = ref<Difficulty | ''>('');
const requestedCount = ref(1);

const sessionQuestions = ref<QuizItem[]>([]);
const answers = ref<AnswerRecord[]>([]);
const currentIndex = ref(0);
const currentSelection = ref<ClassificationType | null>(null);
const currentSubmitted = ref(false);

const activeResult = ref<CompletedResult | null>(null);
const latestResult = ref<CompletedResult | null>(null);
const hasResume = ref(false);

const questionHeadingRef = ref<HTMLElement | null>(null);
const feedbackHeadingRef = ref<HTMLElement | null>(null);
const resultsHeadingRef = ref<HTMLElement | null>(null);

const availableTags = computed(() => deriveTags(allItems.value));

const filteredItems = computed(() =>
  applyFilters(allItems.value, selectedTags.value, selectedDifficulty.value || null)
);

const filteredCount = computed(() => filteredItems.value.length);

watch(filteredCount, (count) => {
  if (count <= 0) {
    requestedCount.value = 0;
    return;
  }

  if (requestedCount.value < 1) {
    requestedCount.value = 1;
  }

  if (requestedCount.value > count) {
    requestedCount.value = count;
  }
});

const currentQuestion = computed(() => sessionQuestions.value[currentIndex.value] ?? null);

const currentAnswer = computed(() => {
  const question = currentQuestion.value;
  if (!question) {
    return null;
  }

  return answers.value.find((answer) => answer.item_id === question.id) ?? null;
});

const currentTrapText = computed(() => {
  const answer = currentAnswer.value;
  const question = currentQuestion.value;

  if (!answer || !question || answer.is_correct) {
    return '';
  }

  return question.common_traps?.[answer.selected_type] ?? '';
});

const scorePercent = computed(() => {
  const result = activeResult.value;
  if (!result || result.totalQuestions === 0) {
    return 0;
  }

  return Math.round((result.correctCount / result.totalQuestions) * 100);
});

const breakdownRows = computed(() => {
  const result = activeResult.value;
  if (!result) {
    return [];
  }

  return CLASSIFICATION_TYPES.map((type) => ({
    key: type,
    label: LABELS[type],
    ...result.breakdown[type]
  }));
});

const missedItems = computed(() => {
  const result = activeResult.value;
  if (!result) {
    return [];
  }

  const questionMap = getQuestionMap(result.questions);

  return result.answers
    .filter((answer) => !answer.is_correct)
    .map((answer) => {
      const question = questionMap.get(answer.item_id);
      if (!question) {
        return null;
      }

      return {
        question,
        answer,
        trapText: question.common_traps?.[answer.selected_type] ?? ''
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
});

function setPhase(next: AppPhase): void {
  phase.value = next;
}

function startFromStoredSession(session: InProgressSession): void {
  sessionQuestions.value = session.questions;
  answers.value = session.answers;
  currentIndex.value = session.currentIndex;
  currentSelection.value = session.currentSelection;
  currentSubmitted.value = session.currentSubmitted;

  selectedTags.value = session.filters.tags.filter((tag) => availableTags.value.includes(tag));
  selectedDifficulty.value = session.filters.difficulty ?? '';
  requestedCount.value = Math.min(session.requestedCount, session.questions.length);

  setPhase('quiz');

  nextTick(() => {
    if (currentSubmitted.value) {
      feedbackHeadingRef.value?.focus();
    } else {
      questionHeadingRef.value?.focus();
    }
  });
}

function persistSession(): void {
  if (sessionQuestions.value.length === 0) {
    return;
  }

  const payload: InProgressSession = {
    version: 1,
    questions: sessionQuestions.value,
    answers: answers.value,
    currentIndex: currentIndex.value,
    currentSelection: currentSelection.value,
    currentSubmitted: currentSubmitted.value,
    requestedCount: requestedCount.value,
    filters: {
      tags: selectedTags.value,
      difficulty: selectedDifficulty.value || null
    }
  };

  saveInProgress(payload);
  hasResume.value = true;
}

function toggleTag(tag: string): void {
  const tags = new Set(selectedTags.value);

  if (tags.has(tag)) {
    tags.delete(tag);
  } else {
    tags.add(tag);
  }

  selectedTags.value = [...tags].sort((a, b) => a.localeCompare(b));
}

function startQuiz(): void {
  const pool = filteredItems.value;

  if (pool.length === 0) {
    return;
  }

  const count = clampRequestedCount(requestedCount.value, pool.length);
  requestedCount.value = count;

  sessionQuestions.value = pickSessionItems(pool, count);
  answers.value = [];
  currentIndex.value = 0;
  currentSelection.value = null;
  currentSubmitted.value = false;
  activeResult.value = null;
  liveAnnouncement.value = '';

  setPhase('quiz');
  persistSession();

  nextTick(() => {
    questionHeadingRef.value?.focus();
  });
}

function resumeQuiz(): void {
  const saved = loadInProgress();

  if (!saved) {
    hasResume.value = false;
    return;
  }

  startFromStoredSession(saved);
}

function submitAnswer(): void {
  const question = currentQuestion.value;

  if (!question || !currentSelection.value || currentSubmitted.value) {
    return;
  }

  const selectedType = currentSelection.value;
  const isCorrect = selectedType === question.correct_type;

  answers.value.push({
    item_id: question.id,
    selected_type: selectedType,
    is_correct: isCorrect
  });

  currentSubmitted.value = true;
  liveAnnouncement.value = isCorrect
    ? 'Correct answer submitted.'
    : `Incorrect. Correct type is ${LABELS[question.correct_type]}.`;

  persistSession();

  nextTick(() => {
    feedbackHeadingRef.value?.focus();
  });
}

function finishQuiz(): void {
  const result = buildCompletedResult(sessionQuestions.value, answers.value);

  activeResult.value = result;
  latestResult.value = result;
  saveLatestResult(result);

  clearInProgress();
  hasResume.value = false;
  setPhase('results');
  nextTick(() => {
    resultsHeadingRef.value?.focus();
  });
}

function moveToNext(): void {
  if (!currentSubmitted.value) {
    return;
  }

  if (currentIndex.value >= sessionQuestions.value.length - 1) {
    finishQuiz();
    return;
  }

  currentIndex.value += 1;
  currentSelection.value = null;
  currentSubmitted.value = false;
  liveAnnouncement.value = '';

  persistSession();

  nextTick(() => {
    questionHeadingRef.value?.focus();
  });
}

function returnToStart(): void {
  sessionQuestions.value = [];
  answers.value = [];
  currentIndex.value = 0;
  currentSelection.value = null;
  currentSubmitted.value = false;
  activeResult.value = null;
  liveAnnouncement.value = '';

  setPhase('start');
}

async function initializeApp(): Promise<void> {
  loadError.value = '';
  setPhase('loading');

  try {
    const items = await loadQuizItems();
    allItems.value = items;

    requestedCount.value = Math.min(10, items.length);
    latestResult.value = loadLatestResult();
    hasResume.value = loadInProgress() !== null;

    setPhase('start');
  } catch (error) {
    setPhase('error');
    loadError.value =
      error instanceof Error ? error.message : 'An unknown error prevented loading quiz data.';
  }
}

onMounted(() => {
  void initializeApp();
});
</script>

<template>
  <main class="app-shell">
    <div class="sr-only" aria-live="polite">{{ liveAnnouncement }}</div>

    <header class="app-header">
      <p class="kicker">Internal Training</p>
      <h1>Symptom / Issue / Root Cause Trainer</h1>
      <p>
        Use the three-test rubric consistently: symptom = observable signal, issue = deviation from
        criteria/control, root cause = underlying reason enabling the issue.
      </p>
    </header>

    <section v-if="phase === 'loading'" class="panel" data-testid="loading-screen">
      <h2>Loading question bank...</h2>
      <p>Validating quiz data and preparing your session.</p>
    </section>

    <section v-else-if="phase === 'error'" class="panel error" data-testid="error-screen">
      <h2>Unable to load quiz data</h2>
      <p>{{ loadError }}</p>
      <button type="button" class="primary" @click="initializeApp">Try Again</button>
    </section>

    <section v-else-if="phase === 'start'" class="panel" data-testid="start-screen">
      <h2>Start Quiz</h2>

      <div v-if="latestResult" class="latest-result" data-testid="latest-result">
        <h3>Latest Result</h3>
        <p>
          {{ latestResult.correctCount }} / {{ latestResult.totalQuestions }} correct
          ({{ Math.round((latestResult.correctCount / latestResult.totalQuestions) * 100) }}%)
        </p>
        <p>Completed: {{ new Date(latestResult.completedAt).toLocaleString() }}</p>
      </div>

      <div class="control-grid">
        <label class="field" for="question-count">
          <span>Question count</span>
          <input
            id="question-count"
            data-testid="question-count-input"
            v-model.number="requestedCount"
            type="number"
            min="1"
            :max="Math.max(filteredCount, 1)"
          />
        </label>

        <label class="field" for="difficulty-filter">
          <span>Difficulty</span>
          <select id="difficulty-filter" v-model="selectedDifficulty" data-testid="difficulty-filter">
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <fieldset class="tag-fieldset" v-if="availableTags.length > 0">
        <legend>Tags (match all selected)</legend>
        <div class="tag-list">
          <label v-for="tag in availableTags" :key="tag" class="tag-option">
            <input
              type="checkbox"
              :checked="selectedTags.includes(tag)"
              @change="toggleTag(tag)"
              :data-testid="`tag-filter-${tag}`"
            />
            <span>{{ tag }}</span>
          </label>
        </div>
      </fieldset>

      <p class="meta" data-testid="filtered-count">
        {{ filteredCount }} items available with current filters.
      </p>

      <div class="actions">
        <button
          type="button"
          class="primary"
          data-testid="start-quiz"
          :disabled="filteredCount === 0"
          @click="startQuiz"
        >
          Start Quiz
        </button>
        <button
          v-if="hasResume"
          type="button"
          class="secondary"
          data-testid="resume-quiz"
          @click="resumeQuiz"
        >
          Resume Previous Session
        </button>
      </div>
    </section>

    <section v-else-if="phase === 'quiz'" class="panel" data-testid="quiz-screen">
      <p class="progress">Question {{ currentIndex + 1 }} of {{ sessionQuestions.length }}</p>

      <h2 ref="questionHeadingRef" tabindex="-1" data-testid="question-statement">
        {{ currentQuestion?.statement }}
      </h2>

      <div class="answer-grid" role="group" aria-label="Choose classification type">
        <button
          v-for="type in CLASSIFICATION_TYPES"
          :key="type"
          type="button"
          class="answer-option"
          :class="{ selected: currentSelection === type }"
          :data-testid="`answer-choice-${type}`"
          :aria-pressed="currentSelection === type"
          :disabled="currentSubmitted"
          @click="currentSelection = type"
        >
          {{ LABELS[type] }}
        </button>
      </div>

      <div class="actions">
        <button
          type="button"
          class="primary"
          data-testid="submit-answer"
          :disabled="!currentSelection || currentSubmitted"
          @click="submitAnswer"
        >
          Submit
        </button>
      </div>

      <section
        v-if="currentSubmitted && currentQuestion && currentAnswer"
        class="feedback"
        ref="feedbackHeadingRef"
        tabindex="-1"
        data-testid="feedback-panel"
      >
        <h3 :class="currentAnswer.is_correct ? 'correct-text' : 'incorrect-text'">
          {{ currentAnswer.is_correct ? 'Correct' : 'Incorrect' }}
        </h3>
        <p>
          <strong>Correct label:</strong>
          {{ LABELS[currentQuestion.correct_type] }}
        </p>
        <p>{{ currentQuestion.rationale_correct }}</p>
        <p v-if="!currentAnswer.is_correct && currentTrapText">
          <strong>Why your choice is tempting:</strong> {{ currentTrapText }}
        </p>

        <button
          type="button"
          class="secondary"
          data-testid="next-question"
          @click="moveToNext"
        >
          {{ currentIndex < sessionQuestions.length - 1 ? 'Next Question' : 'Finish Quiz' }}
        </button>
      </section>
    </section>

    <section v-else-if="phase === 'results'" class="panel" data-testid="results-screen">
      <h2 ref="resultsHeadingRef" tabindex="-1" data-testid="results-heading">Results</h2>
      <p class="score" data-testid="score-summary">
        {{ activeResult?.correctCount }} / {{ activeResult?.totalQuestions }} correct ({{ scorePercent }}%)
      </p>

      <h3>Accuracy by Correct Classification</h3>
      <table class="breakdown-table" data-testid="breakdown-table">
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Correct</th>
            <th scope="col">Total</th>
            <th scope="col">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in breakdownRows" :key="row.key">
            <th scope="row">{{ row.label }}</th>
            <td>{{ row.correct }}</td>
            <td>{{ row.total }}</td>
            <td>{{ row.accuracy }}%</td>
          </tr>
        </tbody>
      </table>

      <h3>Review Missed Items</h3>
      <p v-if="missedItems.length === 0">No missed items. Strong classification run.</p>
      <ul v-else class="missed-list" data-testid="missed-list">
        <li v-for="entry in missedItems" :key="entry.question.id">
          <h4>{{ entry.question.statement }}</h4>
          <p><strong>Your choice:</strong> {{ LABELS[entry.answer.selected_type] }}</p>
          <p><strong>Correct:</strong> {{ LABELS[entry.question.correct_type] }}</p>
          <p>{{ entry.question.rationale_correct }}</p>
          <p v-if="entry.trapText"><strong>Trap note:</strong> {{ entry.trapText }}</p>
        </li>
      </ul>

      <button type="button" class="primary" data-testid="restart-quiz" @click="returnToStart">
        Start New Session
      </button>
    </section>
  </main>
</template>
