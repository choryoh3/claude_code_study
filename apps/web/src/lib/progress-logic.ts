import type { LessonSummary, ProgressStatus } from '@claude-study/schemas';

/** ゲストの学習状態（localStorageに保存）。ログイン時に merge API へそのまま送れる形。 */
export interface GuestProgress {
  entries: Record<string, { status: ProgressStatus; completedAt: string | null }>;
  /** 学習した日 (YYYY-MM-DD, ローカル日付) */
  studyDays: string[];
}

export const EMPTY_PROGRESS: GuestProgress = { entries: {}, studyDays: [] };

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

/** 状態を更新した新しいオブジェクトを返す（元は変更しない）。完了は、後退させない。 */
export function withStatus(
  progress: GuestProgress,
  slug: string,
  status: ProgressStatus,
  now: Date,
): GuestProgress {
  const today = toLocalDate(now);
  const previous = progress.entries[slug];
  const completedAt = status === 'completed' ? (previous?.completedAt ?? now.toISOString()) : null;
  return {
    entries: { ...progress.entries, [slug]: { status, completedAt } },
    studyDays: progress.studyDays.includes(today)
      ? progress.studyDays
      : [...progress.studyDays, today].sort(),
  };
}

export function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** localStorage の文字列を安全に読む。壊れていたら空の状態に戻す。 */
export function parseStoredProgress(raw: string | null): GuestProgress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return EMPTY_PROGRESS;
    const { entries, studyDays } = data as Partial<GuestProgress>;
    const validStatus = new Set<string>(['not_started', 'in_progress', 'completed']);
    const cleanEntries: GuestProgress['entries'] = {};
    for (const [slug, v] of Object.entries(entries ?? {})) {
      if (v && validStatus.has(v.status)) {
        cleanEntries[slug] = {
          status: v.status,
          completedAt: typeof v.completedAt === 'string' ? v.completedAt : null,
        };
      }
    }
    const days = Array.isArray(studyDays)
      ? studyDays.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];
    return { entries: cleanEntries, studyDays: days };
  } catch {
    return EMPTY_PROGRESS;
  }
}
