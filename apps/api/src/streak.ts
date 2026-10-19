import {
  currentStreak,
  type BadgeKey,
  type Level,
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

/** 現在の状態から、獲得済みであるべきバッジを求める（付与済みかどうかは見ない）。 */
export function earnedBadges(input: BadgeInput): BadgeKey[] {
  const completed = new Set(
    input.progress.filter((p) => p.status === 'completed').map((p) => p.lessonSlug),
  );
  const keys: BadgeKey[] = [];
  if (completed.size > 0) keys.push('first-lesson');

  const levels: Array<[Level, BadgeKey]> = [
    ['basic', 'basic-complete'],
    ['intermediate', 'intermediate-complete'],
    ['advanced', 'advanced-complete'],
  ];
  for (const [level, key] of levels) {
    const lessons = input.catalog.list().filter((l) => l.level === level);
    if (lessons.length > 0 && lessons.every((l) => completed.has(l.slug))) keys.push(key);
  }

  if (input.hasPerfectQuiz) keys.push('quiz-perfect');
  const streak = currentStreak(input.studyDays, input.today);
  if (streak >= 3) keys.push('streak-3');
  if (streak >= 7) keys.push('streak-7');
  return keys;
}
