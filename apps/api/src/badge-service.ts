import type { BadgeKey } from '@claude-study/schemas';
import { earnedBadges } from './streak';
import type { LessonCatalog, ProgressStore } from './types';

/** 条件を満たしたバッジを付与し、今回新しく付与したキーを返す。 */
export async function awardEarnedBadges(
  deps: { store: ProgressStore; catalog: LessonCatalog },
  userId: string,
  now: Date,
): Promise<BadgeKey[]> {
  const [progress, studyDays, hasPerfectQuiz, owned] = await Promise.all([
    deps.store.listProgress(userId),
    deps.store.listStudyDays(userId),
    deps.store.hasPerfectAttempt(userId),
    deps.store.listBadges(userId),
  ]);
  const ownedKeys = new Set(owned.map((b) => b.badgeKey));
  const earned = earnedBadges({
    progress,
    catalog: deps.catalog,
    hasPerfectQuiz,
    studyDays,
    today: now.toISOString().slice(0, 10),
  });
  const fresh = earned.filter((k) => !ownedKeys.has(k));
  for (const key of fresh) await deps.store.awardBadge(userId, key, now);
  return fresh;
}
