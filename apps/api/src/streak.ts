import {
  computeEarnedBadges,
  currentStreak,
  type BadgeKey,
  type ProgressEntry,
} from '@claude-study/schemas';
import type { LessonCatalog } from './types';

export { currentStreak };

interface BadgeInput {
  progress: readonly ProgressEntry[];
  catalog: LessonCatalog;
  hasPerfectQuiz: boolean;
  studyDays: readonly string[];
  today: string;
}

/** 現在の状態から、獲得済みであるべきバッジを求める（判定ロジックは packages/schemas と共有）。 */
export function earnedBadges(input: BadgeInput): BadgeKey[] {
  return computeEarnedBadges({
    progress: input.progress,
    lessons: input.catalog.list(),
    hasPerfectQuiz: input.hasPerfectQuiz,
    studyDays: input.studyDays,
    today: input.today,
  });
}
