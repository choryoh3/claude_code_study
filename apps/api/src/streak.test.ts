import { describe, expect, it } from 'vitest';
import { currentStreak, earnedBadges } from './streak';
import { fakeCatalog } from './test-helpers';

describe('currentStreak', () => {
  it('今日を含む連続日数を数える', () => {
    expect(currentStreak(['2026-10-16', '2026-10-17', '2026-10-18'], '2026-10-18')).toBe(3);
  });

  it('今日まだ学習していなくても、昨日までの連続は維持される', () => {
    expect(currentStreak(['2026-10-16', '2026-10-17'], '2026-10-18')).toBe(2);
  });

  it('1日空くと連続は途切れる', () => {
    expect(currentStreak(['2026-10-14', '2026-10-17'], '2026-10-18')).toBe(1);
    expect(currentStreak(['2026-10-10'], '2026-10-18')).toBe(0);
  });

  it('月をまたいでも連続として数える', () => {
    expect(currentStreak(['2026-09-30', '2026-10-01'], '2026-10-01')).toBe(2);
  });
});

describe('earnedBadges', () => {
  const base = { catalog: fakeCatalog, hasPerfectQuiz: false, studyDays: [], today: '2026-10-18' };
  const done = (lessonSlug: string) => ({
    lessonSlug,
    status: 'completed' as const,
    completedAt: '2026-10-18T00:00:00.000Z',
  });

  it('何も完了していなければバッジなし', () => {
    expect(earnedBadges({ ...base, progress: [] })).toEqual([]);
  });

  it('1つ完了すると first-lesson、レベル全完了で level バッジ', () => {
    expect(earnedBadges({ ...base, progress: [done('install')] })).toEqual(['first-lesson']);
    const all = earnedBadges({ ...base, progress: [done('install'), done('plan-mode')] });
    expect(all).toContain('basic-complete');
    expect(all).not.toContain('intermediate-complete');
  });

  it('満点クイズと連続学習のバッジを付与する', () => {
    const days = [
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ];
    const keys = earnedBadges({ ...base, progress: [], hasPerfectQuiz: true, studyDays: days });
    expect(keys).toEqual(expect.arrayContaining(['quiz-perfect', 'streak-3', 'streak-7']));
  });
});
