import {
  mergeProgressRequestSchema,
  slugSchema,
  updateProgressRequestSchema,
  type ProgressStatus,
} from '@claude-study/schemas';
import { Hono } from 'hono';
import { z } from 'zod';
import { awardEarnedBadges } from '../badge-service';
import { requireUser } from '../middleware/auth';
import type { AppEnv, LessonCatalog, ProgressStore } from '../types';
import { errorBody, validate } from '../validate';

const slugParamSchema = z.object({ slug: slugSchema });
const RANK: Record<ProgressStatus, number> = { not_started: 0, in_progress: 1, completed: 2 };

interface Deps {
  store: ProgressStore;
  catalog: LessonCatalog;
  now: () => Date;
}

export function progressRoutes({ store, catalog, now }: Deps) {
  // requireUser を通るので、ハンドラ内では user が必ず存在する
  const userIdOf = (c: { get(key: 'user'): AppEnv['Variables']['user'] }) =>
    store.upsertUser(c.get('user')!);

  return new Hono<AppEnv>()
    .use('/progress/*', requireUser)
    .use('/progress', requireUser)
    .use('/badges', requireUser)
    .get('/progress', async (c) => c.json(await store.listProgress(await userIdOf(c))))
    .put(
      '/progress/:slug',
      validate('param', slugParamSchema),
      validate('json', updateProgressRequestSchema),
      async (c) => {
        const { slug } = c.req.valid('param');
        const { status } = c.req.valid('json');
        if (!catalog.get(slug))
          return c.json(errorBody('not_found', 'レッスンが見つかりません。'), 404);

        const userId = await userIdOf(c);
        const at = now();
        await store.setProgress(userId, slug, status, status === 'completed' ? at : null);
        await store.addStudyDay(userId, at.toISOString().slice(0, 10));
        const newBadges = await awardEarnedBadges({ store, catalog }, userId, at);
        return c.json({ status, newBadges }, 200);
      },
    )
    .post('/progress/merge', validate('json', mergeProgressRequestSchema), async (c) => {
      const { entries, studyDays } = c.req.valid('json');
      const userId = await userIdOf(c);
      const existing = new Map((await store.listProgress(userId)).map((p) => [p.lessonSlug, p]));

      let merged = 0;
      for (const entry of entries) {
        if (!catalog.get(entry.lessonSlug)) continue; // 存在しないレッスンは無視する
        const current = existing.get(entry.lessonSlug);
        // 既存より進んでいる場合だけ上書きし、サーバー側の進捗を後退させない
        if (current && RANK[current.status] >= RANK[entry.status]) continue;
        const completedAt =
          entry.status === 'completed' ? new Date(entry.completedAt ?? now()) : null;
        await store.setProgress(userId, entry.lessonSlug, entry.status, completedAt);
        merged += 1;
      }
      for (const day of studyDays) await store.addStudyDay(userId, day);

      const newBadges = await awardEarnedBadges({ store, catalog }, userId, now());
      return c.json({ merged, newBadges }, 200);
    })
    .get('/badges', async (c) => c.json(await store.listBadges(await userIdOf(c))));
}
