import { describe, expect, it } from 'vitest';
import {
  BADGE_DEFINITIONS,
  badgeKeySchema,
  computeEarnedBadges,
  type ProgressEntry,
} from './index';

const lessons = [
  { slug: 'a', level: 'basic' as const },
  { slug: 'b', level: 'basic' as const },
  { slug: 'c', level: 'intermediate' as const },
];
const done = (lessonSlug: string): ProgressEntry => ({
  lessonSlug,
  status: 'completed',
  completedAt: '2026-10-19T00:00:00.000Z',
});
const base = { lessons, hasPerfectQuiz: false, studyDays: [] as string[], today: '2026-10-19' };

describe('BADGE_DEFINITIONS', () => {
  it('すべてのバッジキーに定義があり、重複がない', () => {
    const keys = BADGE_DEFINITIONS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...badgeKeySchema.options].sort());
  });

  it('タイトルと説明が空でない', () => {
    for (const b of BADGE_DEFINITIONS) {
      expect(b.title.length, b.key).toBeGreaterThan(0);
      expect(b.description.length, b.key).toBeGreaterThan(0);
    }
  });
});

describe('computeEarnedBadges', () => {
  it('何も無ければバッジなし', () => {
    expect(computeEarnedBadges({ ...base, progress: [] })).toEqual([]);
  });

  it('完了していないレッスン（学習中）は数えない', () => {
    const progress: ProgressEntry[] = [
      { lessonSlug: 'a', status: 'in_progress', completedAt: null },
    ];
    expect(computeEarnedBadges({ ...base, progress })).toEqual([]);
  });

  it('レベルの全レッスンを完了したときだけ、そのレベルのバッジが付く', () => {
    expect(computeEarnedBadges({ ...base, progress: [done('a')] })).not.toContain('basic-complete');
    const keys = computeEarnedBadges({ ...base, progress: [done('a'), done('b')] });
    expect(keys).toContain('basic-complete');
    expect(keys).not.toContain('intermediate-complete');
  });

  it('レッスンが1本もないレベルは、達成扱いにしない', () => {
    const keys = computeEarnedBadges({ ...base, progress: [done('a'), done('b'), done('c')] });
    expect(keys).toContain('intermediate-complete');
    expect(keys).not.toContain('advanced-complete');
  });

  it('連続学習: 3日で streak-3、7日で streak-7 も付く', () => {
    const days3 = ['2026-10-17', '2026-10-18', '2026-10-19'];
    const k3 = computeEarnedBadges({ ...base, progress: [], studyDays: days3 });
    expect(k3).toContain('streak-3');
    expect(k3).not.toContain('streak-7');
    const days7 = ['13', '14', '15', '16', '17', '18', '19'].map((d) => `2026-10-${d}`);
    expect(computeEarnedBadges({ ...base, progress: [], studyDays: days7 })).toEqual(
      expect.arrayContaining(['streak-3', 'streak-7']),
    );
  });

  it('満点のクイズがあれば quiz-perfect', () => {
    expect(computeEarnedBadges({ ...base, progress: [], hasPerfectQuiz: true })).toEqual([
      'quiz-perfect',
    ]);
  });
});
