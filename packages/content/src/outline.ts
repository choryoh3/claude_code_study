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

export const LEVEL_LABELS: Record<Level, { name: string; tagline: string }> = {
  basic: { name: '基礎', tagline: '基本操作と、安全に任せる考え方' },
  intermediate: { name: '中級', tagline: '設定と拡張で、自分仕様に育てる' },
  advanced: { name: '上級', tagline: '並列化と自己検証で、チームの戦力にする' },
};

/** 準備中のトピックを探す（公開済みのレッスンは含まない） */
export function findPlannedTopic(level: string, slug: string): PlannedTopic | undefined {
  if (level !== 'intermediate' && level !== 'advanced') return undefined;
  return PLANNED_TOPICS[level].find((t) => t.slug === slug);
}
