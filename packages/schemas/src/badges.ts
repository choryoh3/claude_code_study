import { currentStreak } from './streak';
import type { BadgeKey, Level, ProgressEntry } from './index';

/** バッジの定義。DBのseedとUI表示の両方で使う（API・Webで同じ内容を共有する）。 */
export const BADGE_DEFINITIONS: ReadonlyArray<{
  key: BadgeKey;
  title: string;
  description: string;
}> = [
  { key: 'first-lesson', title: 'はじめの一歩', description: '最初のレッスンを完了した' },
  { key: 'basic-complete', title: '基礎マスター', description: '基礎のレッスンをすべて完了した' },
  {
    key: 'intermediate-complete',
    title: '中級マスター',
    description: '中級のレッスンをすべて完了した',
  },
  {
    key: 'advanced-complete',
    title: '上級マスター',
    description: '上級のレッスンをすべて完了した',
  },
  { key: 'quiz-perfect', title: '全問正解', description: 'クイズで満点を取った' },
  { key: 'streak-3', title: '3日連続', description: '3日連続で学習した' },
  { key: 'streak-7', title: '7日連続', description: '7日連続で学習した' },
];

interface BadgeInput {
  progress: readonly ProgressEntry[];
  /** 公開中のレッスン（レベル判定に使う） */
  lessons: ReadonlyArray<{ slug: string; level: Level }>;
  hasPerfectQuiz: boolean;
  studyDays: readonly string[];
  today: string;
}

/** 現在の状態から、獲得済みであるべきバッジを求める（付与済みかどうかは見ない）。 */
export function computeEarnedBadges(input: BadgeInput): BadgeKey[] {
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
    const lessons = input.lessons.filter((l) => l.level === level);
    // レッスンが1本もないレベルは、達成扱いにしない（準備中のレベルで誤って付与されないように）
    if (lessons.length > 0 && lessons.every((l) => completed.has(l.slug))) keys.push(key);
  }

  if (input.hasPerfectQuiz) keys.push('quiz-perfect');
  const streak = currentStreak(input.studyDays, input.today);
  if (streak >= 3) keys.push('streak-3');
  if (streak >= 7) keys.push('streak-7');
  return keys;
}
