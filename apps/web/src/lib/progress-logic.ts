import {
  badgeKeySchema,
  computeEarnedBadges,
  type BadgeKey,
  type Level,
  type LessonSummary,
  type ProgressEntry,
  type ProgressStatus,
} from '@claude-study/schemas';

/** ゲストの学習状態（localStorageに保存）。ログイン時に merge API へ送れる形を保つ。 */
export interface GuestProgress {
  entries: Record<string, { status: ProgressStatus; completedAt: string | null }>;
  /** 学習した日 (YYYY-MM-DD, ローカル日付) */
  studyDays: string[];
  /** レッスンごとのクイズの最高得点 */
  quiz: Record<string, { score: number; total: number }>;
  /** 獲得したバッジと、獲得日時(ISO 8601) */
  badges: Partial<Record<BadgeKey, string>>;
}

export const EMPTY_PROGRESS: GuestProgress = { entries: {}, studyDays: [], quiz: {}, badges: {} };

export function statusOf(progress: GuestProgress, slug: string): ProgressStatus {
  return progress.entries[slug]?.status ?? 'not_started';
}

export function countCompleted(progress: GuestProgress, lessons: readonly LessonSummary[]): number {
  return lessons.filter((l) => statusOf(progress, l.slug) === 'completed').length;
}

/**
 * 「次にやること」を常に1つだけ返す。
 * 途中のレッスンがあればそれを優先し、なければ最初の未完了レッスン。全部完了なら undefined。
 */
export function pickNextLesson(
  progress: GuestProgress,
  lessons: readonly LessonSummary[],
): LessonSummary | undefined {
  return (
    lessons.find((l) => statusOf(progress, l.slug) === 'in_progress') ??
    lessons.find((l) => statusOf(progress, l.slug) !== 'completed')
  );
}

export function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function withStudyDay(days: string[], now: Date): string[] {
  const today = toLocalDate(now);
  return days.includes(today) ? days : [...days, today].sort();
}

/** 状態を更新した新しいオブジェクトを返す（元は変更しない）。完了日時は最初の完了時刻を保つ。 */
export function withStatus(
  progress: GuestProgress,
  slug: string,
  status: ProgressStatus,
  now: Date,
): GuestProgress {
  const previous = progress.entries[slug];
  const completedAt = status === 'completed' ? (previous?.completedAt ?? now.toISOString()) : null;
  return {
    ...progress,
    entries: { ...progress.entries, [slug]: { status, completedAt } },
    studyDays: withStudyDay(progress.studyDays, now),
  };
}

/** クイズ結果を記録する。最高得点（正答率）だけを残し、今日を学習日に加える。 */
export function withQuizResult(
  progress: GuestProgress,
  slug: string,
  score: number,
  total: number,
  now: Date,
): GuestProgress {
  const best = progress.quiz[slug];
  const better = !best || score / total > best.score / best.total;
  return {
    ...progress,
    quiz: better ? { ...progress.quiz, [slug]: { score, total } } : progress.quiz,
    studyDays: withStudyDay(progress.studyDays, now),
  };
}

export function hasPerfectQuiz(progress: GuestProgress): boolean {
  return Object.values(progress.quiz).some((q) => q.total > 0 && q.score === q.total);
}

export function toProgressEntries(progress: GuestProgress): ProgressEntry[] {
  return Object.entries(progress.entries).map(([lessonSlug, e]) => ({
    lessonSlug,
    status: e.status,
    completedAt: e.completedAt,
  }));
}

/** 条件を満たしているのに、まだ記録されていないバッジ */
export function missingBadges(
  progress: GuestProgress,
  lessons: ReadonlyArray<{ slug: string; level: Level }>,
  today: string,
): BadgeKey[] {
  return computeEarnedBadges({
    progress: toProgressEntries(progress),
    lessons,
    hasPerfectQuiz: hasPerfectQuiz(progress),
    studyDays: progress.studyDays,
    today,
  }).filter((key) => !progress.badges[key]);
}

export function withBadges(
  progress: GuestProgress,
  keys: readonly BadgeKey[],
  now: Date,
): GuestProgress {
  if (keys.length === 0) return progress;
  const badges = { ...progress.badges };
  for (const key of keys) badges[key] ??= now.toISOString();
  return { ...progress, badges };
}

const STATUSES = new Set<string>(['not_started', 'in_progress', 'completed']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** localStorage の文字列を安全に読む。壊れていたら空の状態に戻し、不正な項目だけを取り除く。 */
export function parseStoredProgress(raw: string | null): GuestProgress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return EMPTY_PROGRESS;
    const input = data as Partial<Record<keyof GuestProgress, unknown>>;

    const entries: GuestProgress['entries'] = {};
    for (const [slug, v] of Object.entries((input.entries ?? {}) as Record<string, unknown>)) {
      const e = v as { status?: string; completedAt?: unknown } | null;
      if (e && typeof e.status === 'string' && STATUSES.has(e.status)) {
        entries[slug] = {
          status: e.status as ProgressStatus,
          completedAt: typeof e.completedAt === 'string' ? e.completedAt : null,
        };
      }
    }

    const quiz: GuestProgress['quiz'] = {};
    for (const [slug, v] of Object.entries((input.quiz ?? {}) as Record<string, unknown>)) {
      const q = v as { score?: unknown; total?: unknown } | null;
      if (
        q &&
        Number.isInteger(q.score) &&
        Number.isInteger(q.total) &&
        (q.total as number) > 0 &&
        (q.score as number) >= 0 &&
        (q.score as number) <= (q.total as number)
      ) {
        quiz[slug] = { score: q.score as number, total: q.total as number };
      }
    }

    const badges: GuestProgress['badges'] = {};
    for (const [key, at] of Object.entries((input.badges ?? {}) as Record<string, unknown>)) {
      const parsed = badgeKeySchema.safeParse(key);
      if (parsed.success && typeof at === 'string') badges[parsed.data] = at;
    }

    const studyDays = Array.isArray(input.studyDays)
      ? input.studyDays.filter((d): d is string => typeof d === 'string' && DATE.test(d))
      : [];
    return { entries, studyDays, quiz, badges };
  } catch {
    return EMPTY_PROGRESS;
  }
}
