import type { Level } from '@claude-study/schemas';

export interface PlannedTopic {
  slug: string;
  title: string;
}

/**
 * 今後追加する予定のトピック。ロードマップに「準備中」として表示し、「次へ」リンクが切れないようにする。
 * 現在は、中級・上級のトピックをすべて公開済みなので空。新しいトピックを予告するときは、ここに追加し、
 * レッスンを公開したらここから外す。
 */
export const PLANNED_TOPICS: Record<Exclude<Level, 'basic'>, PlannedTopic[]> = {
  intermediate: [],
  advanced: [],
};

/** 準備中のトピックを探す（公開済みのレッスンは含まない） */
export function findPlannedTopic(level: string, slug: string): PlannedTopic | undefined {
  if (level !== 'intermediate' && level !== 'advanced') return undefined;
  return PLANNED_TOPICS[level].find((t) => t.slug === slug);
}
