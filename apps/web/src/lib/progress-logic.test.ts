import type { LessonSummary } from '@claude-study/schemas';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  isSameProgress,
  mergeProgress,
  type GuestProgress,
  countCompleted,
  hasPerfectQuiz,
  missingBadges,
  parseStoredProgress,
  pickNextLesson,
  statusOf,
  toLocalDate,
  withBadges,
  withQuizResult,
  withStatus,
} from './progress-logic';

const lesson = (slug: string, order: number): LessonSummary => ({
  slug,
  title: slug,
  level: 'basic',
  order,
  summary: 's',
  verifiedAt: '2026-10-19',
});
const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)];
const NOW = new Date(2026, 9, 19, 10, 0, 0); // ローカル 2026-10-19

describe('withStatus', () => {
  it('状態を更新し、今日を学習日に追加する（元のオブジェクトは変えない）', () => {
    const next = withStatus(EMPTY_PROGRESS, 'a', 'in_progress', NOW);
    expect(statusOf(next, 'a')).toBe('in_progress');
    expect(next.studyDays).toEqual(['2026-10-19']);
    expect(EMPTY_PROGRESS.entries).toEqual({});
  });

  it('同じ日に何度更新しても学習日は重複しない', () => {
    let p = withStatus(EMPTY_PROGRESS, 'a', 'in_progress', NOW);
    p = withStatus(p, 'b', 'completed', NOW);
    expect(p.studyDays).toEqual(['2026-10-19']);
  });

  it('完了日時は最初の完了時刻を保つ', () => {
    const first = withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW);
    const later = withStatus(first, 'a', 'completed', new Date(2026, 9, 25));
    expect(later.entries.a?.completedAt).toBe(first.entries.a?.completedAt);
  });

  it('未完了に戻すと completedAt は null になる', () => {
    const done = withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW);
    expect(withStatus(done, 'a', 'in_progress', NOW).entries.a?.completedAt).toBeNull();
  });
});

describe('pickNextLesson', () => {
  it('何も始めていなければ最初のレッスン', () => {
    expect(pickNextLesson(EMPTY_PROGRESS, lessons)?.slug).toBe('a');
  });

  it('途中のレッスンを、未着手より優先する', () => {
    const p = withStatus(
      withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW),
      'c',
      'in_progress',
      NOW,
    );
    expect(pickNextLesson(p, lessons)?.slug).toBe('c');
  });

  it('完了済みを飛ばして次の未完了を返す', () => {
    const p = withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW);
    expect(pickNextLesson(p, lessons)?.slug).toBe('b');
  });

  it('すべて完了していれば undefined', () => {
    let p = EMPTY_PROGRESS;
    for (const l of lessons) p = withStatus(p, l.slug, 'completed', NOW);
    expect(pickNextLesson(p, lessons)).toBeUndefined();
    expect(countCompleted(p, lessons)).toBe(3);
  });
});

describe('parseStoredProgress', () => {
  it('null・壊れたJSON・不正な型は空の状態に戻す', () => {
    expect(parseStoredProgress(null)).toBe(EMPTY_PROGRESS);
    expect(parseStoredProgress('{broken')).toBe(EMPTY_PROGRESS);
    expect(parseStoredProgress('123')).toBe(EMPTY_PROGRESS);
  });

  it('不正なstatusや日付の項目だけを取り除く', () => {
    const raw = JSON.stringify({
      entries: {
        a: { status: 'completed', completedAt: '2026-10-19T00:00:00.000Z' },
        b: { status: 'hacked', completedAt: null },
      },
      studyDays: ['2026-10-19', 'yesterday', 5],
    });
    const p = parseStoredProgress(raw);
    expect(Object.keys(p.entries)).toEqual(['a']);
    expect(p.studyDays).toEqual(['2026-10-19']);
  });
});

