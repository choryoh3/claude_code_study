import type { LessonSummary } from '@claude-study/schemas';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  countCompleted,
  parseStoredProgress,
  pickNextLesson,
  statusOf,
  toLocalDate,
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
