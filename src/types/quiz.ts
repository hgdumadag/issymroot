export const CLASSIFICATION_TYPES = ['symptom', 'issue', 'root_cause'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type ClassificationType = (typeof CLASSIFICATION_TYPES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface QuizItem {
  id: string;
  statement: string;
  correct_type: ClassificationType;
  rationale_correct: string;
  common_traps?: Partial<Record<ClassificationType, string>>;
  tags?: string[];
  difficulty?: Difficulty;
}

export interface AnswerRecord {
  item_id: string;
  selected_type: ClassificationType;
  is_correct: boolean;
}

export interface QuizFilters {
  tags: string[];
  difficulty: Difficulty | null;
}

export interface QuizBreakdownEntry {
  total: number;
  correct: number;
  accuracy: number;
}

export type QuizBreakdown = Record<ClassificationType, QuizBreakdownEntry>;

export interface CompletedResult {
  completedAt: string;
  questions: QuizItem[];
  answers: AnswerRecord[];
  totalQuestions: number;
  correctCount: number;
  breakdown: QuizBreakdown;
}

export interface InProgressSession {
  version: 1;
  questions: QuizItem[];
  answers: AnswerRecord[];
  currentIndex: number;
  currentSelection: ClassificationType | null;
  currentSubmitted: boolean;
  requestedCount: number;
  filters: QuizFilters;
}

export type AppPhase = 'loading' | 'start' | 'quiz' | 'results' | 'error';