describe('toLocalDate', () => {
  it('ローカル日付をゼロ埋めで返す', () => {
    expect(toLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('withQuizResult / hasPerfectQuiz', () => {
  it('最高得点（正答率）だけを残す', () => {
    let p = withQuizResult(EMPTY_PROGRESS, 'a', 2, 4, NOW);
    p = withQuizResult(p, 'a', 1, 4, NOW);
    expect(p.quiz.a).toEqual({ score: 2, total: 4 });
    p = withQuizResult(p, 'a', 3, 4, NOW);
    expect(p.quiz.a).toEqual({ score: 3, total: 4 });
  });

  it('クイズを解いた日も学習日になる', () => {
    expect(withQuizResult(EMPTY_PROGRESS, 'a', 1, 4, NOW).studyDays).toEqual(['2026-10-19']);
  });

  it('満点が1つでもあれば hasPerfectQuiz', () => {
    expect(hasPerfectQuiz(EMPTY_PROGRESS)).toBe(false);
    expect(hasPerfectQuiz(withQuizResult(EMPTY_PROGRESS, 'a', 3, 4, NOW))).toBe(false);
    expect(hasPerfectQuiz(withQuizResult(EMPTY_PROGRESS, 'b', 4, 4, NOW))).toBe(true);
  });
});

describe('missingBadges / withBadges', () => {
  const summaries = [
    { slug: 'a', level: 'basic' as const },
    { slug: 'b', level: 'basic' as const },
  ];

  it('条件を満たしたバッジだけが、未記録として返る', () => {
    expect(missingBadges(EMPTY_PROGRESS, summaries, '2026-10-19')).toEqual([]);
    const p = withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW);
    expect(missingBadges(p, summaries, '2026-10-19')).toEqual(['first-lesson']);
  });

  it('基礎をすべて完了すると basic-complete も対象になる', () => {
    let p = withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW);
    p = withStatus(p, 'b', 'completed', NOW);
    expect(missingBadges(p, summaries, '2026-10-19')).toEqual(['first-lesson', 'basic-complete']);
  });

  it('記録済みのバッジは、再度は対象にならない（二重に祝わない）', () => {
    let p = withStatus(EMPTY_PROGRESS, 'a', 'completed', NOW);
    p = withBadges(p, ['first-lesson'], NOW);
    expect(missingBadges(p, summaries, '2026-10-19')).toEqual([]);
  });

  it('withBadges は獲得日時を最初の値で保つ', () => {
    const first = withBadges(EMPTY_PROGRESS, ['first-lesson'], NOW);
    const later = withBadges(first, ['first-lesson'], new Date(2026, 9, 30));
    expect(later.badges['first-lesson']).toBe(first.badges['first-lesson']);
    expect(withBadges(EMPTY_PROGRESS, [], NOW)).toBe(EMPTY_PROGRESS);
  });
});

describe('parseStoredProgress（クイズ・バッジ）', () => {
  it('旧形式（quiz/badges なし）も読める', () => {
    const p = parseStoredProgress(JSON.stringify({ entries: {}, studyDays: ['2026-10-19'] }));
    expect(p.quiz).toEqual({});
    expect(p.badges).toEqual({});
  });

  it('不正なクイズ結果・未知のバッジキーを取り除く', () => {
    const raw = JSON.stringify({
      entries: {},
      studyDays: [],
      quiz: {
        ok: { score: 2, total: 4 },
        overScore: { score: 5, total: 4 },
        zero: { score: 0, total: 0 },
        bad: { score: 'x', total: 4 },
      },
      badges: {
        'first-lesson': '2026-10-19T00:00:00.000Z',
        'god-mode': '2026-10-19T00:00:00.000Z',
      },
    });
    const p = parseStoredProgress(raw);
    expect(Object.keys(p.quiz)).toEqual(['ok']);
    expect(Object.keys(p.badges)).toEqual(['first-lesson']);
  });
});

describe('mergeProgress', () => {
  const done = { status: 'completed', completedAt: '2026-10-02T00:00:00.000Z' } as const;
  const doneLater = { status: 'completed', completedAt: '2026-10-05T00:00:00.000Z' } as const;
  const doing = { status: 'in_progress', completedAt: null } as const;
  const a: GuestProgress = {
    entries: { x: doing, y: doneLater },
    studyDays: ['2026-10-01'],
    quiz: { x: { score: 1, total: 4 } },
    badges: { 'first-lesson': '2026-10-03T00:00:00.000Z' },
  };
  const b: GuestProgress = {
    entries: { x: done, z: doing },
    studyDays: ['2026-10-02', '2026-10-01'],
    quiz: { x: { score: 3, total: 4 } },
    badges: { 'first-lesson': '2026-10-01T00:00:00.000Z' },
  };

  it('より進んだ状態を採り、完了日時は早いほうを残す', () => {
    const m = mergeProgress(a, b);
    expect(m.entries.x).toEqual(done);
    expect(m.entries.y).toEqual(doneLater);
    expect(m.entries.z).toEqual(doing);
  });

  it('クイズは正答率の高いほう、学習日は和集合、バッジは早い獲得日時', () => {
    const m = mergeProgress(a, b);
    expect(m.quiz.x).toEqual({ score: 3, total: 4 });
    expect(m.studyDays).toEqual(['2026-10-01', '2026-10-02']);
    expect(m.badges['first-lesson']).toBe('2026-10-01T00:00:00.000Z');
  });

  it('順序に依存せず、空の状態との統合では元の内容が変わらない', () => {
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(isSameProgress(ab, ba)).toBe(true);
    expect(isSameProgress(mergeProgress(a, EMPTY_PROGRESS), a)).toBe(true);
  });
});
