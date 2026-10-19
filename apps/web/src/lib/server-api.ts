import { createApp, type AppDeps } from '@claude-study/api/app';
import { createCatalog } from '@claude-study/content';
import { getLessons } from './lessons';

/**
 * 永続ストア（Supabase/Postgres）は未接続。ログイン機能がない間は、進捗・バッジAPIは401を返し、
 * クイズ採点もゲストは保存しないので、このストアは呼ばれない。
 * Supabase 接続後は、ここを createPrismaStore に差し替える（ADR 0006 を参照）。
 */
const unavailableStore: AppDeps['store'] = new Proxy({} as AppDeps['store'], {
  get: (_target, method) => async () => {
    throw new Error(`ProgressStore は未接続です（${String(method)}）`);
  },
});

let app: ReturnType<typeof createApp> | undefined;

/** Hono アプリを1度だけ作る（レッスンの読み込みと検証も、このとき1度だけ行う） */
export function getApi() {
  app ??= createApp({ catalog: createCatalog(getLessons()), store: unavailableStore });
  return app;
}
