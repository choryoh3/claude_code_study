import { Hono } from 'hono';
import { authenticate, guestAuthProvider } from './middleware/auth';
import { rateLimit } from './middleware/rate-limit';
import { lessonRoutes } from './routes/lessons';
import { progressRoutes } from './routes/progress';
import { quizRoutes } from './routes/quiz';
import type { AppEnv, AuthProvider, LessonCatalog, ProgressStore } from './types';
import { errorBody } from './validate';

export interface AppDeps {
  catalog: LessonCatalog;
  store: ProgressStore;
  auth?: AuthProvider;
  now?: () => Date;
  /** テストで時計を差し替えるための注入点 */
  clock?: () => number;
  limits?: { read: number; write: number; windowMs: number };
}

export function createApp(deps: AppDeps) {
  const now = deps.now ?? (() => new Date());
  const limits = deps.limits ?? { read: 120, write: 30, windowMs: 60_000 };
  const { catalog, store } = deps;

  const writeLimiter = rateLimit({
    limit: limits.write,
    windowMs: limits.windowMs,
    now: deps.clock,
    key: (c) => `w:${c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`,
  });

  const app = new Hono<AppEnv>()
    .basePath('/api')
    .use('*', authenticate(deps.auth ?? guestAuthProvider))
    // 読み取りを含む全リクエストに上限、書き込み系にはさらに厳しい上限をかける
    .use('*', rateLimit({ limit: limits.read, windowMs: limits.windowMs, now: deps.clock }))
    .use('*', async (c, next) => {
      if (c.req.method === 'GET') return next();
      return writeLimiter(c, next);
    })
    .route('/', lessonRoutes(catalog))
    .route('/', progressRoutes({ store, catalog, now }))
    .route('/', quizRoutes({ store, catalog, now }));

  app.notFound((c) => c.json(errorBody('not_found', '見つかりません。'), 404));
  app.onError((err, c) => {
    // 内部情報は返さない。詳細はサーバーログのみ
    console.error(err);
    return c.json(errorBody('internal_error', 'サーバーエラーが発生しました。'), 500);
  });
  return app;
}

/** フロントエンドが型付きRPCクライアント(hc)で使う型 */
export type AppType = ReturnType<typeof createApp>;
