import { createPrismaClient, type PrismaClient } from '@claude-study/db';
import { applyMigrations } from '@claude-study/db/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createPrismaStore } from './prisma-store';
import { fakeCatalog, headerAuthProvider } from './test-helpers';

// 実際のSQLite(Prismaストア)に対して、ルートを端から端まで検証する
const dir = mkdtempSync(join(tmpdir(), 'claude-study-api-'));
let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
const NOW = new Date('2026-10-18T09:00:00.000Z');

beforeAll(async () => {
  prisma = createPrismaClient(`file:${join(dir, 'test.db').replace(/\\/g, '/')}`);
  await applyMigrations(prisma);
  app = createApp({
    catalog: fakeCatalog,
    store: createPrismaStore(prisma),
    auth: headerAuthProvider,
    now: () => NOW,
    limits: { read: 1000, write: 1000, windowMs: 60_000 },
  });
}, 60_000);

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

const asUser = (id: string, body?: unknown, method = 'GET') => ({
  method,
  headers: { 'x-test-user': id, 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

describe('レッスン', () => {
  it('一覧と詳細を返し、存在しないslugは404', async () => {
    const list = await app.request('/api/lessons');
    expect(list.status).toBe(200);
    expect(await list.json()).toHaveLength(3);
    expect((await app.request('/api/lessons/install')).status).toBe(200);
    expect((await app.request('/api/lessons/nope')).status).toBe(404);
  });

  it('不正なslugは400（統一エラー形式）', async () => {
    const res = await app.request('/api/lessons/Bad_Slug');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'invalid_request', message: '入力が不正です。' },
    });
  });

  it('検索は q が必須', async () => {
    expect((await app.request('/api/search')).status).toBe(400);
    const res = await app.request('/api/search?q=plan');
    expect(await res.json()).toEqual([expect.objectContaining({ slug: 'plan-mode' })]);
  });
});

describe('クイズ', () => {
  it('問題の取得では正解と解説を含めない', async () => {
    const body = JSON.stringify(await (await app.request('/api/quiz/install')).json());
    expect(body).not.toContain('answerIndex');
    expect(body).not.toContain('explanation');
  });

  it('ゲストでも採点でき、未回答は不正解になる', async () => {
    const res = await app.request('/api/quiz/install/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [{ questionId: 'q1', choiceIndex: 1 }] }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ score: 1, total: 2, newBadges: [] });
  });

  it('存在しない問題IDは400', async () => {
    const res = await app.request('/api/quiz/install/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [{ questionId: 'zzz', choiceIndex: 0 }] }),
    });
    expect(res.status).toBe(400);
  });

  it('ログイン済みで満点を取るとバッジが付与される', async () => {
    const res = await app.request(
      '/api/quiz/install/grade',
      asUser(
        'quiz-user',
        {
          answers: [
            { questionId: 'q1', choiceIndex: 1 },
            { questionId: 'q2', choiceIndex: 0 },
          ],
        },
        'POST',
      ),
    );
    expect(await res.json()).toMatchObject({ score: 2, newBadges: ['quiz-perfect'] });
  });
});

describe('進捗とバッジ', () => {
  it('ゲストは進捗・バッジAPIで401', async () => {
    expect((await app.request('/api/progress')).status).toBe(401);
    expect((await app.request('/api/badges')).status).toBe(401);
    expect((await app.request('/api/progress/install', { method: 'PUT' })).status).toBe(401);
  });

  it('完了にすると保存され、初回バッジが付く。再実行しても重複して付与されない', async () => {
    const put = () =>
      app.request('/api/progress/install', asUser('p-user', { status: 'completed' }, 'PUT'));
    expect(await (await put()).json()).toEqual({
      status: 'completed',
      newBadges: ['first-lesson'],
    });
    expect(await (await put()).json()).toEqual({ status: 'completed', newBadges: [] });

    const progress = await (await app.request('/api/progress', asUser('p-user'))).json();
    expect(progress).toEqual([
      { lessonSlug: 'install', status: 'completed', completedAt: NOW.toISOString() },
    ]);
    const badges = await (await app.request('/api/badges', asUser('p-user'))).json();
    expect(badges).toHaveLength(1);
  });

  it('存在しないレッスンは404、不正なstatusは400', async () => {
    expect(
      (await app.request('/api/progress/nope', asUser('p2', { status: 'completed' }, 'PUT')))
        .status,
    ).toBe(404);
    expect(
      (await app.request('/api/progress/install', asUser('p2', { status: 'done' }, 'PUT'))).status,
    ).toBe(400);
  });

  it('ゲスト進捗のマージは進捗を後退させず、不明なレッスンは無視する', async () => {
    await app.request('/api/progress/install', asUser('m-user', { status: 'completed' }, 'PUT'));
    const res = await app.request(
      '/api/progress/merge',
      asUser(
        'm-user',
        {
          entries: [
            { lessonSlug: 'install', status: 'in_progress', completedAt: null },
            {
              lessonSlug: 'plan-mode',
              status: 'completed',
              completedAt: '2026-10-10T00:00:00.000Z',
            },
            { lessonSlug: 'unknown-lesson', status: 'completed', completedAt: null },
          ],
          studyDays: ['2026-10-16', '2026-10-17'],
        },
        'POST',
      ),
    );
    const body = (await res.json()) as { merged: number; newBadges: string[] };
    expect(body.merged).toBe(1);
    // 基礎2本が完了、かつ 10/16〜10/18 の3日連続
    expect(body.newBadges).toEqual(expect.arrayContaining(['basic-complete', 'streak-3']));

    const progress = (await (
      await app.request('/api/progress', asUser('m-user'))
    ).json()) as Array<{ lessonSlug: string; status: string }>;
    expect(progress.find((p) => p.lessonSlug === 'install')?.status).toBe('completed');
  });
});

describe('レート制限とエラー', () => {
  it('書き込み系は上限を超えると429', async () => {
    const limited = createApp({
      catalog: fakeCatalog,
      store: createPrismaStore(prisma),
      limits: { read: 100, write: 2, windowMs: 60_000 },
    });
    const post = () =>
      limited.request('/api/quiz/install/grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
        body: JSON.stringify({ answers: [{ questionId: 'q1', choiceIndex: 1 }] }),
      });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
  });

  it('未定義のパスは統一形式の404', async () => {
    const res = await app.request('/api/unknown');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: 'not_found' } });
  });
});
